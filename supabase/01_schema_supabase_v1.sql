-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT MAESTRO DE BASE DE DATOS PARA SUPABASE (POSTGRESQL 15+)
-- MIGRACIÓN CANÓNICA HCE / CAJA / ADMISIÓN CON SEGURIDAD RLS Y AUDITORÍA
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('RECEPCION', 'PROFESIONAL', 'CAJA', 'SUPERVISION', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_encuentro AS ENUM ('EN_ESPERA', 'EN_ATENCION', 'ATENDIDO', 'CANCELADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_orden AS ENUM ('PENDIENTE', 'PAGADO', 'ANULADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE medio_pago AS ENUM ('EFECTIVO', 'YAPE', 'PLIN', 'TARJETA_POS', 'TRANSFERENCIA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. TABLAS BASE
-- ----------------------------------------------------------------------------

-- Organización
CREATE TABLE IF NOT EXISTS public.organizacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razon_social TEXT NOT NULL DEFAULT 'Las Mellizas Perú S.A.C.',
    ruc TEXT NOT NULL DEFAULT '20611827335',
    direccion TEXT NOT NULL DEFAULT 'Av. Independencia 247, Huamanga, Ayacucho',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sedes
CREATE TABLE IF NOT EXISTS public.sede (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id UUID NOT NULL REFERENCES public.organizacion(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    codigo TEXT NOT NULL UNIQUE,
    direccion TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfil de Usuario (Vinculado a Supabase Auth)
CREATE TABLE IF NOT EXISTS public.perfil_usuario (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'RECEPCION',
    site_id UUID REFERENCES public.sede(id),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pacientes
CREATE TABLE IF NOT EXISTS public.paciente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni TEXT NOT NULL UNIQUE,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    telefono TEXT NOT NULL,
    email TEXT,
    fecha_nacimiento DATE,
    direccion TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paciente_dni ON public.paciente(dni);
CREATE INDEX IF NOT EXISTS idx_paciente_apellidos ON public.paciente(apellidos);

-- Encuentros / Atenciones
CREATE TABLE IF NOT EXISTS public.encuentro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    site_id UUID NOT NULL REFERENCES public.sede(id) ON DELETE RESTRICT,
    profesional_id UUID REFERENCES public.perfil_usuario(id),
    servicio_solicitado TEXT NOT NULL,
    estado estado_encuentro NOT NULL DEFAULT 'EN_ESPERA',
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_encuentro_site_estado ON public.encuentro(site_id, estado);
CREATE INDEX IF NOT EXISTS idx_encuentro_paciente ON public.encuentro(paciente_id);

-- Notas Clínicas (Historia Clínica Electrónica)
CREATE TABLE IF NOT EXISTS public.nota_clinica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encuentro_id UUID NOT NULL UNIQUE REFERENCES public.encuentro(id) ON DELETE RESTRICT,
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    profesional_id UUID NOT NULL REFERENCES public.perfil_usuario(id),
    motivo_consulta TEXT NOT NULL,
    antecedentes TEXT,
    examen_fisico TEXT,
    diagnostico_cie10 TEXT NOT NULL,
    plan_trabajo TEXT,
    tratamiento TEXT,
    cerrada BOOLEAN NOT NULL DEFAULT false,
    fecha_cierre TIMESTAMPTZ,
    hash_firma TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nota_paciente ON public.nota_clinica(paciente_id);

-- Adendas a Notas Clínicas (Append-Only)
CREATE TABLE IF NOT EXISTS public.adenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_id UUID NOT NULL REFERENCES public.nota_clinica(id) ON DELETE RESTRICT,
    profesional_id UUID NOT NULL REFERENCES public.perfil_usuario(id),
    texto TEXT NOT NULL,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
    hash_firma TEXT
);
CREATE INDEX IF NOT EXISTS idx_adenda_nota ON public.adenda(nota_id);

-- Órdenes de Pago (Caja)
CREATE TABLE IF NOT EXISTS public.orden_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encuentro_id UUID NOT NULL REFERENCES public.encuentro(id) ON DELETE RESTRICT,
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    site_id UUID NOT NULL REFERENCES public.sede(id) ON DELETE RESTRICT,
    servicio TEXT NOT NULL,
    monto NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
    estado estado_orden NOT NULL DEFAULT 'PENDIENTE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orden_site_estado ON public.orden_pago(site_id, estado);

-- Pagos Registrados (Append-Only)
CREATE TABLE IF NOT EXISTS public.pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID NOT NULL REFERENCES public.orden_pago(id) ON DELETE RESTRICT,
    cajero_id UUID NOT NULL REFERENCES public.perfil_usuario(id),
    medio_pago medio_pago NOT NULL,
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    referencia TEXT,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pago_orden ON public.pago(orden_id);

-- Auditoría y Trazabilidad (Append-Only)
CREATE TABLE IF NOT EXISTS public.auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
    usuario_id UUID REFERENCES public.perfil_usuario(id),
    site_id UUID REFERENCES public.sede(id),
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    entidad_id TEXT,
    detalle JSONB
);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON public.auditoria(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria(fecha_hora DESC);

-- ----------------------------------------------------------------------------
-- 3. FUNCIONES Y TRIGGERS DE INMUTABILIDAD Y SELLADO
-- ----------------------------------------------------------------------------

-- Bloqueo genérico de UPDATE en tablas append-only
CREATE OR REPLACE FUNCTION public.f_bloquear_update() 
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
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- POLÍTICAS: Organización y Sede (Lectura para todo usuario autenticado)
CREATE POLICY "Lectura organización autorizada" ON public.organizacion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura sedes autorizada" ON public.sede FOR SELECT TO authenticated USING (true);

-- POLÍTICAS: Perfil de usuario
CREATE POLICY "Lectura perfiles" ON public.perfil_usuario FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auto-actualización perfil propio" ON public.perfil_usuario FOR UPDATE TO authenticated USING (id = auth.uid());

-- POLÍTICAS: Pacientes (Recepción, Profesionales y Admin pueden ver y gestionar)
CREATE POLICY "Ver pacientes" ON public.paciente FOR SELECT TO authenticated USING (true);
CREATE POLICY "Crear paciente (Recepción y Admin)" ON public.paciente FOR INSERT TO authenticated 
WITH CHECK (public.obtener_mi_rol() IN ('RECEPCION', 'SUPERVISION', 'ADMIN'));
CREATE POLICY "Editar paciente (Recepción y Admin)" ON public.paciente FOR UPDATE TO authenticated 
USING (public.obtener_mi_rol() IN ('RECEPCION', 'SUPERVISION', 'ADMIN'));

-- POLÍTICAS: Encuentros
CREATE POLICY "Ver encuentros" ON public.encuentro FOR SELECT TO authenticated USING (true);
CREATE POLICY "Crear encuentro" ON public.encuentro FOR INSERT TO authenticated 
WITH CHECK (public.obtener_mi_rol() IN ('RECEPCION', 'ADMIN'));
CREATE POLICY "Actualizar encuentro" ON public.encuentro FOR UPDATE TO authenticated 
USING (public.obtener_mi_rol() IN ('RECEPCION', 'PROFESIONAL', 'ADMIN'));

-- POLÍTICAS: NOTAS CLÍNICAS (AISLAMIENTO CLÍNICO ABSOLUTO)
-- Solo PROFESIONAL, SUPERVISION y ADMIN pueden leer notas clínicas.
-- CAJA y RECEPCION TIENEN ACCESO DENEGADO A NIVEL DE BASE DE DATOS.
CREATE POLICY "Lectura médica de notas clínicas" ON public.nota_clinica FOR SELECT TO authenticated 
USING (public.obtener_mi_rol() IN ('PROFESIONAL', 'SUPERVISION', 'ADMIN'));

CREATE POLICY "Crear notas clínicas (Solo Médicos)" ON public.nota_clinica FOR INSERT TO authenticated 
WITH CHECK (public.obtener_mi_rol() IN ('PROFESIONAL', 'ADMIN'));

CREATE POLICY "Actualizar nota clínica antes de cerrar" ON public.nota_clinica FOR UPDATE TO authenticated 
USING (public.obtener_mi_rol() IN ('PROFESIONAL', 'ADMIN') AND cerrada = false);

-- POLÍTICAS: ADENDAS (AISLAMIENTO CLÍNICO)
CREATE POLICY "Lectura médica de adendas" ON public.adenda FOR SELECT TO authenticated 
USING (public.obtener_mi_rol() IN ('PROFESIONAL', 'SUPERVISION', 'ADMIN'));

CREATE POLICY "Crear adenda (Solo Médicos)" ON public.adenda FOR INSERT TO authenticated 
WITH CHECK (public.obtener_mi_rol() IN ('PROFESIONAL', 'ADMIN'));

-- POLÍTICAS: ÓRDENES DE PAGO (CAJA)
CREATE POLICY "Ver órdenes de pago" ON public.orden_pago FOR SELECT TO authenticated USING (true);
CREATE POLICY "Crear órdenes de pago" ON public.orden_pago FOR INSERT TO authenticated 
WITH CHECK (public.obtener_mi_rol() IN ('RECEPCION', 'CAJA', 'ADMIN'));
CREATE POLICY "Actualizar órdenes de pago" ON public.orden_pago FOR UPDATE TO authenticated 
USING (public.obtener_mi_rol() IN ('CAJA', 'ADMIN'));

-- POLÍTICAS: PAGOS
CREATE POLICY "Ver pagos" ON public.pago FOR SELECT TO authenticated USING (true);
CREATE POLICY "Registrar pago (Caja y Admin)" ON public.pago FOR INSERT TO authenticated 
WITH CHECK (public.obtener_mi_rol() IN ('CAJA', 'ADMIN'));

-- POLÍTICAS: AUDITORÍA
CREATE POLICY "Lectura auditoría (Supervisión y Admin)" ON public.auditoria FOR SELECT TO authenticated 
USING (public.obtener_mi_rol() IN ('SUPERVISION', 'ADMIN'));
CREATE POLICY "Registro de auditoría para todos" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 5. SEMILLAS INSTITUCIONALES (DATOS INICIALES)
-- ----------------------------------------------------------------------------
INSERT INTO public.organizacion (id, razon_social, ruc, direccion)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Las Mellizas Perú S.A.C.', '20611827335', 'Av. Independencia 247, Huamanga, Ayacucho')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sede (id, organizacion_id, nombre, codigo, direccion, activa)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Sede Independencia', 'AYAC-IND', 'Av. Independencia N.º 247, Huamanga', true),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Sede Vivanco', 'AYAC-VIV', 'Jr. Carlos F. Vivanco N.º 265, int. 2.º piso, Huamanga', true)
ON CONFLICT (id) DO NOTHING;