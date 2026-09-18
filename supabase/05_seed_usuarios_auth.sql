-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT 05: CORRECCIÓN Y APROVISIONAMIENTO COMPLETO EN SUPABASE AUTH
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. REPARACIÓN INMEDIATA DE CAMPOS NULL EN AUTH.USERS (Exigencia del motor GoTrue)
-- GoTrue requiere '' (cadena vacía) en lugar de NULL para evitar el error 'converting NULL to string'
UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL 
   OR recovery_token IS NULL 
   OR email_change IS NULL;

-- 2. FUNCIÓN DE APROVISIONAMIENTO SEGURO Y COMPATIBLE CON SUPABASE GOTRUE
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
    
    -- Verificar si el usuario ya existe en auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- Si existe, actualizamos su contraseña y garantizamos tokens no-nulos
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
        -- Si no existe, creamos el usuario con todos los tokens inicializados en ''
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
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('nombre_completo', p_nombre, 'rol', p_rol),
            now(),
            now()
        )
        RETURNING id INTO v_user_id;
    END IF;

    -- Garantizar perfil en perfil_usuario
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
-- 3. APROVISIONAMIENTO DE LAS 5 CUENTAS INSTITUCIONALES
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

-- 2. ADMISIÓN & CAJA (Sede Independencia)
SELECT public.crear_usuario_clinico(
    'admision.ind@lasmellizasperu.com',
    'Mellizas#Adm2026!',
    'Lucía Mendoza Quispe',
    'RECEPCION_CAJA',
    'b0000000-0000-0000-0000-000000000001'::uuid,
    NULL,
    'Admisión y Facturación Integrada'
);

-- 3. MÉDICO CONSULTORIO HCE (Sede Independencia)
SELECT public.crear_usuario_clinico(
    'medico.ind@lasmellizasperu.com',
    'Medico#Ind2026!',
    'Dr. Carlos Benavides Velarde',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'CMP 54321 / RNE 23456',
    'Ginecología y Obstetricia'
);

-- 4. ADMISIÓN & CAJA (Sede Vivanco)
SELECT public.crear_usuario_clinico(
    'admision.viv@lasmellizasperu.com',
    'Mellizas#Adm2026!',
    'Marilú Quispe Paucar',
    'RECEPCION_CAJA',
    'b0000000-0000-0000-0000-000000000002'::uuid,
    NULL,
    'Admisión y Facturación Integrada'
);

-- 5. OBSTETRA CONSULTORIO HCE (Sede Vivanco)
SELECT public.crear_usuario_clinico(
    'obstetra.viv@lasmellizasperu.com',
    'Obstetra#Viv2026!',
    'Lic. Sonia Rivas Alarcón',
    'PROFESIONAL',
    'b0000000-0000-0000-0000-000000000002'::uuid,
    'COP 12890',
    'Obstetricia Integral y Ecografía'
);
