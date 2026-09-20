-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT 13: CARRITO MULTISERVICIOS, PAGOS MIXTOS (SPLIT PAYMENT) Y TRAZABILIDAD
-- ============================================================================

-- 1. Asegurar columna items en orden_pago para persistir el detalle del carrito
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'orden_pago' 
          AND column_name = 'items'
    ) THEN
        ALTER TABLE public.orden_pago ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Función RPC Transaccional Atómica para Carrito Multiservicios y Split Payment
CREATE OR REPLACE FUNCTION public.registrar_atencion_y_cobro_multiservicio(
    p_dni TEXT,
    p_nombres TEXT,
    p_apellidos TEXT,
    p_telefono TEXT,
    p_site_id UUID,
    p_items JSONB,
    p_monto_total NUMERIC,
    p_pagos JSONB,
    p_usuario_nombre TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_paciente_id UUID;
    v_encuentro_id UUID;
    v_orden_id UUID;
    v_cajero_id UUID := auth.uid();
    v_dni_clean TEXT;
    v_nom_clean TEXT;
    v_ape_clean TEXT;
    v_resumen_servicios TEXT := '';
    v_item JSONB;
    v_pago JSONB;
    v_prod_id UUID;
    v_cant INT;
    v_stock_ant INT;
    v_stock_post INT;
    v_medio_pago_val public.medio_pago;
BEGIN
    -- Validaciones de datos de paciente
    v_dni_clean := TRIM(COALESCE(p_dni, ''));
    v_nom_clean := TRIM(COALESCE(p_nombres, ''));
    v_ape_clean := TRIM(COALESCE(p_apellidos, ''));

    IF length(v_dni_clean) < 8 THEN
        RAISE EXCEPTION 'DNI inválido: debe contener al menos 8 dígitos.';
    END IF;

    IF length(v_nom_clean) = 0 OR length(v_ape_clean) = 0 THEN
        RAISE EXCEPTION 'Nombres y apellidos del paciente son obligatorios.';
    END IF;

    IF p_site_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.sede WHERE id = p_site_id) THEN
        RAISE EXCEPTION 'Sede clínica no válida o no encontrada.';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El carrito de atención no contiene ningún servicio ni producto.';
    END IF;

    IF p_pagos IS NULL OR jsonb_array_length(p_pagos) = 0 THEN
        RAISE EXCEPTION 'Debe registrar al menos un medio de pago para la transacción.';
    END IF;

    IF p_monto_total <= 0 THEN
        RAISE EXCEPTION 'El monto total a cobrar debe ser mayor a cero (S/ %).', p_monto_total;
    END IF;

    -- Construir resumen de servicios para la cola médica
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF length(v_resumen_servicios) > 0 THEN
            v_resumen_servicios := v_resumen_servicios || ' + ';
        END IF;
        v_resumen_servicios := v_resumen_servicios || (v_item->>'nombre');
    END LOOP;

    IF length(v_resumen_servicios) > 250 THEN
        v_resumen_servicios := substring(v_resumen_servicios FROM 1 FOR 245) || '...';
    END IF;

    -- 1. Inserción o actualización del paciente
    INSERT INTO public.paciente (
        dni,
        nombres,
        apellidos,
        telefono,
        updated_at
    )
    VALUES (
        v_dni_clean,
        v_nom_clean,
        v_ape_clean,
        TRIM(COALESCE(p_telefono, '000000000')),
        now()
    )
    ON CONFLICT (dni) DO UPDATE
    SET nombres = EXCLUDED.nombres,
        apellidos = EXCLUDED.apellidos,
        telefono = EXCLUDED.telefono,
        updated_at = now()
    RETURNING id INTO v_paciente_id;

    -- 2. Creación del encuentro clínico
    INSERT INTO public.encuentro (
        paciente_id,
        site_id,
        servicio_solicitado,
        estado,
        fecha_hora
    )
    VALUES (
        v_paciente_id,
        p_site_id,
        v_resumen_servicios,
        'EN_ESPERA',
        now()
    )
    RETURNING id INTO v_encuentro_id;

    -- 3. Creación de la orden de pago con el desglose del carrito
    INSERT INTO public.orden_pago (
        encuentro_id,
        paciente_id,
        site_id,
        servicio,
        monto,
        items,
        estado
    )
    VALUES (
        v_encuentro_id,
        v_paciente_id,
        p_site_id,
        v_resumen_servicios,
        p_monto_total,
        p_items,
        'PAGADO'
    )
    RETURNING id INTO v_orden_id;

    -- Resolver cajero si v_cajero_id es nulo
    IF v_cajero_id IS NULL THEN
        SELECT id INTO v_cajero_id FROM public.perfil_usuario WHERE email = 'admin@lasmellizasperu.com' LIMIT 1;
    END IF;

    -- 4. Registrar cada pago fraccionado (Split Payment)
    FOR v_pago IN SELECT * FROM jsonb_array_elements(p_pagos)
    LOOP
        -- Normalizar y castear medio_pago
        BEGIN
            v_medio_pago_val := (v_pago->>'medio')::public.medio_pago;
        EXCEPTION WHEN OTHERS THEN
            v_medio_pago_val := 'EFECTIVO'::public.medio_pago;
        END;

        INSERT INTO public.pago (
            orden_id,
            cajero_id,
            medio_pago,
            monto,
            referencia,
            fecha_hora
        )
        VALUES (
            v_orden_id,
            v_cajero_id,
            v_medio_pago_val,
            (v_pago->>'monto')::NUMERIC,
            COALESCE(v_pago->>'referencia', 'SPLIT-VENTANILLA'),
            now()
        );
    END LOOP;

    -- 5. Disminución atómica de stock para productos de farmacia incluidos en el carrito
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'tipo') = 'PRODUCTO' OR (v_item->>'productoId') IS NOT NULL THEN
            BEGIN
                v_prod_id := (v_item->>'productoId')::UUID;
                v_cant := COALESCE((v_item->>'cantidad')::INT, 1);

                IF v_prod_id IS NOT NULL THEN
                    SELECT stock_actual INTO v_stock_ant
                    FROM public.producto_inventario
                    WHERE id = v_prod_id FOR UPDATE;

                    IF v_stock_ant IS NOT NULL THEN
                        v_stock_post := GREATEST(0, v_stock_ant - v_cant);

                        UPDATE public.producto_inventario
                        SET stock_actual = v_stock_post,
                            updated_at = now()
                        WHERE id = v_prod_id;

                        INSERT INTO public.movimiento_inventario (
                            producto_id,
                            tipo,
                            cantidad,
                            stock_anterior,
                            stock_nuevo,
                            motivo,
                            usuario_id,
                            usuario_nombre,
                            site_id,
                            fecha_hora
                        )
                        VALUES (
                            v_prod_id,
                            'SALIDA_VENTA',
                            v_cant,
                            v_stock_ant,
                            v_stock_post,
                            'Dispensación en Admisión/Caja (Venta en Mostrador)',
                            v_cajero_id,
                            COALESCE(p_usuario_nombre, 'Cajero Ventanilla'),
                            p_site_id,
                            now()
                        );
                    END IF;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- No bloquear la admisión si el producto ya no existe en el catálogo
                NULL;
            END;
        END IF;
    END LOOP;

    -- 6. Auditoría inalterable
    INSERT INTO public.auditoria (
        usuario_id,
        site_id,
        accion,
        entidad,
        entidad_id,
        detalle
    )
    VALUES (
        v_cajero_id,
        p_site_id,
        'COBRO_MULTISERVICIOS_SPLIT',
        'encuentro',
        v_encuentro_id::text,
        jsonb_build_object(
            'dni', v_dni_clean,
            'paciente', v_nom_clean || ' ' || v_ape_clean,
            'monto_total', p_monto_total,
            'items_count', jsonb_array_length(p_items),
            'pagos_count', jsonb_array_length(p_pagos),
            'orden_id', v_orden_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'encuentro_id', v_encuentro_id,
        'orden_id', v_orden_id,
        'paciente_id', v_paciente_id,
        'total', p_monto_total
    );
END;
$$;

-- Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.registrar_atencion_y_cobro_multiservicio TO authenticated;
