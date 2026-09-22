-- ==============================================================================\n-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C.\n-- PASO 1 (DG-001-C): EXPORT COMPLETO DE FUNCIONES RPC Y PROCEDIMIENTOS ALMACENADOS\n-- ==============================================================================\n\n\n-- ------------------------------------------------------------------------------\n-- FUENTE: 01_schema_supabase_v1.sql\n-- ------------------------------------------------------------------------------\n\nCREATE OR REPLACE FUNCTION public.f_bloquear_update() 
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% es de registro inmutable: UPDATE no está permitido por normativa médica.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- Bloqueo genérico de DELETE en tablas append-only
CREATE OR REPLACE FUNCTION public.f_bloquear_delete() 
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% es de registro inmutable: DELETE no está permitido por normativa médica.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- Triggers de inmutabilidad en auditoría, adendas y pagos
DROP TRIGGER IF EXISTS trg_auditoria_no_upd ON public.auditoria;
CREATE TRIGGER trg_auditoria_no_upd BEFORE UPDATE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION public.f_bloquear_update();

DROP TRIGGER IF EXISTS trg_auditoria_no_del ON public.auditoria;
CREATE TRIGGER trg_auditoria_no_del BEFORE DELETE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION public.f_bloquear_delete();

DROP TRIGGER IF EXISTS trg_adenda_no_upd ON public.adenda;
CREATE TRIGGER trg_adenda_no_upd BEFORE UPDATE ON public.adenda FOR EACH ROW EXECUTE FUNCTION public.f_bloquear_update();

DROP TRIGGER IF EXISTS trg_adenda_no_del ON public.adenda;
CREATE TRIGGER trg_adenda_no_del BEFORE DELETE ON public.adenda FOR EACH ROW EXECUTE FUNCTION public.f_bloquear_delete();

DROP TRIGGER IF EXISTS trg_pago_no_upd ON public.pago;
CREATE TRIGGER trg_pago_no_upd BEFORE UPDATE ON public.pago FOR EACH ROW EXECUTE FUNCTION public.f_bloquear_update();

DROP TRIGGER IF EXISTS trg_pago_no_del ON public.pago;
CREATE TRIGGER trg_pago_no_del BEFORE DELETE ON public.pago FOR EACH ROW EXECUTE FUNCTION public.f_bloquear_delete();

-- Función para sellar Nota Clínica (Una vez cerrada, no se puede alterar el contenido clínico)
CREATE OR REPLACE FUNCTION public.f_sellar_nota_clinica() 
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.cerrada = true THEN
        RAISE EXCEPTION 'La Nota Clínica ya fue cerrada y firmada. No se permiten modificaciones directas. Utilice una Adenda.';
    END IF;
    IF NEW.cerrada = true AND OLD.cerrada = false THEN
        NEW.fecha_cierre := now();
        NEW.hash_firma := encode(digest(NEW.id::text || NEW.paciente_id::text || NEW.diagnostico_cie10 || now()::text, 'sha256'), 'hex');
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sellar_nota ON public.nota_clinica;
CREATE TRIGGER trg_sellar_nota BEFORE UPDATE ON public.nota_clinica FOR EACH ROW EXECUTE FUNCTION public.f_sellar_nota_clinica();

-- Actualización automática del estado de la orden de pago al insertar pago
CREATE OR REPLACE FUNCTION public.f_actualizar_orden_por_pago()
RETURNS TRIGGER AS $$
DECLARE
    total_pagado NUMERIC(10,2);
    monto_orden NUMERIC(10,2);
BEGIN
    SELECT COALESCE(SUM(monto), 0) INTO total_pagado FROM public.pago WHERE orden_id = NEW.orden_id;
    SELECT monto INTO monto_orden FROM public.orden_pago WHERE id = NEW.orden_id;
    
    IF total_pagado >= monto_orden THEN
        UPDATE public.orden_pago SET estado = 'PAGADO', updated_at = now() WHERE id = NEW.orden_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pago_actualiza_orden ON public.pago;
