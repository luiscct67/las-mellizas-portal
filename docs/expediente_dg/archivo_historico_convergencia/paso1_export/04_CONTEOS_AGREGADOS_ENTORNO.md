# PASO 1 (DG-001-C) — CONTEOS AGREGADOS POR TABLA RELEVANTE

**Entorno:** Supabase Project `oepctyamffehjhhuxiqo`  
**Región:** `us-east-1`  
**Fecha de corte:** 21 de Septiembre de 2026  

| Tabla Relevante | Registros Estimados / Actuales | Tipo de Datos | Observaciones |
| :--- | :--- | :--- | :--- |
| **`organizacion`** | 1 | Semilla Institucional | Las Mellizas Perú S.A.C. (RUC 20611827335) |
| **`sede`** | 2 | Semilla Institucional | Sede Independencia (`AYAC-IND`) y Sede Vivanco (`AYAC-VIV`) |
| **`perfil_usuario`** | 15 | Cuentas Preproducción | Médicos, obstetras, cajeras y administradores |
| **`paciente`** | 24 | Sintéticos / Pruebas E2E | Datos de prueba para validación de DNI y flujo |
| **`encuentro`** | 31 | Sintéticos / Pruebas E2E | Encuentros de prueba en estados EN_ESPERA, ATENDIDO |
| **`orden_pago`** | 28 | Sintéticos / Pruebas E2E | Órdenes asociadas a carrito multiservicio |
| **`pago`** | 35 | Sintéticos / Pruebas E2E | Pagos únicos y fraccionados (Efectivo/POS/Yape) |
| **`caja_turno`** | 8 | Pruebas de Ventanilla | Sesiones de apertura, egresos y arqueos ciegos |
| **`caja_egreso`** | 6 | Pruebas de Ventanilla | Vales de egreso menor y pagos a colaboradores |
| **`producto_inventario`**| 12 | Catálogo Base | Insumos médicos (guantes, espéculos, gel ecográfico) |
| **`movimiento_inventario`**| 18 | Pruebas de Kárdex | Salidas por venta y dispensación clínica |
| **`cita_reagendada`** | 5 | Pruebas de Agenda | Citas reprogramadas con validación de unicidad |
| **`nota_clinica`** | 14 | Pruebas Asistenciales | Historias clínicas obstétricas con sellado SHA-256 |
| **`adenda`** | 4 | Pruebas Asistenciales | Adendas médicas append-only |

*Nota institucional:* La totalidad de pacientes y transacciones existentes corresponden a pruebas de verificación funcional. Se requiere vaciado controlado previo a la ingesta del padrón maestro definitivo.
