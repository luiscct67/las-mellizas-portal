-- ============================================================================
-- PROPUESTA DE SCRIPT 18: CONVERGENCIA DE ESQUEMA Y PADRÓN DE PACIENTES
-- ESTADO: BORRADOR DE PROPUESTA TÉCNICA (SOLO LECTURA / EVALUACIÓN CONJUNTA)
-- ADVERTENCIA: NO EJECUTAR EN MAIN NI EN BASE DE DATOS DE PRODUCCIÓN
-- REFERENCIA: Directivas DG-001-C, DG-001-B, DG-002 | Vía A y Vía B
-- FECHA DE EMISIÓN: 21 de Septiembre de 2026
-- ============================================================================

-- EXTENSIONES POSTGRESQL NATIVAS OBLIGATORIAS (DG-001-B)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- ============================================================================
-- 1. EXTENSIÓN DE COLUMNAS CANÓNICAS EN TABLA PACIENTE (Vía B -> Vía A)
-- Preserva la nomenclatura en español del esquema operativo e incorpora
-- los atributos de trazabilidad institucional del Padrón Maestro de Vía A.
-- ============================================================================

ALTER TABLE IF EXISTS public.paciente
  ADD COLUMN IF NOT EXISTS legacy_hc_id TEXT,
  ADD COLUMN IF NOT EXISTS source_system_id TEXT DEFAULT 'SISTEMA_ORIGEN_B',
  ADD COLUMN IF NOT EXISTS merged_into_paciente_id UUID REFERENCES public.paciente(id);

COMMENT ON COLUMN public.paciente.legacy_hc_id IS 'Identificador de historia clínica legada (Sede Independencia / Sede Vivanco)';
COMMENT ON COLUMN public.paciente.source_system_id IS 'Sistema de procedencia del registro para trazabilidad de migración';
COMMENT ON COLUMN public.paciente.merged_into_paciente_id IS 'Puntero de absorción por fusión canónica aprobada por Dirección/Supervisión';

-- ============================================================================
-- 2. FUNCIONES INMUTABLES DE NORMALIZACIÓN (DG-001-B / Vía A)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalizar_documento(doc TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(UPPER(TRIM(coalesce(doc, ''))), '[^A-Z0-9]', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.normalizar_nombre(nombre TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(regexp_replace(UPPER(TRIM(coalesce(nombre, ''))), '[^A-Z0-9 ]', '', 'g'), '\s+', ' ', 'g'), '');
$$;

-- ============================================================================
-- 3. TABLA DE COINCIDENCIAS DIFUSAS DE PACIENTES (DG-001-B / Vía A)
-- Almacena sospechas de duplicidad para revisión humana sin alterar flujo clínico.
-- ============================================================================

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

ALTER TABLE public.coincidencias_pacientes ENABLE ROW LEVEL SECURITY;

-- Política RLS: Solo roles de supervisión médica y administración institucional
CREATE POLICY "coincidencias_pacientes_select" ON public.coincidencias_pacientes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador', 'supervision', 'director_medico')
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.coincidencias_pacientes FROM authenticated;

-- ============================================================================
-- 4. MOTOR DE DETECCIÓN DIFUSA (TRIGGER NO BLOQUEANTE)
-- Evalúa los 4 casos aprobados por Dirección General:
--   Caso 1: DNI idéntico + nombre idéntico (Duplicado exacto)
--   Caso 2: DNI idéntico + nombres con variación tipográfica (similarity >= 0.70)
--   Caso 3: Nombres idénticos + DNI con 1 dígito de diferencia (Levenshtein = 1)
--   Caso 4: Nombres idénticos + DNI completamente distinto (Homonimia pura)
-- NUNCA bloquea el registro en ventanilla/caja (Principio de no-fusión-automática).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_detectar_coincidencia_paciente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_doc_norm TEXT;
  v_nombre_norm TEXT;
  v_otro RECORD;
  v_similitud NUMERIC;
  v_lev_dni INT;
  v_tipo TEXT;
BEGIN
  v_doc_norm := public.normalizar_documento(NEW.numero_documento);
  v_nombre_norm := public.normalizar_nombre(COALESCE(NEW.nombres, '') || ' ' || COALESCE(NEW.apellidos, ''));

  IF v_doc_norm IS NULL AND v_nombre_norm IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_otro IN
    SELECT 
      p.id,
      public.normalizar_documento(p.numero_documento) AS doc_otro,
      public.normalizar_nombre(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, '')) AS nom_otro
    FROM public.paciente p
    WHERE p.id <> NEW.id
      AND p.merged_into_paciente_id IS NULL
  LOOP
    v_tipo := NULL;
    v_similitud := 0.00;

    -- Caso 1: DNI idéntico + Nombre idéntico
    IF v_doc_norm IS NOT NULL AND v_otro.doc_otro = v_doc_norm AND v_otro.nom_otro = v_nombre_norm THEN
      v_tipo := 'DNI_EXACTO';
      v_similitud := 1.00;

    -- Caso 2: DNI idéntico + Nombres con variación (trigram >= 0.70)
    ELSIF v_doc_norm IS NOT NULL AND v_otro.doc_otro = v_doc_norm THEN
      v_similitud := similarity(v_nombre_norm, v_otro.nom_otro);
      IF v_similitud >= 0.70 THEN
        v_tipo := 'NOMBRE_SIMILAR';
      END IF;

    -- Caso 3 y 4: Nombres idénticos o muy cercanos (trigram >= 0.85) con DNI distinto
    ELSIF v_nombre_norm IS NOT NULL AND similarity(v_nombre_norm, v_otro.nom_otro) >= 0.85 THEN
      IF v_doc_norm IS NOT NULL AND v_otro.doc_otro IS NOT NULL THEN
        v_lev_dni := levenshtein(v_doc_norm, v_otro.doc_otro);
        IF v_lev_dni <= 1 THEN
          v_tipo := 'DNI_TYPO';
          -- Fórmula de normalización trazable: 1.0 - (distancia / max_longitud_documento)
          v_similitud := round(1.0 - (v_lev_dni::numeric / GREATEST(length(v_doc_norm), length(v_otro.doc_otro))), 4);
        ELSE
          v_tipo := 'HOMONIMIA_DNI_DISTINTO';
          v_similitud := round(similarity(v_nombre_norm, v_otro.nom_otro)::numeric, 4);
        END IF;
      ELSE
        v_tipo := 'HOMONIMIA_DNI_DISTINTO';
        v_similitud := round(similarity(v_nombre_norm, v_otro.nom_otro)::numeric, 4);
      END IF;
    END IF;

    -- Si se detectó una coincidencia, insertar en cola de resolución
    IF v_tipo IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.coincidencias_pacientes
        WHERE (paciente_id_a = NEW.id AND paciente_id_b = v_otro.id)
           OR (paciente_id_a = v_otro.id AND paciente_id_b = NEW.id)
      ) THEN
        INSERT INTO public.coincidencias_pacientes (
          paciente_id_a,
          paciente_id_b,
          tipo_coincidencia,
          puntaje_similitud,
          estado
        ) VALUES (
          NEW.id,
          v_otro.id,
          v_tipo,
          v_similitud,
          'posible'
        );
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detectar_coincidencia_paciente ON public.paciente;
CREATE TRIGGER trg_detectar_coincidencia_paciente
  AFTER INSERT ON public.paciente
  FOR EACH ROW EXECUTE FUNCTION public.fn_detectar_coincidencia_paciente();

