-- ============================================================================
-- SCRIPT MAESTRO DE DESPLIEGUE: PIZARRA LIMPIA V2 (COSTO $0)
-- SISTEMA: LAS MELLIZAS PORTAL (VIA B) - CLINICA MATERNO FETAL & ECOGRAFIA
-- DESTINO: NUEVO PROYECTO SUPABASE VIRGEN (POSTGRESQL 15+)
-- NORMATIVA: LEY N.° 30024, NTS N.° 139-MINSA, REGLAMENTO D.S. 024-2016-SA
-- ARQUITECTURA: ZERO-TRUST MULTI-SEDE (INDEPENDENCIA & VIVANCO)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONES POSTGRESQL NATIVAS REQUERIDAS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";

-- ----------------------------------------------------------------------------
-- 1. SEDES OPERATIVAS CANONICAS (UUIDs FIJOS INSTITUCIONALES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site (
  id UUID PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  abreviatura TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  ruc TEXT DEFAULT '20611827335',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site (id, nombre, abreviatura, direccion, telefono, ruc, activo)
VALUES 
  ('b0000000-0000-0000-0000-000000000001', 'Independencia', 'IND', 'Av. Carlos Izaguirre 123 - Independencia', '987654321', '20611827335', true),
  ('b0000000-0000-0000-0000-000000000002', 'Vivanco', 'VIV', 'Av. Vivanco 456 - Pueblo Libre', '987654322', '20611827335', true)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  abreviatura = EXCLUDED.abreviatura,
  direccion = EXCLUDED.direccion;

-- ----------------------------------------------------------------------------
-- 2. PERFILES DE USUARIO Y CONTROL DE ACCESO BASADO EN ROLES (RBAC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfil_usuario (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.site(id),
  nombre_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'director_medico', 'profesional_obstetra', 'profesional_medico', 'cajero', 'admision')),
  colegiatura TEXT,
  rne_especialidad TEXT,
  profesion TEXT DEFAULT 'Obstetra',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. PADRON MAESTRO DE PACIENTES & AUDITORIA DE RECONCILIACION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paciente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dni TEXT NOT NULL UNIQUE,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  fecha_nacimiento DATE,
  sexo TEXT DEFAULT 'F',
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  distrito TEXT,
  alergias TEXT,
  grupo_sanguineo TEXT,
  antecedentes TEXT,
  site_id UUID REFERENCES public.site(id),
  legacy_hc_id TEXT,
  source_system_id TEXT DEFAULT 'SISTEMA_ORIGEN_B',
  merged_into_paciente_id UUID REFERENCES public.paciente(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coincidencias_pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id_a UUID NOT NULL REFERENCES public.paciente(id) ON DELETE CASCADE,
  paciente_id_b UUID NOT NULL REFERENCES public.paciente(id) ON DELETE CASCADE,
  tipo_coincidencia TEXT NOT NULL CHECK (tipo_coincidencia IN ('DNI_EXACTO', 'NOMBRE_SIMILAR', 'DNI_TYPO', 'HOMONIMIA_DNI_DISTINTO')),
  puntaje_similitud NUMERIC(5,2),
  estado TEXT NOT NULL DEFAULT 'posible' CHECK (estado IN ('posible', 'revisada_sin_fusion', 'fusionada')),
  creado_el TIMESTAMPTZ NOT NULL DEFAULT now(),
  revisado_por UUID REFERENCES auth.users(id),
  revisado_el TIMESTAMPTZ,
  notas_resolucion TEXT,
  CONSTRAINT chk_distintos_pacientes CHECK (paciente_id_a <> paciente_id_b)
);

-- ----------------------------------------------------------------------------
-- 4. CATALOGO DE SERVICIOS Y DISPENSACION DE FARMACIA / INSUMOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalogo_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('Ecografías', 'Consultas', 'Procedimientos', 'Laboratorio', 'Packs Promocionales', 'Farmacia')),
  precio NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  duracion_minutos INTEGER DEFAULT 30,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventario_farmacia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.site(id),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  presentacion TEXT,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 5,
  precio_costo NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  precio_venta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  lote TEXT,
  fecha_vencimiento DATE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unq_producto_sede UNIQUE (site_id, codigo)
);

