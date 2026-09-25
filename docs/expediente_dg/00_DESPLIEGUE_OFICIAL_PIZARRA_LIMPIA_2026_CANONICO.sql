-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERÚ S.A.C. (RUC 20611827335)
-- SCRIPT CANÓNICO MAESTRO DE DESPLIEGUE: PIZARRA LIMPIA 2026 (COSTO $0)
-- DESTINO: NUEVO PROYECTO SUPABASE VIRGEN "Las Mellizas" (POSTGRESQL 15+)
-- NORMATIVA: LEY N.° 30024, NTS N.° 139-MINSA, REGLAMENTO D.S. 024-2016-SA
-- ARQUITECTURA: ZERO-TRUST MULTI-SEDE (INDEPENDENCIA & VIVANCO)
-- AUDITORÍA: CONSOLIDA MIGRACIONES 01 A 17 + CANAL DE ATRIBUCIÓN MARKETING
-- PACIENTES INICIALES: 0 (PIZARRA CERO ABSOLUTA)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONES POSTGRESQL NATIVAS REQUERIDAS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";

-- ----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS INSTITUCIONALES (ROLES Y ESTADOS)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.rol_usuario AS ENUM ('RECEPCION_CAJA', 'RECEPCION', 'CAJA', 'PROFESIONAL', 'SUPERVISION', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.estado_encuentro AS ENUM ('EN_ESPERA', 'EN_ATENCION', 'ATENDIDO', 'CANCELADO', 'REPROGRAMADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.estado_orden AS ENUM ('PENDIENTE', 'PAGADO', 'ANULADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.medio_pago AS ENUM ('EFECTIVO', 'YAPE', 'PLIN', 'TARJETA_POS', 'TRANSFERENCIA', 'MIXTO', 'CONTROL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. ORGANIZACIÓN Y SEDES OPERATIVAS CANÓNICAS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razon_social TEXT NOT NULL DEFAULT 'Las Mellizas Perú S.A.C.',
    ruc TEXT NOT NULL DEFAULT '20611827335',
    direccion TEXT NOT NULL DEFAULT 'Av. Independencia 247, Huamanga, Ayacucho',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.organizacion (id, razon_social, ruc, direccion)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Las Mellizas Perú S.A.C.', '20611827335', 'Av. Independencia 247, Huamanga, Ayacucho')
ON CONFLICT (id) DO UPDATE SET
    razon_social = EXCLUDED.razon_social,
    ruc = EXCLUDED.ruc;

CREATE TABLE IF NOT EXISTS public.sede (
    id UUID PRIMARY KEY,
    organizacion_id UUID REFERENCES public.organizacion(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL UNIQUE,
    codigo TEXT NOT NULL UNIQUE,
    abreviatura TEXT NOT NULL,
    direccion TEXT NOT NULL,
    telefono TEXT,
    ruc TEXT DEFAULT '20611827335',
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.sede (id, organizacion_id, nombre, codigo, abreviatura, direccion, telefono, ruc, activa)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Independencia', 'IND', 'IND', 'Av. Independencia 247, Huamanga, Ayacucho', '966840077', '20611827335', true),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Vivanco', 'VIV', 'VIV', 'Jr. Carlos F. Vivanco N.º 265, Huamanga, Ayacucho', '966840077', '20611827335', true)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    codigo = EXCLUDED.codigo,
    abreviatura = EXCLUDED.abreviatura,
    direccion = EXCLUDED.direccion,
    telefono = EXCLUDED.telefono;

-- Tabla site y vista sincronizada para compatibilidad universal
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
    ('b0000000-0000-0000-0000-000000000001', 'Independencia', 'IND', 'Av. Independencia 247, Huamanga, Ayacucho', '966840077', '20611827335', true),
    ('b0000000-0000-0000-0000-000000000002', 'Vivanco', 'VIV', 'Jr. Carlos F. Vivanco N.º 265, Huamanga, Ayacucho', '966840077', '20611827335', true)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    abreviatura = EXCLUDED.abreviatura,
    direccion = EXCLUDED.direccion,
    telefono = EXCLUDED.telefono;

-- ----------------------------------------------------------------------------
-- 3. PERFILES DE USUARIO (COLABORADORES Y ROLES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfil_usuario (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol public.rol_usuario NOT NULL DEFAULT 'RECEPCION_CAJA',
    site_id UUID REFERENCES public.sede(id),
    colegiatura TEXT,
    especialidad TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perfil_usuario_email ON public.perfil_usuario(email);
CREATE INDEX IF NOT EXISTS idx_perfil_usuario_site ON public.perfil_usuario(site_id);

-- Funciones auxiliares de seguridad RLS
CREATE OR REPLACE FUNCTION public.obtener_mi_site_id()
RETURNS UUID AS $$
    SELECT site_id FROM public.perfil_usuario WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.obtener_mi_rol_estricto()
RETURNS public.rol_usuario AS $$
    SELECT rol FROM public.perfil_usuario WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 4. PADRÓN MAESTRO DE PACIENTES (CON CANAL DE ATRIBUCIÓN MARKETING)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paciente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni TEXT NOT NULL UNIQUE,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    telefono TEXT NOT NULL,
    email TEXT,
    fecha_nacimiento DATE,
    sexo TEXT DEFAULT 'F',
    direccion TEXT,
    distrito TEXT,
    alergias TEXT,
    grupo_sanguineo TEXT,
    antecedentes TEXT,
    site_id UUID REFERENCES public.sede(id),
    canal_origen TEXT DEFAULT 'VENTANILLA' CHECK (canal_origen IN ('FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'WHATSAPP_ORGANICO', 'WEB_DIRECTA', 'RECOMENDACION', 'VENTANILLA', 'OTRO')),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paciente_dni ON public.paciente(dni);
CREATE INDEX IF NOT EXISTS idx_paciente_apellidos ON public.paciente(apellidos);
CREATE INDEX IF NOT EXISTS idx_paciente_canal ON public.paciente(canal_origen);

-- ----------------------------------------------------------------------------
-- 5. CATÁLOGO INSTITUCIONAL DE SERVICIOS Y TARIFARIO OFICIAL (47 SERVICIOS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalogo_servicio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL CHECK (categoria IN ('Ecografías', 'Consultas', 'Procedimientos', 'Laboratorio', 'Packs Promocionales', 'Farmacia')),
    precio_venta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    costo_operativo NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    duracion_minutos INTEGER DEFAULT 30,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalogo_codigo ON public.catalogo_servicio(codigo);
CREATE INDEX IF NOT EXISTS idx_catalogo_categoria ON public.catalogo_servicio(categoria);

INSERT INTO public.catalogo_servicio (codigo, nombre, categoria, precio_venta, costo_operativo, descripcion, activo)
VALUES
    ('PCK-001', 'Pack Integral: Consulta + Ecografía 5D + PAP', 'Packs Promocionales', 220.00, 80.00, 'Paquete ginecológico preventivo integral y ecografía HD', true),
    ('PCK-002', 'Pack Embarazo Control Inicial: Eco Genética + Perfil Prenatal', 'Packs Promocionales', 210.00, 75.00, 'Descarte genético I trimestre + analítica completa', true),
    ('PCK-003', 'Pack Chequeo Ginecológico Anual: Colposcopía + PAP + Eco Transvaginal', 'Packs Promocionales', 190.00, 65.00, 'Chequeo preventivo integral femenino anual', true),
    ('PCK-004', 'Pack Descarte ITS Integral: Rápido Dual + Frotis Vaginal + Orina', 'Packs Promocionales', 110.00, 35.00, 'Evaluación integral de salud urogenital', true),
    ('PCK-005', 'Pack Urológico: Eco Renal + Vesicoprostática', 'Packs Promocionales', 120.00, 40.00, 'Evaluación urológica integral de riñones, vejiga y próstata', true),
    ('ECO-001', 'Ecografía Especializada 4D / 5D (HD Live)', 'Ecografías', 150.00, 50.00, 'Visualización fetal volumétrica en tiempo real con video', true),
    ('ECO-002', 'Ecografía Obstétrica Morfológica (Semana 20-24)', 'Ecografías', 140.00, 45.00, 'Evaluación anatómica fetal y marcadores de bienestar', true),
    ('ECO-003', 'Ecografía Doppler Materno-Fetal', 'Ecografías', 160.00, 55.00, 'Flujometría de arterias uterinas y cordón umbilical', true),
    ('ECO-004', 'Ecografía Genética / I Trimestre (Semana 11-14)', 'Ecografías', 120.00, 40.00, 'Translucencia nucal, hueso nasal y ductus venoso', true),
    ('ECO-005', 'Ecografía de Apoyo Diagnóstico: Obstétrica Control', 'Ecografías', 70.00, 25.00, 'Biometría fetal, líquido amniótico y placenta', true),
    ('ECO-006', 'Ecografía de Apoyo Diagnóstico: Transvaginal', 'Ecografías', 80.00, 25.00, 'Útero, endometrio y anexos ováricos de alta resolución', true),
    ('ECO-007', 'Ecografía de Apoyo Diagnóstico: Pélvica', 'Ecografías', 70.00, 25.00, 'Vía suprapúbica para descarte ginecológico', true),
    ('ECO-008', 'Ecografía Mamaria Bilateral', 'Ecografías', 80.00, 28.00, 'Evaluación ecográfica de ambas mamas y axilas (BI-RADS)', true),
    ('ECO-009', 'Ecografía Tiroidea', 'Ecografías', 80.00, 28.00, 'Evaluación de glándula tiroides y nódulos (TI-RADS)', true),
    ('ECO-010', 'Ecografía Abdominal Completa', 'Ecografías', 90.00, 30.00, 'Hígado, vesícula, páncreas, bazo y riñones', true),
    ('ECO-011', 'Ecografía Renal y Vías Urinarias', 'Ecografías', 80.00, 28.00, 'Riñones, vejiga y descarte de litiasis', true),
    ('ECO-012', 'Ecografía Prostática (Vesicoprostática)', 'Ecografías', 80.00, 28.00, 'Evaluación suprapúbica con cálculo de residuo postmiccional', true),
    ('ECO-013', 'Ecografía de Partes Blandas y Pared', 'Ecografías', 70.00, 25.00, 'Tejido celular subcutáneo, lipomas y hernias', true),
    ('ECO-014', 'Monitoreo Fetal Electrónico (NST)', 'Ecografías', 50.00, 15.00, 'Registro cardiotocográfico no estresante basal', true),
    ('ECO-015', 'Perfil Biofísico Fetal (PBF)', 'Ecografías', 120.00, 40.00, 'Evaluación ecográfica de bienestar + Monitoreo fetal', true),
    ('CON-001', 'Control Prenatal Reenfocado', 'Consultas', 70.00, 25.00, 'Evaluación clínica integral, triaje y carnet perinatal (Obstetra - COP)', true),
    ('CON-002', 'Consulta Obstétrica', 'Consultas', 70.00, 25.00, 'Evaluación de la gestación, bienestar materno y salud sexual (Obstetra - COP)', true),
    ('CON-003', 'Consejería en Planificación Familiar', 'Consultas', 60.00, 20.00, 'Orientación personalizada y prescripción anticonceptiva (Obstetra - COP)', true),
    ('CON-004', 'Consulta Médica Ginecológica Especializada', 'Consultas', 80.00, 30.00, 'Evaluación especializada por gineco-obstetra (Médico - CMP)', true),
    ('CON-005', 'Consulta Ginecológica de Control (Médico)', 'Consultas', 50.00, 20.00, 'Revisión de resultados y seguimiento médico (Médico - CMP)', true),
    ('CON-006', 'Consulta Médica de Fertilidad y Pareja', 'Consultas', 100.00, 35.00, 'Estudio clínico de infertilidad y salud reproductiva (Médico - CMP)', true),
    ('CON-007', 'Evaluación Médica de Climaterio y Menopausia', 'Consultas', 90.00, 30.00, 'Terapia de reemplazo hormonal y salud ósea (Médico - CMP)', true),
    ('CON-008', 'Consulta de Medicina General', 'Consultas', 50.00, 18.00, 'Evaluación clínica integral del adulto y medicina ambulatoria (Médico - CMP)', true),
    ('CON-009', 'Consulta de Control / Lectura de Exámenes (Medicina General)', 'Consultas', 30.00, 10.00, 'Seguimiento médico y evaluación de análisis clínicos (Médico - CMP)', true),
    ('PRC-001', 'Prevención Cáncer Cervical (PAP)', 'Procedimientos', 50.00, 18.00, 'Toma de citología exfoliativa cervical Papanicolaou', true),
    ('PRC-002', 'Colposcopía Digital Diagnóstica', 'Procedimientos', 100.00, 35.00, 'Examen microscópico digital del cuello uterino', true),
    ('PRC-003', 'Pack Preventivo: Colposcopía + PAP', 'Procedimientos', 130.00, 45.00, 'Evaluación combinada de alta precisión para cuello uterino', true),
    ('PRC-004', 'Cauterización / Crioterapia Cervical', 'Procedimientos', 180.00, 60.00, 'Tratamiento de ectropión / heridas de cuello uterino', true),
    ('PRC-005', 'Inserción de DIU T de Cobre', 'Procedimientos', 120.00, 40.00, 'Colocación de dispositivo intrauterino con guía médica', true),
    ('PRC-006', 'Inserción de DIU Hormonal (Mirena/Kyleena)', 'Procedimientos', 250.00, 90.00, 'Colocación especializada de sistema intrauterino', true),
    ('PRC-007', 'Retiro de Dispositivo Intrauterino (DIU)', 'Procedimientos', 70.00, 25.00, 'Extracción segura de DIU o revisión de hilos', true),
    ('PRC-008', 'Inserción de Implante Subdérmico', 'Procedimientos', 150.00, 50.00, 'Colocación de implante anticonceptivo subdérmico', true),
    ('PRC-009', 'Retiro de Implante Subdérmico', 'Procedimientos', 90.00, 30.00, 'Extracción ambulatoria con anestesia local', true),
    ('PRC-010', 'Biopsia de Cérvix / Endometrio', 'Procedimientos', 160.00, 55.00, 'Toma de muestra tisular para estudio anatomopatológico', true),
    ('PRC-011', 'Lavado y Curación Ginecológica', 'Procedimientos', 40.00, 12.00, 'Tratamiento tópico y antisepsia vaginal', true),
    ('LAB-001', 'Descarte Rápido ITS (VIH + Sífilis)', 'Laboratorio', 45.00, 15.00, 'Prueba rápida dual en suero/sangre capilar', true),
    ('LAB-002', 'Prueba de Embarazo Rápida en Sangre (HCG)', 'Laboratorio', 35.00, 10.00, 'Detección temprana de subunidad beta en 15 min', true),
    ('LAB-003', 'Hemoglobina y Hematocrito Rápido', 'Laboratorio', 20.00, 6.00, 'Dosaje instantáneo para descarte de anemia materna', true),
    ('LAB-004', 'Examen Completo de Orina + Tira Reactiva', 'Laboratorio', 25.00, 8.00, 'Descarte de infección urinaria o proteinuria gestacional', true),
    ('LAB-005', 'Cultivo y Antibiograma de Secreción Vaginal', 'Laboratorio', 60.00, 22.00, 'Identificación microbiológica y sensibilidad a antibióticos', true),
    ('LAB-006', 'Grupo Sanguíneo y Factor Rh', 'Laboratorio', 25.00, 7.00, 'Determinación de grupo ABO y compatibilidad Rh', true),
    ('LAB-007', 'Perfil Prenatal Básico Completo', 'Laboratorio', 120.00, 42.00, 'Hemograma, glucosa, grupo, VIH, RPR y orina completa', true)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    categoria = EXCLUDED.categoria,
    precio_venta = EXCLUDED.precio_venta,
    costo_operativo = EXCLUDED.costo_operativo,
    descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo;

-- ----------------------------------------------------------------------------
-- 6. INVENTARIO CLÍNICO Y CONTROL DE STOCK
-- ----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_producto_codigo ON public.producto_inventario(codigo);

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

CREATE INDEX IF NOT EXISTS idx_mov_inv_prod ON public.movimiento_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_mov_inv_fecha ON public.movimiento_inventario(fecha_hora DESC);

-- Semilla oficial de insumos y consumibles de farmacia clínica
INSERT INTO public.producto_inventario (
    codigo, nombre, descripcion, categoria, presentacion, precio_venta, costo_unitario, stock_actual, stock_minimo, activo
) VALUES 
    ('INV-OVU-01', 'Óvulos de Metronidazol + Nistatina', 'Tratamiento antimicótico y antibacteriano de vulvovaginitis mixta y leucorrea', 'Tratamiento Ginecológico', 'Caja x 10 óvulos', 35.00, 15.00, 25, 5, true),
    ('INV-AMP-01', 'Ampolla Anticonceptiva Mensual (Norigynon / Mesigyna)', 'Anticonceptivo inyectable mensual combinado de alta eficacia', 'Anticonceptivos & Hormonales', 'Ampolla 1ml + jeringa descartable', 35.00, 18.00, 30, 8, true),
    ('INV-AMP-03', 'Ampolla Anticonceptiva Trimestral (Medroxiprogesterona 150mg)', 'Inyectable trimestral de progestágeno para lactancia y planificación', 'Anticonceptivos & Hormonales', 'Frasco ampolla 1ml', 40.00, 20.00, 20, 5, true),
    ('INV-JAB-01', 'Jabón Líquido Íntimo Dermocosmético PH 4.5', 'Higiene íntima diaria con ácido láctico y extracto de manzanilla', 'Higiene & Dermocosmética', 'Frasco 250ml con dosificador', 45.00, 22.00, 15, 4, true),
    ('INV-HCG-01', 'Prueba Rápida de Embarazo en Cassette', 'Detección cualitativa de gonadotropina coriónica humana en orina/suero', 'Pruebas Rápidas & Diagnóstico', 'Caja unitaria con gotero', 15.00, 3.50, 50, 10, true),
    ('INV-ITS-01', 'Test Rápido Dual VIH 1/2 y Sífilis', 'Tamizaje serológico rápido en sangre total o suero con resultados en 15 min', 'Pruebas Rápidas & Diagnóstico', 'Dispositivo casete individual', 25.00, 8.00, 40, 10, true),
    ('INV-ESP-01', 'Espéculo Vaginal Descartable Estéril (Talla M)', 'Insumo estéril con cremallera de fijación para examen pélvico y PAP', 'Insumos Clínicos & Procedimientos', 'Unidad sellada al vacío', 8.00, 2.20, 100, 20, true),
    ('INV-GEL-01', 'Gel Conductor Ecográfico Hipoalergénico', 'Gel de transmisión acústica de alta conductividad para transductores', 'Insumos Clínicos & Procedimientos', 'Galón 3.8 Litros', 60.00, 35.00, 6, 2, true),
    ('INV-PAP-01', 'Kit de Citología Cervical Papanicolaou', 'Citocepillo endocervical + espátula de Ayre de madera + lámina portaobjeto', 'Insumos Clínicos & Procedimientos', 'Set individual estéril', 12.00, 3.00, 60, 15, true),
    ('INV-DIU-01', 'Dispositivo Intrauterino T de Cobre 380A', 'Anticonceptivo intrauterino de larga duración estéril con tubo insertor', 'Planificación Familiar', 'Unidad sellada grado médico', 90.00, 35.00, 10, 3, true)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    precio_venta = EXCLUDED.precio_venta,
    costo_unitario = EXCLUDED.costo_unitario,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo;

-- ----------------------------------------------------------------------------
-- 7. CAJA, TURNOS, ARQUEO Y EGRESOS OPERATIVOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.caja_turno (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES public.sede(id) ON DELETE SET NULL,
    cajero_id UUID REFERENCES public.perfil_usuario(id) ON DELETE SET NULL,
    cajero_nombre TEXT NOT NULL DEFAULT 'Operador de Ventanilla',
    fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT now(),
    monto_apertura NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_apertura >= 0),
    fondo_inicial NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (fondo_inicial >= 0),
    fecha_cierre TIMESTAMPTZ,
    monto_cierre_efectivo_declarado NUMERIC(10,2) DEFAULT 0.00,
    total_ingresos_efectivo NUMERIC(10,2) DEFAULT 0.00,
    total_ingresos_digital NUMERIC(10,2) DEFAULT 0.00,
    total_egresos NUMERIC(10,2) DEFAULT 0.00,
    efectivo_neto_esperado NUMERIC(10,2) DEFAULT 0.00,
    diferencia NUMERIC(10,2) DEFAULT 0.00,
    estado TEXT NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
    observaciones TEXT,
    hash_cierre TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caja_turno_site_estado ON public.caja_turno(site_id, estado);
CREATE INDEX IF NOT EXISTS idx_caja_turno_fecha ON public.caja_turno(fecha_apertura DESC);

CREATE TABLE IF NOT EXISTS public.caja_egreso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID REFERENCES public.caja_turno(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sede(id) ON DELETE SET NULL,
    cajero_id UUID REFERENCES public.perfil_usuario(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('GASTO_MENOR', 'VIATICO', 'PAGO_COLABORADOR', 'INSUMOS_MEDICOS', 'OTRO')),
    concepto TEXT NOT NULL,
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    destinatario TEXT NOT NULL,
    aprobado_por TEXT NOT NULL,
    comprobante_ref TEXT DEFAULT 'REC-INTERNO',
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caja_egreso_turno ON public.caja_egreso(turno_id);
CREATE INDEX IF NOT EXISTS idx_caja_egreso_fecha ON public.caja_egreso(fecha_hora DESC);

-- Trigger de inmutabilidad sobre turnos cerrados (Race Condition Prevention)
CREATE OR REPLACE FUNCTION public.f_bloquear_modificacion_turno_cerrado()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado = 'CERRADA' THEN
        RAISE EXCEPTION 'Operación denegada: El turno de caja % ya se encuentra en estado CERRADA y es inmutable.', OLD.id;
    END IF;

    IF NEW.estado = 'CERRADA' AND NEW.fecha_cierre IS NULL THEN
        NEW.fecha_cierre := now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloquear_turno_cerrado ON public.caja_turno;
CREATE TRIGGER trg_bloquear_turno_cerrado
BEFORE UPDATE ON public.caja_turno
FOR EACH ROW
EXECUTE FUNCTION public.f_bloquear_modificacion_turno_cerrado();

-- ----------------------------------------------------------------------------
-- 8. ENCUENTROS CLÍNICOS, ÓRDENES DE PAGO Y COBROS (SPLIT PAYMENT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.encuentro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    site_id UUID NOT NULL REFERENCES public.sede(id) ON DELETE RESTRICT,
    profesional_id UUID REFERENCES public.perfil_usuario(id),
    servicio_solicitado TEXT NOT NULL,
    estado public.estado_encuentro NOT NULL DEFAULT 'EN_ESPERA',
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
    canal_origen TEXT DEFAULT 'VENTANILLA',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_encuentro_site_estado ON public.encuentro(site_id, estado);
CREATE INDEX IF NOT EXISTS idx_encuentro_paciente ON public.encuentro(paciente_id);
CREATE INDEX IF NOT EXISTS idx_encuentro_fecha ON public.encuentro(fecha_hora DESC);

CREATE TABLE IF NOT EXISTS public.orden_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encuentro_id UUID NOT NULL REFERENCES public.encuentro(id) ON DELETE RESTRICT,
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    site_id UUID NOT NULL REFERENCES public.sede(id) ON DELETE RESTRICT,
    servicio TEXT NOT NULL,
    monto NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
    items JSONB DEFAULT '[]'::jsonb,
    estado public.estado_orden NOT NULL DEFAULT 'PENDIENTE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orden_site_estado ON public.orden_pago(site_id, estado);
CREATE INDEX IF NOT EXISTS idx_orden_encuentro ON public.orden_pago(encuentro_id);

CREATE TABLE IF NOT EXISTS public.pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID NOT NULL REFERENCES public.orden_pago(id) ON DELETE RESTRICT,
    cajero_id UUID REFERENCES public.perfil_usuario(id) ON DELETE SET NULL,
    medio_pago public.medio_pago NOT NULL,
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    referencia TEXT,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pago_orden ON public.pago(orden_id);
CREATE INDEX IF NOT EXISTS idx_pago_fecha ON public.pago(fecha_hora DESC);

-- ----------------------------------------------------------------------------
-- 9. CITAS AGENDADAS / REAGENDAMIENTO Y ATRIBUCIÓN
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cita_reagendada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.paciente(id) ON DELETE SET NULL,
    paciente_nombre TEXT NOT NULL,
    telefono TEXT,
    site_id UUID REFERENCES public.sede(id),
    profesional_id UUID REFERENCES public.perfil_usuario(id),
    encuentro_id UUID REFERENCES public.encuentro(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    motivo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'PROGRAMADA' CHECK (estado IN ('PROGRAMADA', 'ATENDIDA', 'CANCELADA', 'REAGENDADA')),
    canal_origen TEXT DEFAULT 'VENTANILLA' CHECK (canal_origen IN ('FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'WHATSAPP_ORGANICO', 'WEB_DIRECTA', 'RECOMENDACION', 'VENTANILLA', 'OTRO')),
    whatsapp_enviado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cita_reagendada_site_fecha ON public.cita_reagendada(site_id, fecha, hora);
CREATE INDEX IF NOT EXISTS idx_cita_reagendada_estado ON public.cita_reagendada(estado);

-- ----------------------------------------------------------------------------
-- 10. HISTORIA CLÍNICA ELECTRÓNICA (HCE) & ADENDAS (NTS N.° 139-MINSA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nota_clinica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encuentro_id UUID NOT NULL UNIQUE REFERENCES public.encuentro(id) ON DELETE RESTRICT,
    paciente_id UUID NOT NULL REFERENCES public.paciente(id) ON DELETE RESTRICT,
    profesional_id UUID REFERENCES public.perfil_usuario(id),
    motivo_consulta TEXT NOT NULL,
    antecedentes TEXT,
    examen_fisico JSONB DEFAULT '{}'::jsonb,
    diagnostico_cie10 JSONB DEFAULT '[]'::jsonb,
    plan_trabajo TEXT,
    tratamiento TEXT,
    imagenes JSONB DEFAULT '[]'::jsonb,
    adendas JSONB DEFAULT '[]'::jsonb,
    cerrada BOOLEAN NOT NULL DEFAULT false,
    fecha_cierre TIMESTAMPTZ,
    hash_firma TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nota_paciente ON public.nota_clinica(paciente_id);
CREATE INDEX IF NOT EXISTS idx_nota_encuentro ON public.nota_clinica(encuentro_id);

-- Trigger de Inmutabilidad Clínica NTS N.° 139-MINSA
CREATE OR REPLACE FUNCTION public.fn_proteger_nota_sellada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.cerrada = true THEN
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
-- 11. AUDITORÍA ZERO-TRUST Y TRAZABILIDAD MÉDICO-LEGAL
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
    usuario_id UUID REFERENCES auth.users(id),
    site_id UUID REFERENCES public.sede(id),
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    entidad_id TEXT,
    detalle JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON public.auditoria(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria(fecha_hora DESC);

-- Triggers de inmutabilidad estricta sobre auditoría y pagos
CREATE OR REPLACE FUNCTION public.f_bloquear_update() 
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% es de registro inmutable: UPDATE no está permitido por normativa médica.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.f_bloquear_delete() 
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% es de registro inmutable: DELETE no está permitido por normativa médica.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_no_upd ON public.auditoria;
CREATE TRIGGER trg_auditoria_no_upd BEFORE UPDATE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION public.f_bloquear_update();

DROP TRIGGER IF EXISTS trg_pago_no_upd ON public.pago;
CREATE TRIGGER trg_pago_no_upd BEFORE UPDATE ON public.pago FOR EACH ROW EXECUTE FUNCTION public.f_bloquear_update();

-- ----------------------------------------------------------------------------
-- 12. RPCs TRANSACCIONALES CANÓNICAS
-- ----------------------------------------------------------------------------

-- 12.1 Tiempo oficial del servidor (NTP / Lima)
CREATE OR REPLACE FUNCTION public.fn_obtener_tiempo_servidor()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT timezone('America/Lima', now());
$$;

-- 12.2 Registro atómico de atención y cobro multiservicio (Carrito + Split Payment)
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

    -- Resumen de servicios para la cola médica
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
        dni, nombres, apellidos, telefono, updated_at
    )
    VALUES (
        v_dni_clean, v_nom_clean, v_ape_clean, TRIM(COALESCE(p_telefono, '000000000')), now()
    )
    ON CONFLICT (dni) DO UPDATE
    SET nombres = EXCLUDED.nombres,
        apellidos = EXCLUDED.apellidos,
        telefono = EXCLUDED.telefono,
        updated_at = now()
    RETURNING id INTO v_paciente_id;

    -- 2. Creación del encuentro clínico
    INSERT INTO public.encuentro (
        paciente_id, site_id, servicio_solicitado, estado, fecha_hora
    )
    VALUES (
        v_paciente_id, p_site_id, v_resumen_servicios, 'EN_ESPERA', now()
    )
    RETURNING id INTO v_encuentro_id;

    -- 3. Creación de la orden de pago
    INSERT INTO public.orden_pago (
        encuentro_id, paciente_id, site_id, servicio, monto, items, estado
    )
    VALUES (
        v_encuentro_id, v_paciente_id, p_site_id, v_resumen_servicios, p_monto_total, p_items, 'PAGADO'
    )
    RETURNING id INTO v_orden_id;

    IF v_cajero_id IS NULL THEN
        SELECT id INTO v_cajero_id FROM public.perfil_usuario WHERE email = 'admin@lasmellizasperu.com' LIMIT 1;
    END IF;

    -- 4. Registrar pagos (Split Payment)
    FOR v_pago IN SELECT * FROM jsonb_array_elements(p_pagos)
    LOOP
        BEGIN
            v_medio_pago_val := (v_pago->>'medio')::public.medio_pago;
        EXCEPTION WHEN OTHERS THEN
            v_medio_pago_val := 'EFECTIVO'::public.medio_pago;
        END;

        INSERT INTO public.pago (
            orden_id, cajero_id, medio_pago, monto, referencia, fecha_hora
        )
        VALUES (
            v_orden_id, v_cajero_id, v_medio_pago_val, (v_pago->>'monto')::NUMERIC, COALESCE(v_pago->>'referencia', 'SPLIT-VENTANILLA'), now()
        );
    END LOOP;

    -- 5. Disminución atómica de stock de insumos clínicos
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
                        SET stock_actual = v_stock_post, updated_at = now()
                        WHERE id = v_prod_id;

                        INSERT INTO public.movimiento_inventario (
                            producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id, usuario_nombre, site_id, fecha_hora
                        )
                        VALUES (
                            v_prod_id, 'SALIDA_VENTA', v_cant, v_stock_ant, v_stock_post, 'Dispensación en Admisión/Caja (Venta en Mostrador)', v_cajero_id, COALESCE(p_usuario_nombre, 'Cajero Ventanilla'), p_site_id, now()
                        );
                    END IF;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END LOOP;

    -- 6. Auditoría inmutable
    INSERT INTO public.auditoria (
        usuario_id, site_id, accion, entidad, entidad_id, detalle
    )
    VALUES (
        v_cajero_id, p_site_id, 'COBRO_MULTISERVICIOS_SPLIT', 'encuentro', v_encuentro_id::text,
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

-- 12.3 Registro de movimientos y dispensación de inventario
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
    IF v_usuario_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.perfil_usuario WHERE id = v_usuario_id) THEN
        v_usuario_id := NULL;
    END IF;

    IF p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad del movimiento debe ser un número entero positivo mayor a cero.';
    END IF;

    SELECT stock_actual, nombre INTO v_stock_actual, v_prod_nombre
    FROM public.producto_inventario
    WHERE id = p_producto_id
    FOR UPDATE;

    IF v_stock_actual IS NULL THEN
        RAISE EXCEPTION 'El producto solicitado no existe en el catálogo de inventario.';
    END IF;

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

    UPDATE public.producto_inventario
    SET stock_actual = v_stock_nuevo, updated_at = now()
    WHERE id = p_producto_id;

    INSERT INTO public.movimiento_inventario (
        producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id, usuario_nombre, site_id, fecha_hora
    ) VALUES (
        p_producto_id, p_tipo, p_cantidad, v_stock_actual, v_stock_nuevo, COALESCE(p_motivo, 'Dispensación operativa en ventanilla/consultorio'), v_usuario_id, COALESCE(p_usuario_nombre, 'Operador de Turno'), p_site_id, now()
    );

    INSERT INTO public.auditoria (
        usuario_id, site_id, accion, entidad, entidad_id, detalle
    ) VALUES (
        v_usuario_id, p_site_id, 'DISPENSACION_INVENTARIO', 'producto_inventario', p_producto_id::text,
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

-- 12.4 Incorporación de adendas clínicas normativas (NTS N.° 139-MINSA)
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
    IF v_usuario_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.perfil_usuario WHERE id = v_usuario_id) THEN
        v_usuario_id := NULL;
    END IF;

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

    INSERT INTO public.auditoria (
        usuario_id, accion, entidad, entidad_id, detalle
    ) VALUES (
        v_usuario_id, 'INCORPORACION_ADENDA_HCE', 'nota_clinica', p_encuentro_id::text,
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

-- 12.5 Reprogramación atómica de citas y retiro de sala de espera (Upsert & Unicidad)
CREATE OR REPLACE FUNCTION public.reprogramar_cita_y_retirar_espera(
    p_encuentro_id UUID DEFAULT NULL,
    p_paciente_nombre TEXT DEFAULT NULL,
    p_telefono TEXT DEFAULT NULL,
    p_fecha DATE DEFAULT NULL,
    p_hora TIME DEFAULT '09:00',
    p_motivo TEXT DEFAULT 'Cita de seguimiento',
    p_site_id UUID DEFAULT NULL,
    p_usuario_nombre TEXT DEFAULT 'Ventanilla'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_encuentro_id UUID := p_encuentro_id;
    v_cita_id UUID;
    v_site_id UUID := p_site_id;
    v_existing_cita_id UUID;
    v_accion TEXT := 'CREADA';
BEGIN
    IF p_fecha IS NULL THEN
        RAISE EXCEPTION 'La fecha de la cita es obligatoria.';
    END IF;

    IF p_paciente_nombre IS NULL OR length(trim(p_paciente_nombre)) = 0 THEN
        RAISE EXCEPTION 'El nombre de la paciente es obligatorio.';
    END IF;

    IF v_site_id IS NULL THEN
        SELECT id INTO v_site_id FROM public.sede LIMIT 1;
    END IF;

    -- Cancelar encuentro si está en espera
    IF v_target_encuentro_id IS NULL THEN
        SELECT e.id INTO v_target_encuentro_id
        FROM public.encuentro e
        LEFT JOIN public.paciente p ON p.id = e.paciente_id
        WHERE e.site_id = v_site_id
          AND e.estado = 'EN_ESPERA'
          AND (
              LOWER(TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))) = LOWER(TRIM(p_paciente_nombre))
              OR LOWER(TRIM(COALESCE(p.apellidos, '') || ' ' || COALESCE(p.nombres, ''))) = LOWER(TRIM(p_paciente_nombre))
              OR LOWER(TRIM(p_paciente_nombre)) LIKE '%' || LOWER(TRIM(COALESCE(p.apellidos, 'x-x'))) || '%'
              OR LOWER(TRIM(p_paciente_nombre)) LIKE '%' || LOWER(TRIM(COALESCE(p.nombres, 'x-x'))) || '%'
          )
        ORDER BY e.fecha_hora DESC
        LIMIT 1;
    END IF;

    IF v_target_encuentro_id IS NOT NULL THEN
        UPDATE public.encuentro
        SET estado = 'CANCELADO', updated_at = now()
        WHERE id = v_target_encuentro_id;
    END IF;

    -- Unicidad estricta en citas pendientes
    SELECT id INTO v_existing_cita_id
    FROM public.cita_reagendada
    WHERE estado = 'PROGRAMADA'
      AND (
          (v_target_encuentro_id IS NOT NULL AND encuentro_id = v_target_encuentro_id)
          OR LOWER(TRIM(paciente_nombre)) = LOWER(TRIM(p_paciente_nombre))
      )
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_cita_id IS NOT NULL THEN
        UPDATE public.cita_reagendada
        SET telefono = COALESCE(TRIM(p_telefono), telefono),
            fecha = p_fecha,
            hora = p_hora,
            motivo = TRIM(p_motivo),
            site_id = v_site_id,
            encuentro_id = COALESCE(v_target_encuentro_id, encuentro_id),
            updated_at = now()
        WHERE id = v_existing_cita_id;

        v_cita_id := v_existing_cita_id;
        v_accion := 'ACTUALIZADA';

        DELETE FROM public.cita_reagendada
        WHERE estado = 'PROGRAMADA'
          AND LOWER(TRIM(paciente_nombre)) = LOWER(TRIM(p_paciente_nombre))
          AND id <> v_existing_cita_id;
    ELSE
        INSERT INTO public.cita_reagendada (
            paciente_nombre, telefono, fecha, hora, motivo, site_id, estado, encuentro_id, created_at, updated_at
        )
        VALUES (
            TRIM(p_paciente_nombre), TRIM(p_telefono), p_fecha, p_hora, TRIM(p_motivo), v_site_id, 'PROGRAMADA', v_target_encuentro_id, now(), now()
        )
        RETURNING id INTO v_cita_id;
        v_accion := 'CREADA';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cita_id', v_cita_id,
        'encuentro_id_cancelado', v_target_encuentro_id,
        'accion', v_accion
    );
END;
$$;

-- 12.6 Reversión o transición de estado clínico (HCE)
CREATE OR REPLACE FUNCTION public.revertir_estado_encuentro(
    p_encuentro_id UUID,
    p_nuevo_estado public.estado_encuentro,
    p_motivo TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_rol public.rol_usuario;
    v_user_id UUID := auth.uid();
    v_estado_actual public.estado_encuentro;
    v_site_id UUID;
BEGIN
    v_rol := public.obtener_mi_rol_estricto();

    IF v_rol NOT IN ('PROFESIONAL', 'SUPERVISION', 'ADMIN') THEN
        RAISE EXCEPTION 'Operación no autorizada: Solo el personal médico o supervisores pueden alterar o revertir estados.';
    END IF;

    IF length(TRIM(COALESCE(p_motivo, ''))) < 5 THEN
        RAISE EXCEPTION 'Debe proporcionar una justificación u observación obligatoria de al menos 5 caracteres.';
    END IF;

    SELECT estado, site_id INTO v_estado_actual, v_site_id
    FROM public.encuentro 
    WHERE id = p_encuentro_id;

    IF v_estado_actual IS NULL THEN
        RAISE EXCEPTION 'Encuentro no encontrado.';
    END IF;

    UPDATE public.encuentro
    SET estado = p_nuevo_estado, updated_at = now()
    WHERE id = p_encuentro_id;

    INSERT INTO public.auditoria (
        usuario_id, site_id, accion, entidad, entidad_id, detalle
    )
    VALUES (
        v_user_id, v_site_id, 'REVERSION_ESTADO_ENCUENTRO', 'encuentro', p_encuentro_id::text,
        jsonb_build_object(
            'estado_anterior', v_estado_actual,
            'nuevo_estado', p_nuevo_estado,
            'motivo', p_motivo
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'encuentro_id', p_encuentro_id,
        'estado_nuevo', p_nuevo_estado
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12.7 Aprovisionamiento seguro de colaboradores clínicos (auth.users + public.perfil_usuario)
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
    
    SELECT id INTO v_user_id FROM auth.users WHERE email = LOWER(TRIM(p_email)) LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('nombre_completo', p_nombre, 'rol', p_rol::text),
            updated_at = now()
        WHERE id = v_user_id;
    ELSE
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            confirmation_token, recovery_token, email_change, email_change_token_new,
            email_change_token_current, phone_change, phone_change_token, reauthentication_token,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            LOWER(TRIM(p_email)), v_encrypted_pw, now(), '', '', '', '', '', '', '', '',
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('nombre_completo', p_nombre, 'rol', p_rol::text),
            now(), now()
        )
        RETURNING id INTO v_user_id;
    END IF;

    INSERT INTO public.perfil_usuario (
        id, email, nombre_completo, rol, site_id, colegiatura, especialidad, activo
    )
    VALUES (
        v_user_id, LOWER(TRIM(p_email)), TRIM(p_nombre), p_rol, p_site_id, TRIM(p_colegiatura), TRIM(p_especialidad), true
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

-- 12.8 Actualización y sincronización de perfiles
CREATE OR REPLACE FUNCTION public.actualizar_perfil_colaborador(
    p_id UUID,
    p_nombre TEXT,
    p_rol public.rol_usuario,
    p_site_id UUID,
    p_colegiatura TEXT DEFAULT NULL,
    p_especialidad TEXT DEFAULT NULL,
    p_activo BOOLEAN DEFAULT true,
    p_email TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_clean_email TEXT := LOWER(TRIM(p_email));
BEGIN
    UPDATE public.perfil_usuario
    SET email = COALESCE(v_clean_email, email),
        nombre_completo = TRIM(p_nombre),
        rol = p_rol,
        site_id = p_site_id,
        colegiatura = NULLIF(TRIM(p_colegiatura), ''),
        especialidad = NULLIF(TRIM(p_especialidad), ''),
        activo = p_activo,
        updated_at = now()
    WHERE id = p_id;

    IF v_clean_email IS NOT NULL THEN
        UPDATE auth.users
        SET email = v_clean_email,
            raw_user_meta_data = jsonb_build_object('nombre_completo', TRIM(p_nombre), 'rol', p_rol::text),
            updated_at = now()
        WHERE id = p_id;
    ELSE
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object('nombre_completo', TRIM(p_nombre), 'rol', p_rol::text),
            updated_at = now()
        WHERE id = p_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12.9 Eliminación definitiva de usuarios colaboradores
CREATE OR REPLACE FUNCTION public.eliminar_usuario_clinico(
    p_id UUID DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_target_id UUID := p_id;
    v_target_email TEXT := LOWER(TRIM(p_email));
BEGIN
    IF v_target_email = 'admin@lasmellizasperu.com' THEN
        RAISE EXCEPTION 'Operación denegada: No es posible eliminar la cuenta principal de Administración General.';
    END IF;

    IF v_target_id IS NULL AND v_target_email IS NOT NULL THEN
        SELECT id INTO v_target_id FROM public.perfil_usuario WHERE email = v_target_email LIMIT 1;
        IF v_target_id IS NULL THEN
            SELECT id INTO v_target_id FROM auth.users WHERE email = v_target_email LIMIT 1;
        END IF;
    END IF;

    IF v_target_id IS NOT NULL THEN
        UPDATE public.cita_reagendada SET profesional_id = NULL WHERE profesional_id = v_target_id;
        DELETE FROM public.perfil_usuario WHERE id = v_target_id;
        DELETE FROM auth.users WHERE id = v_target_id;
    END IF;

    IF v_target_email IS NOT NULL THEN
        DELETE FROM public.perfil_usuario WHERE email = v_target_email;
        DELETE FROM auth.users WHERE email = v_target_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 13. APROVISIONAMIENTO INICIAL: PADRÓN OFICIAL DE LAS 15 CUENTAS + ADMIN
-- Contraseña unificada inicial: Mellizas#2026!
-- Contraseña Administrador General: Admin#Mellizas2026!
-- Sedes:
-- Independencia: b0000000-0000-0000-0000-000000000001
-- Vivanco:       b0000000-0000-0000-0000-000000000002
-- ----------------------------------------------------------------------------

-- 0. ADMINISTRACIÓN GENERAL
SELECT public.crear_usuario_clinico('admin@lasmellizasperu.com', 'Admin#Mellizas2026!', 'Dirección Médica & Gestión', 'ADMIN', NULL, 'CMP 99881', 'Dirección Médica');

-- 1 a 6: SEDE INDEPENDENCIA (PROFESIONALES)
SELECT public.crear_usuario_clinico('obstetra.inv1@lasmellizasperu.com', 'Mellizas#2026!', 'Obstetra Independencia 1', 'PROFESIONAL', 'b0000000-0000-0000-0000-000000000001'::uuid, 'COP 10201', 'Obstetricia Integral');
SELECT public.crear_usuario_clinico('medico.inv2@lasmellizasperu.com', 'Mellizas#2026!', 'Médico Independencia 2', 'PROFESIONAL', 'b0000000-0000-0000-0000-000000000001'::uuid, 'CMP 45120 / RNE 19022', 'Ginecología y Obstetricia');
SELECT public.crear_usuario_clinico('medico.inv1@lasmellizasperu.com', 'Mellizas#2026!', 'Médico Independencia 1', 'PROFESIONAL', 'b0000000-0000-0000-0000-000000000001'::uuid, 'CMP 48902', 'Medicina Fetal y Ecografía');
SELECT public.crear_usuario_clinico('medico.bar@lasmellizasperu.com', 'Mellizas#2026!', 'Médico Bar Independencia', 'PROFESIONAL', 'b0000000-0000-0000-0000-000000000001'::uuid, 'CMP 52310 / RNE 22104', 'Ecografía Morfológica y Genética');
SELECT public.crear_usuario_clinico('medico.cap@lasmellizasperu.com', 'Mellizas#2026!', 'Médico Cap Independencia', 'PROFESIONAL', 'b0000000-0000-0000-0000-000000000001'::uuid, 'CMP 50981', 'Ginecología y Obstetricia');
SELECT public.crear_usuario_clinico('medico.pmg@lasmellizasperu.com', 'Mellizas#2026!', 'Médico PMG Independencia', 'PROFESIONAL', 'b0000000-0000-0000-0000-000000000001'::uuid, 'CMP 47820 / RNE 18451', 'Obstetricia de Alto Riesgo');

-- 7 a 10: SEDE VIVANCO (PROFESIONALES)
SELECT public.crear_usuario_clinico('obstetra.yrp@lasmellizasperu.com', 'Mellizas#2026!', 'Obstetra YRP Vivanco', 'PROFESIONAL', 'b0000000-0000-0000-0000-000000000002'::uuid, 'COP 11980', 'Control Prenatal Reenfocado');
SELECT public.crear_usuario_clinico('obstetra.yen@lasmellizasperu.com', 'Mellizas#2026!', 'Obstetra YEN Vivanco', 'PROFESIONAL', 'b0000000-0000-0000-0000-000000000002'::uuid, 'COP 12431', 'Ecografía Obstétrica');
SELECT public.crear_usuario_clinico('obstetra.lis@lasmellizasperu.com', 'Mellizas#2026!', 'Obstetra LIS Vivanco', 'PROFESIONAL', 'b0000000-0000-0000-0000-000000000002'::uuid, 'COP 13102', 'Monitoreo Fetal y Psicoprofilaxis');
SELECT public.crear_usuario_clinico('obstetra.duo@lasmellizasperu.com', 'Mellizas#2026!', 'Obstetra DUO Vivanco', 'PROFESIONAL', 'b0000000-0000-0000-0000-000000000002'::uuid, 'COP 14210', 'Salud Reproductiva');

-- 11 a 14: ADMISIÓN & CAJA
SELECT public.crear_usuario_clinico('admision.viv2@lasmellizasperu.com', 'Mellizas#2026!', 'Admisión & Caja Vivanco 2', 'RECEPCION_CAJA', 'b0000000-0000-0000-0000-000000000002'::uuid, NULL, 'Admisión y Cobranzas');
SELECT public.crear_usuario_clinico('admision.ind2@lasmellizasperu.com', 'Mellizas#2026!', 'Admisión & Caja Independencia 2', 'RECEPCION_CAJA', 'b0000000-0000-0000-0000-000000000001'::uuid, NULL, 'Admisión y Cobranzas');
SELECT public.crear_usuario_clinico('admision.viv1@lasmellizasperu.com', 'Mellizas#2026!', 'Admisión & Caja Vivanco 1', 'RECEPCION_CAJA', 'b0000000-0000-0000-0000-000000000002'::uuid, NULL, 'Admisión y Cobranzas');
SELECT public.crear_usuario_clinico('admision.vivanco2@lasmellizasperu.com', 'Mellizas#2026!', 'Admisión & Caja Vivanco 2 Canónica', 'RECEPCION_CAJA', 'b0000000-0000-0000-0000-000000000002'::uuid, NULL, 'Admisión y Cobranzas');

-- 15: PROFESIONAL ADICIONAL INDEPENDENCIA
SELECT public.crear_usuario_clinico('obstetra.inb2@lasmellizasperu.com', 'Mellizas#2026!', 'Obstetra INB Independencia', 'PROFESIONAL', 'b0000000-0000-0000-0000-000000000001'::uuid, 'COP 15120', 'Obstetricia Integral');

-- ----------------------------------------------------------------------------
-- 14. BUCKET SUPABASE STORAGE PARA APOYO DIAGNÓSTICO (ECOGRAFÍAS)
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
-- 15. SUPABASE REALTIME MULTICANAL
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.encuentro; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orden_pago; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cita_reagendada; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.caja_turno; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.caja_egreso; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.nota_clinica; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
END $$;

-- ----------------------------------------------------------------------------
-- 16. SEGURIDAD ZERO-TRUST (ROW LEVEL SECURITY - RLS) Y PRIVILEGIOS
-- ----------------------------------------------------------------------------
ALTER TABLE public.organizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sede ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimiento_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_egreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encuentro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cita_reagendada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nota_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso Institucional y Operativo
CREATE POLICY "organizacion_lectura_autenticada" ON public.organizacion FOR SELECT TO authenticated USING (true);
CREATE POLICY "sede_lectura_autenticada" ON public.sede FOR SELECT TO authenticated USING (true);
CREATE POLICY "site_lectura_autenticada" ON public.site FOR SELECT TO authenticated USING (true);

CREATE POLICY "perfil_lectura_autenticada" ON public.perfil_usuario FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfil_modificacion_propia_o_admin" ON public.perfil_usuario FOR UPDATE TO authenticated USING (id = auth.uid() OR public.obtener_mi_rol_estricto() = 'ADMIN');
CREATE POLICY "perfil_eliminacion_admin" ON public.perfil_usuario FOR DELETE TO authenticated USING (public.obtener_mi_rol_estricto() = 'ADMIN');

CREATE POLICY "paciente_gestion_autenticada" ON public.paciente FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "catalogo_gestion_autenticada" ON public.catalogo_servicio FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inventario_gestion_autenticada" ON public.producto_inventario FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "movimientos_gestion_autenticada" ON public.movimiento_inventario FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "caja_turno_gestion_autenticada" ON public.caja_turno FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "caja_egreso_gestion_autenticada" ON public.caja_egreso FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "encuentro_gestion_autenticada" ON public.encuentro FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "orden_pago_gestion_autenticada" ON public.orden_pago FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pago_gestion_autenticada" ON public.pago FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "citas_gestion_autenticada" ON public.cita_reagendada FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "nota_clinica_gestion_autenticada" ON public.nota_clinica FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auditoria_insercion_autenticada" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auditoria_lectura_autenticada" ON public.auditoria FOR SELECT TO authenticated USING (true);

-- Permisos storage
CREATE POLICY "ecografias_lectura_publica" ON storage.objects FOR SELECT USING (bucket_id = 'ecografias');
CREATE POLICY "ecografias_insercion_autenticada" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ecografias');
CREATE POLICY "ecografias_actualizacion_autenticada" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'ecografias');

-- Otorgamiento de privilegios de ejecución a las RPCs
GRANT EXECUTE ON FUNCTION public.fn_obtener_tiempo_servidor TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.registrar_atencion_y_cobro_multiservicio TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.registrar_movimiento_inventario TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.incorporar_adenda_clinica TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reprogramar_cita_y_retirar_espera TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.revertir_estado_encuentro TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.actualizar_perfil_colaborador TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.eliminar_usuario_clinico TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crear_usuario_clinico TO authenticated, service_role;

-- ============================================================================
-- FIN DEL SCRIPT MAESTRO CANÓNICO: PIZARRA LIMPIA 2026
-- TOTAL TABLAS: 14 + SEDES (INDEPENDENCIA & VIVANCO)
-- PACIENTES INICIALES: 0 (PIZARRA CERO ABSOLUTA LISTA PARA PRODUCCIÓN)
-- ============================================================================
