-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT 06: PADRÓN OFICIAL EXCLUSIVO (15 CUENTAS), PURGA TOTAL Y REALTIME
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. HABILITACIÓN DE SUPABASE REALTIME EN COLA CLÍNICA
-- Permite que el médico reciba en tiempo real los pacientes derivados de Admisión
DO $$
BEGIN
    -- Agregar tabla encuentro a la publicación de realtime si aún no está
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'encuentro'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.encuentro;
    END IF;

    -- Agregar orden_pago a realtime
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orden_pago'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orden_pago;
    END IF;
END $$;

-- 2. TABLA: CITAS REAGENDADAS Y RECORDATORIOS WHATSAPP
CREATE TABLE IF NOT EXISTS public.cita_reagendada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.paciente(id) ON DELETE SET NULL,
    paciente_nombre TEXT NOT NULL,
    telefono TEXT,
    site_id UUID REFERENCES public.sede(id),
    profesional_id UUID REFERENCES public.perfil_usuario(id),
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    motivo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'PROGRAMADA' CHECK (estado IN ('PROGRAMADA', 'ATENDIDA', 'CANCELADA')),
    whatsapp_enviado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cita_reagendada_fecha ON public.cita_reagendada(fecha, site_id);

ALTER TABLE public.cita_reagendada ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestion citas reagendadas personal" ON public.cita_reagendada;
CREATE POLICY "Gestion citas reagendadas personal" ON public.cita_reagendada
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 3. FUNCIÓN UNIVERSAL DE APROVISIONAMIENTO SEGURO
CREATE OR REPLACE FUNCTION public.crear_usuario_clinico(
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. APROVISIONAMIENTO DEL PADRÓN EXCLUSIVO DE LAS 15 CUENTAS OFICIALES + ADMIN
-- Contraseña unificada inicial segura: Mellizas#2026!
-- (Para el Administrador General: Admin#Mellizas2026!)
-- Sedes:
-- Independencia: b0000000-0000-0000-0000-000000000001
-- Vivanco:       b0000000-0000-0000-0000-000000000002
-- ============================================================================

-- 0. ADMINISTRACIÓN GENERAL
SELECT public.crear_usuario_clinico(
    'admin@lasmellizasperu.com',
    'Admin#Mellizas2026!',
    'Dirección Médica & Gestión',
    'ADMIN',
    NULL,
    'CMP 99881',
    'Dirección Médica'
);

-- 1. obstetra.inv1@lasmellizasperu.com
SELECT public.crear_usuario_clinico(
    'obstetra.inv1@lasmellizasperu.com',
    'Mellizas#2026!',
    'Obstetra Independencia 1',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'COP 10201',
    'Obstetricia Integral'
);

-- 2. medico.inv2@lasmellizasperu.com
SELECT public.crear_usuario_clinico(
    'medico.inv2@lasmellizasperu.com',
    'Mellizas#2026!',
    'Médico Independencia 2',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'CMP 45120 / RNE 19022',
    'Ginecología y Obstetricia'
);

-- 3. medici.inv1@lasmellizasperu.com
SELECT public.crear_usuario_clinico(
    'medici.inv1@lasmellizasperu.com',
    'Mellizas#2026!',
    'Médico Independencia 1',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'CMP 48902',
    'Medicina Fetal y Ecografía'
);

-- 4. medico.bar@lasmellizasperu.com
SELECT public.crear_usuario_clinico(
    'medico.bar@lasmellizasperu.com',
    'Mellizas#2026!',
    'Médico Bar Independencia',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'CMP 52310 / RNE 22104',
    'Ecografía Morfológica y Genética'
);

-- 5. medico.cap@lasmellizasperu.com
SELECT public.crear_usuario_clinico(
    'medico.cap@lasmellizasperu.com',
    'Mellizas#2026!',
    'Médico Cap Independencia',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'CMP 50981',
    'Ginecología y Obstetricia'
);

-- 6. medico.pmg@lasmellizasperu.com
SELECT public.crear_usuario_clinico(
    'medico.pmg@lasmellizasperu.com',
    'Mellizas#2026!',
    'Médico PMG Independencia',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'CMP 47820 / RNE 18451',
    'Obstetricia de Alto Riesgo'
);

-- 7. obstetra.yrp@lasmellizasperu.com
SELECT public.crear_usuario_clinico(
    'obstetra.yrp@lasmellizasperu.com',
    'Mellizas#2026!',
    'Obstetra YRP Vivanco',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000002'::uuid,
    'COP 11980',
    'Control Prenatal Reenfocado'
);

-- 8. obstetra.yen@lasmellizasperu.com
SELECT public.crear_usuario_clinico(
    'obstetra.yen@lasmellizasperu.com',
    'Mellizas#2026!',
    'Obstetra YEN Vivanco',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000002'::uuid,
    'COP 12431',
    'Ecografía Obstétrica'
);

-- 9. obstetra.lis@lasmellizasperu.com
SELECT public.crear_usuario_clinico(
    'obstetra.lis@lasmellizasperu.com',
    'Mellizas#2026!',
    'Obstetra LIS Vivanco',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000002'::uuid,
    'COP 13102',
    'Monitoreo Fetal y Psicoprofilaxis'
);

-- 10. obstetra.duo@lasmellizasperu.com
SELECT public.crear_usuario_clinico(
    'obstetra.duo@lasmellizasperu.com',
    'Mellizas#2026!',
    'Obstetra DUO Vivanco',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000002'::uuid,
    'COP 14210',
    'Salud Reproductiva'
);

-- 11. admision.viv2@lasmellizasperu.com (y alias admisi\u00f3n.viv2)
SELECT public.crear_usuario_clinico(
    'admision.viv2@lasmellizasperu.com',
    'Mellizas#2026!',
    'Admisión & Caja Vivanco 2',
    'RECEPCION_CAJA',
    'b0000000-0000-0000-0000-000000000002'::uuid,
    NULL,
    'Admisión y Cobranzas'
);

-- 12. admision.ind2@lasmellizasperu.com (y alias admisi\u00f3n.ind2)
SELECT public.crear_usuario_clinico(
    'admision.ind2@lasmellizasperu.com',
    'Mellizas#2026!',
    'Admisión & Caja Independencia 2',
    'RECEPCION_CAJA',
    'b0000000-0000-0000-0000-000000000001'::uuid,
    NULL,
    'Admisión y Cobranzas'
);

-- 13. admision.viv1@lasmellizasperu.com (y alias admisi\u00f3n.viv1)
SELECT public.crear_usuario_clinico(
    'admision.viv1@lasmellizasperu.com',
    'Mellizas#2026!',
    'Admisión & Caja Vivanco 1',
    'RECEPCION_CAJA',
    'b0000000-0000-0000-0000-000000000002'::uuid,
    NULL,
    'Admisión y Cobranzas'
);

-- 14. admision.vivanco2@lasmellizasperu.com
SELECT public.crear_usuario_clinico(
    'admision.vivanco2@lasmellizasperu.com',
    'Mellizas#2026!',
    'Admisión & Caja Vivanco 2 Canónica',
    'RECEPCION_CAJA',
    'b0000000-0000-0000-0000-000000000002'::uuid,
    NULL,
    'Admisión y Cobranzas'
);

-- 15. obstetra.inb2@lasmellizasperu.com
SELECT public.crear_usuario_clinico(
    'obstetra.inb2@lasmellizasperu.com',
    'Mellizas#2026!',
    'Obstetra INB Independencia',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'COP 15120',
    'Obstetricia Integral'
);