CREATE TRIGGER trg_pago_actualiza_orden AFTER INSERT ON public.pago FOR EACH ROW EXECUTE FUNCTION public.f_actualizar_orden_por_pago();

-- ----------------------------------------------------------------------------
-- 4. SEGURIDAD DECLARATIVA: ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

-- Habilitar RLS en todas las tablas
ALTER TABLE public.organizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sede ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encuentro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nota_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Función helper para obtener el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.obtener_mi_rol()
RETURNS rol_usuario AS $$
    SELECT rol FROM public.perfil_usuario WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;\n\n\n-- ------------------------------------------------------------------------------\n-- FUENTE: 02_multisede_y_cuentas_v1.sql\n-- ------------------------------------------------------------------------------\n\nCREATE OR REPLACE FUNCTION public.obtener_mi_site_id()
RETURNS UUID AS $$
    SELECT site_id FROM public.perfil_usuario WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;\n\nCREATE OR REPLACE FUNCTION public.f_crear_perfil_nuevo_usuario()
RETURNS TRIGGER AS $$
DECLARE
    v_site_id UUID;
    v_rol public.rol_usuario;
    v_nombre TEXT;
    v_colegiatura TEXT;
    v_especialidad TEXT;
BEGIN
    -- Sede Independencia: b0000000-0000-0000-0000-000000000001
    -- Sede Vivanco:       b0000000-0000-0000-0000-000000000002
    IF NEW.email ILIKE '%viv%' THEN
        v_site_id := 'b0000000-0000-0000-0000-000000000002'::uuid;
    ELSE
        v_site_id := 'b0000000-0000-0000-0000-000000000001'::uuid;
    END IF;

    -- Detección de Rol según correo o metadata
    IF NEW.email ILIKE '%recepcion%' THEN
        v_rol := 'RECEPCION';
        v_nombre := 'Admisión ' || CASE WHEN NEW.email ILIKE '%viv%' THEN 'Vivanco' ELSE 'Independencia' END;
    ELSIF NEW.email ILIKE '%medico%' OR NEW.email ILIKE '%obstetra%' OR NEW.email ILIKE '%hce%' THEN
        v_rol := 'PROFESIONAL';
        IF NEW.email ILIKE '%viv%' THEN
            v_nombre := 'Lic. Sonia Rivas Alarcón';
            v_colegiatura := 'COP 12890';
            v_especialidad := 'Obstetricia Integral';
        ELSE
            v_nombre := 'Dr. Carlos Benavides Velarde';
            v_colegiatura := 'CMP 54321 / RNE 23456';
            v_especialidad := 'Ginecología y Obstetricia';
        END IF;
    ELSIF NEW.email ILIKE '%caja%' THEN
        v_rol := 'CAJA';
        v_nombre := 'Caja & Cobranzas ' || CASE WHEN NEW.email ILIKE '%viv%' THEN 'Vivanco' ELSE 'Independencia' END;
    ELSIF NEW.email ILIKE '%supervision%' OR NEW.email ILIKE '%auditor%' THEN
        v_rol := 'SUPERVISION';
        v_nombre := 'Auditoría Médica y Financiera Red';
        v_site_id := NULL; -- Acceso multisede
    ELSE
        v_rol := 'ADMIN';
        v_nombre := 'Dirección General';
        v_site_id := NULL; -- Acceso multisede
    END IF;

    -- Sobrescribir con metadata si fue provista en el registro
    IF NEW.raw_user_meta_data->>'rol' IS NOT NULL THEN
        v_rol := (NEW.raw_user_meta_data->>'rol')::public.rol_usuario;
    END IF;
    IF NEW.raw_user_meta_data->>'nombre_completo' IS NOT NULL THEN
        v_nombre := NEW.raw_user_meta_data->>'nombre_completo';
    END IF;

    INSERT INTO public.perfil_usuario (id, email, nombre_completo, rol, site_id, colegiatura, especialidad, activo)
    VALUES (NEW.id, NEW.email, v_nombre, v_rol, v_site_id, v_colegiatura, v_especialidad, true)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nombre_completo = EXCLUDED.nombre_completo,
        rol = EXCLUDED.rol,
        site_id = EXCLUDED.site_id,
        colegiatura = EXCLUDED.colegiatura,
        especialidad = EXCLUDED.especialidad,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;\n\n\n-- ------------------------------------------------------------------------------\n-- FUENTE: 03_zero_trust_enterprise_rls.sql\n-- ------------------------------------------------------------------------------\n\nCREATE OR REPLACE FUNCTION public.obtener_mi_rol_estricto()