-- ----------------------------------------------------------------------------
-- 5. CAJA, TURNOS, ARQUEO Y EGRESOS OPERATIVOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.caja_turno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.site(id),
  cajero_id UUID REFERENCES auth.users(id),
  cajero_nombre TEXT NOT NULL,
  fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_cierre TIMESTAMPTZ,
  monto_apertura NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  monto_cierre_efectivo_declarado NUMERIC(10,2),
  total_ingresos_efectivo NUMERIC(10,2) DEFAULT 0.00,
  total_ingresos_digital NUMERIC(10,2) DEFAULT 0.00,
  total_egresos NUMERIC(10,2) DEFAULT 0.00,
  efectivo_neto_esperado NUMERIC(10,2) DEFAULT 0.00,
  diferencia NUMERIC(10,2) DEFAULT 0.00,
  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
  hash_cierre TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.caja_egreso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id UUID REFERENCES public.caja_turno(id),
  site_id UUID NOT NULL REFERENCES public.site(id),
  cajero_id UUID REFERENCES auth.users(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('GASTO_MENOR', 'VIATICO', 'PAGO_COLABORADOR', 'INSUMOS_MEDICOS', 'OTRO')),
  concepto TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  destinatario TEXT NOT NULL,
  aprobado_por TEXT NOT NULL,
  comprobante_ref TEXT DEFAULT 'REC-INTERNO',
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movimiento_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id UUID REFERENCES public.caja_turno(id),
  site_id UUID NOT NULL REFERENCES public.site(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('INGRESO', 'EGRESO')),
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  medio_pago TEXT NOT NULL CHECK (medio_pago IN ('EFECTIVO', 'YAPE', 'PLIN', 'TARJETA_POS', 'TRANSFERENCIA', 'MIXTO', 'CONTROL')),
  descripcion TEXT NOT NULL,
  referencia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. ENCUENTROS CLINICOS Y COLA DE ATENCION EN TIEMPO REAL
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.encuentro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.site(id),
  paciente_id UUID NOT NULL REFERENCES public.paciente(id),
  profesional_id UUID REFERENCES auth.users(id),
  tipo TEXT NOT NULL DEFAULT 'CONSULTA',
  estado TEXT NOT NULL DEFAULT 'EN_ESPERA' CHECK (estado IN ('EN_ESPERA', 'EN_ATENCION', 'ATENDIDO', 'CANCELADO', 'REPROGRAMADO')),
  motivo TEXT,
  pago_monto NUMERIC(10,2) DEFAULT 0.00,
  pago_medio TEXT DEFAULT 'EFECTIVO',
  pago_referencia TEXT,
  fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cola_atencion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encuentro_id UUID NOT NULL UNIQUE REFERENCES public.encuentro(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.site(id),
  prioridad INTEGER NOT NULL DEFAULT 0,
  orden INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'EN_ESPERA' CHECK (estado IN ('EN_ESPERA', 'EN_ATENCION', 'ATENDIDO', 'LLAMANDO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 7. HISTORIA CLINICA ELECTRONICA (HCE) & ADENDAS (NTS N.° 139-MINSA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nota_clinica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encuentro_id UUID NOT NULL UNIQUE REFERENCES public.encuentro(id) ON DELETE RESTRICT,
  paciente_id UUID REFERENCES public.paciente(id),
  profesional_id UUID REFERENCES auth.users(id),
  motivo_consulta TEXT,
  antecedentes TEXT,
  examen_fisico JSONB DEFAULT '{}'::jsonb,
  diagnostico_cie10 JSONB DEFAULT '[]'::jsonb,
  plan_trabajo TEXT,
  imagenes JSONB DEFAULT '[]'::jsonb,
  adendas JSONB DEFAULT '[]'::jsonb,
  cerrada BOOLEAN NOT NULL DEFAULT false,
  fecha_cierre TIMESTAMPTZ,
  hash_firma TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.adenda_nota_clinica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_clinica_id UUID NOT NULL REFERENCES public.nota_clinica(id) ON DELETE RESTRICT,
  encuentro_id UUID NOT NULL REFERENCES public.encuentro(id),
  autor_id UUID REFERENCES auth.users(id),
  autor_nombre TEXT NOT NULL,
  fecha_adenda TIMESTAMPTZ NOT NULL DEFAULT now(),
  texto TEXT NOT NULL,
  hash_adenda TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 8. CITAS AGENDADAS & REAGENDAMIENTO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cita_agendada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.site(id),
  paciente_id UUID REFERENCES public.paciente(id),
  paciente_nombre TEXT NOT NULL,
  telefono TEXT,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  motivo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PROGRAMADA' CHECK (estado IN ('PROGRAMADA', 'ATENDIDA', 'CANCELADA', 'REAGENDADA')),
  encuentro_id UUID REFERENCES public.encuentro(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 9. AUDITORIA ZERO-TRUST Y TRAZABILIDAD MEDICO-LEGAL
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  site_id UUID REFERENCES public.site(id),
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id TEXT,
  detalle JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 10. SECUENCIAS ATOMICAS INDEPENDIENTES POR SEDE
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.seq_ticket_independencia START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ticket_vivanco START 1;

CREATE OR REPLACE FUNCTION public.fn_siguiente_ticket_sede(p_sede TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_num BIGINT;
  v_prefijo TEXT;
BEGIN
  IF lower(coalesce(p_sede, '')) LIKE '%vivanco%' THEN
    v_num := nextval('public.seq_ticket_vivanco');
    v_prefijo := 'TK-VIV-';
  ELSE
    v_num := nextval('public.seq_ticket_independencia');
    v_prefijo := 'TK-IND-';
  END IF;
  RETURN v_prefijo || lpad(v_num::text, 6, '0');
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. FUNCION DE MARCA TEMPORAL CONFIABLE OFICIAL (POSTGRESQL / NTP AMERICA/LIMA)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_obtener_tiempo_servidor()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT timezone('America/Lima', now());
$$;

-- ----------------------------------------------------------------------------
-- 12. TRIGGER DE INMUTABILIDAD CLINICA NORMATIVA NTS N.° 139-MINSA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_proteger_nota_sellada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Si el registro ya estaba formalmente sellado:
  IF OLD.cerrada = true THEN
    -- Impedir cualquier modificación sobre el núcleo clínico original
    IF (OLD.motivo_consulta IS DISTINCT FROM NEW.motivo_consulta) OR
       (OLD.antecedentes IS DISTINCT FROM NEW.antecedentes) OR
       (OLD.examen_fisico::text IS DISTINCT FROM NEW.examen_fisico::text) OR
       (OLD.diagnostico_cie10::text IS DISTINCT FROM NEW.diagnostico_cie10::text) OR
       (OLD.plan_trabajo IS DISTINCT FROM NEW.plan_trabajo) OR
       (OLD.hash_firma IS DISTINCT FROM NEW.hash_firma) OR
       (OLD.fecha_cierre IS DISTINCT FROM NEW.fecha_cierre) THEN
      RAISE EXCEPTION 'NTS N.° 139-MINSA: El acto médico ya fue sellado y firmado. Está prohibido alterar la nota original; debe emitirse una Adenda Clínica.'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_nota_sellada ON public.nota_clinica;
CREATE TRIGGER trg_proteger_nota_sellada
  BEFORE UPDATE ON public.nota_clinica
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_proteger_nota_sellada();

-- ----------------------------------------------------------------------------
-- 13. RPC ATOMICA PARA INCORPORAR ADENDA CLINICA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.incorporar_adenda_clinica(
  p_encuentro_id UUID,
  p_texto_adenda TEXT,
  p_autor_nombre TEXT,
  p_autor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nota_id UUID;
  v_adendas JSONB;
  v_nueva_adenda JSONB;
  v_ahora TIMESTAMPTZ;
  v_payload TEXT;
  v_hash TEXT;
BEGIN
  v_ahora := timezone('America/Lima', now());

  SELECT id, coalesce(adendas, '[]'::jsonb)
  INTO v_nota_id, v_adendas
  FROM public.nota_clinica
  WHERE encuentro_id = p_encuentro_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró nota clínica para el encuentro %', p_encuentro_id;
  END IF;

  v_payload := 'ENCUENTRO:' || p_encuentro_id::text || '|AUTOR:' || p_autor_nombre || '|FECHA:' || v_ahora::text || '|TEXTO:' || trim(p_texto_adenda);
  v_hash := encode(digest(v_payload, 'sha256'), 'hex');

  v_nueva_adenda := jsonb_build_object(
    'fecha', to_char(v_ahora, 'DD/MM/YYYY, HH24:MI:SS'),
    'autor', p_autor_nombre,
    'texto', trim(p_texto_adenda),
    'hash', v_hash
  );

  v_adendas := v_adendas || jsonb_build_array(v_nueva_adenda);

  UPDATE public.nota_clinica
  SET adendas = v_adendas,
      updated_at = v_ahora
  WHERE id = v_nota_id;

  INSERT INTO public.adenda_nota_clinica (nota_clinica_id, encuentro_id, autor_id, autor_nombre, fecha_adenda, texto, hash_adenda)
  VALUES (v_nota_id, p_encuentro_id, p_autor_id, p_autor_nombre, v_ahora, trim(p_texto_adenda), v_hash);

  RETURN jsonb_build_object('success', true, 'hash', v_hash, 'adenda', v_nueva_adenda);
END;
$$;

-- ----------------------------------------------------------------------------
-- 14. BUCKET DE SUPABASE STORAGE PARA APOYO DIAGNOSTICO (ECOGRAFIAS)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ecografias',
  'ecografias',
  true,
  15728640, -- 15 Megabytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ----------------------------------------------------------------------------
-- 15. SEGURIDAD Y PRIVACIDAD ZERO-TRUST (ROW LEVEL SECURITY - RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.site ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coincidencias_pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_farmacia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_egreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimiento_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encuentro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cola_atencion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nota_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adenda_nota_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cita_agendada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso Autenticado Institucional
CREATE POLICY "site_lectura_autenticada" ON public.site FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfil_lectura_autenticada" ON public.perfil_usuario FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfil_modificacion_propia" ON public.perfil_usuario FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "paciente_gestion_autenticada" ON public.paciente FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "catalogo_lectura_autenticada" ON public.catalogo_servicio FOR SELECT TO authenticated USING (true);
CREATE POLICY "farmacia_gestion_autenticada" ON public.inventario_farmacia FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "caja_turno_gestion_autenticada" ON public.caja_turno FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "caja_egreso_gestion_autenticada" ON public.caja_egreso FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "movimiento_caja_gestion_autenticada" ON public.movimiento_caja FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "encuentro_gestion_autenticada" ON public.encuentro FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cola_atencion_gestion_autenticada" ON public.cola_atencion FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "nota_clinica_gestion_autenticada" ON public.nota_clinica FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "adenda_gestion_autenticada" ON public.adenda_nota_clinica FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cita_gestion_autenticada" ON public.cita_agendada FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auditoria_insercion_autenticada" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auditoria_lectura_supervision" ON public.auditoria FOR SELECT TO authenticated USING (true);

-- Storage Policies
CREATE POLICY "ecografias_lectura_publica" ON storage.objects FOR SELECT USING (bucket_id = 'ecografias');
CREATE POLICY "ecografias_insercion_autenticada" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ecografias');
CREATE POLICY "ecografias_actualizacion_autenticada" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'ecografias');

-- ============================================================================
-- FIN DEL SCRIPT MAESTRO DE DESPLIEGUE PIZARRA LIMPIA V2
-- ESTE SCRIPT DEBE EJECUTARSE EN EL SQL EDITOR DEL SUPABASE VIRGEN
-- ============================================================================
