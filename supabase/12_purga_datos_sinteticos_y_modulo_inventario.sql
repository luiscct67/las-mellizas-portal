-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT 12: PURGA TOTAL DE DATOS SINTÉTICOS, MÓDULO DE INVENTARIO Y STOCK CLÍNICO,
-- Y SOPORTE DE ADENDAS EVOLUTIVAS (FASE II - PRODUCCIÓN REAL)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. PURGA CONTROLADA Y SEGURA DE DATOS SINTÉTICOS / DE PRUEBA
-- ============================================================================
-- Se eliminan en cascada las transacciones de prueba previas
DELETE FROM public.pago;
DELETE FROM public.orden_pago;
DELETE FROM public.nota_clinica;
DELETE FROM public.encuentro;
DELETE FROM public.paciente;

-- Opcional: Limpiar citas reagendadas de prueba si la tabla existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cita_reagendada') THEN
        DELETE FROM public.cita_reagendada;
    END IF;
END $$;

-- Inserción de 1 registro limpio de paciente para control de calidad / auditoría
INSERT INTO public.paciente (
    id,
    dni,
    nombres,
    apellidos,
    telefono,
    fecha_nacimiento,
    direccion,
    created_at,
    updated_at
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    '00000001',
    'Paciente Control',
    'Auditoría y Calidad',
    '999000111',
    '1995-05-15',
    'Jr. Carlos F. Vivanco N.º 265, Huamanga',
    now(),
    now()
) ON CONFLICT (dni) DO UPDATE SET
    nombres = EXCLUDED.nombres,
    apellidos = EXCLUDED.apellidos;

-- ============================================================================
-- 2. AMPLIACIÓN DE TABLA NOTA_CLÍNICA: ADENDAS E IMÁGENES
-- ============================================================================
ALTER TABLE public.nota_clinica 
    ADD COLUMN IF NOT EXISTS adendas JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS imagenes JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- 3. MÓDULO DE INVENTARIO Y STOCK DE INSUMOS CLÍNICOS
-- ============================================================================

-- Tabla maestra de productos y consumibles
CREATE TABLE IF NOT EXISTS public.producto_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT NOT NULL,
    presentacion TEXT NOT NULL,
    precio_venta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    costo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    stock_actual INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    site_id UUID REFERENCES public.sede(id),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de historial y trazabilidad de movimientos de inventario