RETURNS public.rol_usuario AS $$
DECLARE
    v_rol public.rol_usuario;
BEGIN
    SELECT rol INTO v_rol 
    FROM public.perfil_usuario 
    WHERE id = auth.uid() AND activo = true;
    
    RETURN v_rol;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;\n\n\n-- ------------------------------------------------------------------------------\n-- FUENTE: 06_padron_oficial_purga_y_realtime.sql\n-- ------------------------------------------------------------------------------\n\nCREATE OR REPLACE FUNCTION public.crear_usuario_clinico(
    p_email TEXT,
    p_password TEXT,
    p_nombre TEXT,
    p_rol public.rol_usuario,
    p_site_id UUID,
    p_colegiatura TEXT DEFAULT NULL,
    p_especialidad TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT;
BEGIN
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));
    
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            confirmation_token = COALESCE(confirmation_token, ''),
            recovery_token = COALESCE(recovery_token, ''),
            email_change = COALESCE(email_change, ''),
            email_change_token_new = COALESCE(email_change_token_new, ''),
            email_change_token_current = COALESCE(email_change_token_current, ''),
            phone_change = COALESCE(phone_change, ''),
            phone_change_token = COALESCE(phone_change_token, ''),
            reauthentication_token = COALESCE(reauthentication_token, ''),
            raw_user_meta_data = jsonb_build_object('nombre_completo', p_nombre, 'rol', p_rol),
            updated_at = now()
        WHERE id = v_user_id;
    ELSE
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_token,
            recovery_token,
            email_change,
            email_change_token_new,
            email_change_token_current,
            phone_change,
            phone_change_token,
            reauthentication_token,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            p_email,
            v_encrypted_pw,
            now(),
            '', '', '', '', '', '', '', '',
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('nombre_completo', p_nombre, 'rol', p_rol),
            now(),
            now()
        )
        RETURNING id INTO v_user_id;
    END IF;

    INSERT INTO public.perfil_usuario (
        id, email, nombre_completo, rol, site_id, colegiatura, especialidad, activo
    )
    VALUES (
        v_user_id, p_email, p_nombre, p_rol, p_site_id, p_colegiatura, p_especialidad, true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nombre_completo = EXCLUDED.nombre_completo,
        rol = EXCLUDED.rol,
        site_id = EXCLUDED.site_id,
        colegiatura = EXCLUDED.colegiatura,
        especialidad = EXCLUDED.especialidad,
        activo = true,
        updated_at = now();

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;\n\n\n-- ------------------------------------------------------------------------------\n-- FUENTE: 13_carrito_multiservicios_y_split_payment.sql\n-- ------------------------------------------------------------------------------\n\n\n-- ------------------------------------------------------------------------------\n-- FUENTE: 17_cierre_turno_concurrencia_y_atomicidad.sql\n-- ------------------------------------------------------------------------------\n\nCREATE OR REPLACE FUNCTION public.f_bloquear_modificacion_turno_cerrado()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el registro ya estaba en estado CERRADA, se prohíbe cualquier mutación posterior
    IF OLD.estado = 'CERRADA' THEN
        RAISE EXCEPTION 'Operación denegada por seguridad: El turno de caja % ya se encuentra en estado CERRADA y es inmutable.', OLD.id;
    END IF;

    -- Si se intenta cambiar a CERRADA, asegurar que fecha_cierre esté presente
    IF NEW.estado = 'CERRADA' AND NEW.fecha_cierre IS NULL THEN
        NEW.fecha_cierre := now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;\n\n