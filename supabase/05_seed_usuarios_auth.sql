-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT 05: APROVISIONAMIENTO Y SINCRONIZACIÓN DE USUARIOS EN SUPABASE AUTH
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Función de aprovisionamiento seguro y universal (Compatible con Supabase Auth)
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
    
    -- 1. Verificar si el usuario ya existe en auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- Si existe, actualizamos su contraseña y metadata
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('nombre_completo', p_nombre, 'rol', p_rol),
            updated_at = now()
        WHERE id = v_user_id;
    ELSE
        -- Si no existe, creamos el usuario en auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
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
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('nombre_completo', p_nombre, 'rol', p_rol),
            now(),
            now()
        )
        RETURNING id INTO v_user_id;
    END IF;

    -- 2. Garantizar perfil clínico en perfil_usuario
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
-- 3. SEMBRADO DE LAS 5 CUENTAS OFICIALES
-- Sede Independencia: b0000000-0000-0000-0000-000000000001
-- Sede Vivanco:       b0000000-0000-0000-0000-000000000002
-- ============================================================================

-- 1. ADMINISTRADOR GENERAL (Dirección Red)
SELECT public.crear_usuario_clinico(
    'admin@lasmellizasperu.com',
    'Admin#Mellizas2026!',
    'Dirección Médica & Gestión',
    'ADMIN',
    NULL,
    'CMP 99881',
    'Dirección Médica & Gestión'
);

-- 2. ADMISIÓN & CAJA INDEPENDENCIA
SELECT public.crear_usuario_clinico(
    'admision.ind@lasmellizasperu.com',
    'Mellizas#Adm2026!',
    'Lucía Mendoza Quispe',
    'RECEPCION_CAJA',
    'b0000000-0000-0000-0000-000000000001'::uuid,
    NULL,
    'Admisión y Facturación Integrada'
);

-- 3. MÉDICO HCE INDEPENDENCIA
SELECT public.crear_usuario_clinico(
    'medico.ind@lasmellizasperu.com',
    'Medico#Ind2026!',
    'Dr. Carlos Benavides Velarde',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'CMP 54321 / RNE 23456',
    'Ginecología y Obstetricia'
);

-- 4. ADMISIÓN & CAJA VIVANCO
SELECT public.crear_usuario_clinico(
    'admision.viv@lasmellizasperu.com',
    'Mellizas#Adm2026!',
    'Marilú Quispe Paucar',
    'RECEPCION_CAJA',
    'b0000000-0000-0000-0000-000000000002'::uuid,
    NULL,
    'Admisión y Facturación Integrada'
);

-- 5. OBSTETRA HCE VIVANCO
SELECT public.crear_usuario_clinico(
    'obstetra.viv@lasmellizasperu.com',
    'Obstetra#Viv2026!',
    'Lic. Sonia Rivas Alarcón',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000002'::uuid,
    'COP 12890',
    'Obstetricia Integral y Ecografía'
);