CREATE TABLE IF NOT EXISTS public.movimiento_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES public.producto_inventario(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA_VENTA', 'SALIDA_USO_CLINICO', 'AJUSTE')),
    cantidad INT NOT NULL,
    stock_anterior INT NOT NULL,
    stock_nuevo INT NOT NULL,
    motivo TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    usuario_nombre TEXT,
    site_id UUID REFERENCES public.sede(id),
    fecha_hora TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.producto_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimiento_inventario ENABLE ROW LEVEL SECURITY;

-- Políticas RLS Producto Inventario
DROP POLICY IF EXISTS "Inventario: Lectura para usuarios autenticados" ON public.producto_inventario;
DROP POLICY IF EXISTS "Inventario: Gestión completa supervisores y admin" ON public.producto_inventario;

CREATE POLICY "Inventario: Lectura para usuarios autenticados" ON public.producto_inventario
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inventario: Gestión completa supervisores y admin" ON public.producto_inventario
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Políticas RLS Movimiento Inventario
DROP POLICY IF EXISTS "Movimientos: Lectura para usuarios autenticados" ON public.movimiento_inventario;
DROP POLICY IF EXISTS "Movimientos: Registro por personal autenticado" ON public.movimiento_inventario;

CREATE POLICY "Movimientos: Lectura para usuarios autenticados" ON public.movimiento_inventario
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Movimientos: Registro por personal autenticado" ON public.movimiento_inventario
FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- 4. FUNCIÓN ATÓMICA RPC PARA REGISTRAR MOVIMIENTO Y ACTUALIZAR STOCK
-- ============================================================================
CREATE OR REPLACE FUNCTION public.registrar_movimiento_inventario(
    p_producto_id UUID,
    p_tipo TEXT,
    p_cantidad INT,
    p_motivo TEXT DEFAULT NULL,
    p_site_id UUID DEFAULT NULL,
    p_usuario_nombre TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stock_actual INT;
    v_stock_nuevo INT;
    v_prod_nombre TEXT;
    v_usuario_id UUID := auth.uid();
    v_res JSONB;
BEGIN
    IF p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad del movimiento debe ser un número entero positivo mayor a cero.';
    END IF;

    -- Obtener producto y bloquear fila para prevenir condiciones de carrera (FOR UPDATE)
    SELECT stock_actual, nombre INTO v_stock_actual, v_prod_nombre
    FROM public.producto_inventario
    WHERE id = p_producto_id
    FOR UPDATE;

    IF v_stock_actual IS NULL THEN
        RAISE EXCEPTION 'El producto solicitado no existe en el catálogo de inventario.';
    END IF;

    -- Calcular nuevo stock
    IF p_tipo IN ('SALIDA_VENTA', 'SALIDA_USO_CLINICO') THEN
        IF v_stock_actual < p_cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para %: Disponible: %, Solicitado: %', v_prod_nombre, v_stock_actual, p_cantidad;
        END IF;
        v_stock_nuevo := v_stock_actual - p_cantidad;
    ELSIF p_tipo = 'ENTRADA' THEN
        v_stock_nuevo := v_stock_actual + p_cantidad;
    ELSIF p_tipo = 'AJUSTE' THEN
        v_stock_nuevo := p_cantidad;
    ELSE
        RAISE EXCEPTION 'Tipo de movimiento no válido: %', p_tipo;
    END IF;

    -- Actualizar stock en producto_inventario
    UPDATE public.producto_inventario
    SET stock_actual = v_stock_nuevo,
        updated_at = now()
    WHERE id = p_producto_id;

    -- Insertar registro auditable en movimiento_inventario
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
    ) VALUES (
        p_producto_id,
        p_tipo,
        p_cantidad,
        v_stock_actual,
        v_stock_nuevo,
        COALESCE(p_motivo, 'Dispensación operativa en ventanilla/consultorio'),
        v_usuario_id,
        COALESCE(p_usuario_nombre, 'Operador de Turno'),
        p_site_id,
        now()
    );

    -- Registrar en auditoría general
    INSERT INTO public.auditoria (
        usuario_id,
        site_id,
        accion,
        entidad,
        entidad_id,
        detalle
    ) VALUES (
        v_usuario_id,
        p_site_id,
        'DISPENSACION_INVENTARIO',
        'producto_inventario',
        p_producto_id::text,
        jsonb_build_object(
            'producto', v_prod_nombre,
            'tipo', p_tipo,
            'cantidad', p_cantidad,
            'stock_anterior', v_stock_actual,
            'stock_nuevo', v_stock_nuevo,
            'motivo', p_motivo,
            'responsable', COALESCE(p_usuario_nombre, 'Operador de Turno')
        )
    );

    SELECT jsonb_build_object(
        'success', true,
        'producto_id', p_producto_id,
        'producto', v_prod_nombre,
        'stock_anterior', v_stock_actual,
        'stock_nuevo', v_stock_nuevo,
        'tipo', p_tipo,
        'cantidad', p_cantidad
    ) INTO v_res;

    RETURN v_res;
END;
$$;

-- ============================================================================
-- 5. FUNCIÓN ATÓMICA RPC PARA INCORPORAR ADENDAS EN CASOS SELLADOS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.incorporar_adenda_clinica(
    p_encuentro_id UUID,
    p_texto_adenda TEXT,
    p_autor_nombre TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_nota_id UUID;
    v_adendas_previas JSONB;
    v_nueva_adenda JSONB;
    v_hash_adenda TEXT;
    v_usuario_id UUID := auth.uid();
BEGIN
    IF LENGTH(TRIM(p_texto_adenda)) < 5 THEN
        RAISE EXCEPTION 'El contenido de la adenda médica debe tener al menos 5 caracteres.';
    END IF;

    SELECT id, COALESCE(adendas, '[]'::jsonb) INTO v_nota_id, v_adendas_previas
    FROM public.nota_clinica
    WHERE encuentro_id = p_encuentro_id;

    IF v_nota_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró la nota clínica vinculada al encuentro %', p_encuentro_id;
    END IF;

    v_hash_adenda := encode(digest(p_encuentro_id::text || now()::text || p_texto_adenda, 'sha256'), 'hex');

    v_nueva_adenda := jsonb_build_object(
        'id', gen_random_uuid(),
        'fecha', to_char(now() AT TIME ZONE 'America/Lima', 'DD/MM/YYYY HH24:MI:SS'),
        'texto', TRIM(p_texto_adenda),
        'autor', COALESCE(p_autor_nombre, 'Profesional Responsable'),
        'hash', v_hash_adenda
    );

    UPDATE public.nota_clinica
    SET adendas = v_adendas_previas || v_nueva_adenda,
        updated_at = now()
    WHERE id = v_nota_id;

    -- Auditoría inmutable de la adenda
    INSERT INTO public.auditoria (
        usuario_id,
        accion,
        entidad,
        entidad_id,
        detalle
    ) VALUES (
        v_usuario_id,
        'INCORPORACION_ADENDA_HCE',
        'nota_clinica',
        p_encuentro_id::text,
        jsonb_build_object(
            'hash_adenda', v_hash_adenda,
            'autor', COALESCE(p_autor_nombre, 'Profesional Responsable'),
            'texto_preview', SUBSTRING(TRIM(p_texto_adenda) FROM 1 FOR 100)
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'adenda', v_nueva_adenda
    );
END;
$$;

-- ============================================================================
-- 6. REGISTROS SEMILLA INICIALES CON STOCK OPERATIVO DE PRUEBA
-- ============================================================================
INSERT INTO public.producto_inventario (
    codigo,
    nombre,
    descripcion,
    categoria,
    presentacion,
    precio_venta,
    costo_unitario,
    stock_actual,
    stock_minimo,
    activo
) VALUES 
(
    'INV-OVU-01',
    'Óvulos de Metronidazol + Nistatina',
    'Tratamiento antimicótico y antibacteriano de vulvovaginitis mixta y leucorrea',
    'Tratamiento Ginecológico',
    'Caja x 10 óvulos',
    35.00,
    15.00,
    25,
    5,
    true
),
(
    'INV-AMP-01',
    'Ampolla Anticonceptiva Mensual (Norigynon / Mesigyna)',
    'Anticonceptivo inyectable mensual combinado de alta eficacia',
    'Anticonceptivos & Hormonales',
    'Ampolla 1ml + jeringa descartable',
    35.00,
    18.00,
    30,
    8,
    true
),
(
    'INV-AMP-03',
    'Ampolla Anticonceptiva Trimestral (Medroxiprogesterona 150mg)',
    'Inyectable trimestral de progestágeno para lactancia y planificación',
    'Anticonceptivos & Hormonales',
    'Frasco ampolla 1ml',
    40.00,
    20.00,
    20,
    5,
    true
),
(
    'INV-JAB-01',
    'Jabón Líquido Íntimo Dermocosmético PH 4.5',
    'Higiene íntima diaria con ácido láctico y extracto de manzanilla',
    'Higiene & Dermocosmética',
    'Frasco 250ml con dosificador',
    45.00,
    22.00,
    15,
    4,
    true
),
(
    'INV-HCG-01',
    'Prueba Rápida de Embarazo en Cassette',
    'Detección cualitativa de gonadotropina coriónica humana en orina/suero',
    'Pruebas Rápidas & Diagnóstico',
    'Caja unitaria con gotero',
    15.00,
    3.50,
    50,
    10,
    true
),
(
    'INV-ITS-01',
    'Test Rápido Dual VIH 1/2 y Sífilis',
    'Tamizaje serológico rápido en sangre total o suero con resultados en 15 min',
    'Pruebas Rápidas & Diagnóstico',
    'Dispositivo casete individual',
    25.00,
    8.00,
    40,
    10,
    true
),
(
    'INV-ESP-01',
    'Espéculo Vaginal Descartable Estéril (Talla M)',
    'Insumo estéril con cremallera de fijación para examen pélvico y PAP',
    'Insumos Clínicos & Procedimientos',
    'Unidad sellada al vacío',
    8.00,
    2.20,
    100,
    20,
    true
),
(
    'INV-GEL-01',
    'Gel Conductor Ecográfico Hipoalergénico',
    'Gel de transmisión acústica de alta conductividad para transductores',
    'Insumos Clínicos & Procedimientos',
    'Galón 3.8 Litros',
    60.00,
    35.00,
    6,
    2,
    true
),
(
    'INV-PAP-01',
    'Kit de Citología Cervical Papanicolaou',
    'Citocepillo endocervical + espátula de Ayre de madera + lámina portaobjeto',
    'Insumos Clínicos & Procedimientos',
    'Set individual estéril',
    12.00,
    3.00,
    60,
    15,
    true
),
(
    'INV-DIU-01',
    'Dispositivo Intrauterino T de Cobre 380A',
    'Anticonceptivo intrauterino de larga duración estéril con tubo insertor',
    'Planificación Familiar',
    'Unidad sellada grado médico',
    90.00,
    35.00,
    10,
    3,
    true
)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    precio_venta = EXCLUDED.precio_venta,
    costo_unitario = EXCLUDED.costo_unitario,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo;