-- ============================================================================
-- 5. RESOLUCIÓN DE IDENTIDAD CANÓNICA (RECURSIVA)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolver_paciente_id_actual(p_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH RECURSIVE cadena AS (
    SELECT id, merged_into_paciente_id FROM public.paciente WHERE id = p_id
    UNION ALL
    SELECT p.id, p.merged_into_paciente_id
    FROM public.paciente p
    JOIN cadena c ON p.id = c.merged_into_paciente_id
  )
  SELECT id FROM cadena WHERE merged_into_paciente_id IS NULL LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolver_paciente_id_actual(UUID) TO authenticated;

-- ============================================================================
-- 6. ACCIONES DE GOBERNANZA: FUSIÓN Y DESCARTE DE COINCIDENCIAS
-- Exclusivo para dirección médica y supervisión institucional.
-- Traza la operación en auditoría inmutable.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fusionar_pacientes(p_absorbido_id UUID, p_sobreviviente_id UUID, p_motivo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rol TEXT;
BEGIN
  SELECT rol INTO v_rol FROM public.perfil_usuario WHERE id = auth.uid();
  IF v_rol NOT IN ('administrador', 'supervision', 'director_medico') THEN
    RAISE EXCEPTION 'Acceso denegado: Solo administradores o supervisión pueden autorizar fusión de historias clínicas.';
  END IF;

  IF p_absorbido_id = p_sobreviviente_id THEN
    RAISE EXCEPTION 'Operación inválida: No se puede fusionar un paciente consigo mismo.';
  END IF;

  -- Marcar absorción en paciente
  UPDATE public.paciente 
  SET merged_into_paciente_id = p_sobreviviente_id 
  WHERE id = p_absorbido_id;

  -- Actualizar estado en tabla de coincidencias
  UPDATE public.coincidencias_pacientes
  SET estado = 'fusionada', 
      revisado_por = auth.uid(), 
      revisado_el = now(),
      notas_resolucion = p_motivo
  WHERE (paciente_id_a = p_absorbido_id AND paciente_id_b = p_sobreviviente_id)
     OR (paciente_id_a = p_sobreviviente_id AND paciente_id_b = p_absorbido_id);

  -- Registrar en log de auditoría
  INSERT INTO public.auditoria (
    tabla,
    operacion,
    registro_id,
    usuario_id,
    datos_nuevos
  ) VALUES (
    'paciente',
    'FUSION_CANONICA',
    p_absorbido_id,
    auth.uid(),
    jsonb_build_object(
      'absorbido_id', p_absorbido_id,
      'sobreviviente_id', p_sobreviviente_id,
      'motivo', p_motivo,
      'fecha', now()
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fusionar_pacientes(UUID, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.descartar_coincidencia(p_coincidencia_id UUID, p_motivo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rol TEXT;
BEGIN
  SELECT rol INTO v_rol FROM public.perfil_usuario WHERE id = auth.uid();
  IF v_rol NOT IN ('administrador', 'supervision', 'director_medico') THEN
    RAISE EXCEPTION 'Acceso denegado: Solo administradores o supervisión pueden descartar coincidencias.';
  END IF;

  UPDATE public.coincidencias_pacientes
  SET estado = 'revisada_sin_fusion', 
      revisado_por = auth.uid(), 
      revisado_el = now(),
      notas_resolucion = p_motivo
  WHERE id = p_coincidencia_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.descartar_coincidencia(UUID, TEXT) TO authenticated;

-- FIN DE PROPUESTA SCRIPT 18 (SOLO LECTURA)
