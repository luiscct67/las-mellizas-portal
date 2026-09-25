# GUÍAS RÁPIDAS OPERATIVAS ("ONE-PAGERS")
## Manuales de Puesto de Trabajo Plastificados para Recepción y Consultorio

**Proyecto:** Portal Clínico Las Mellizas Perú S.A.C.  
**Destinatarios:** Personal de Recepción/Caja y Personal de Salud Obstétrico/Ecográfico  
**Sedes:** Independencia y Vivanco  
**Fecha de Emisión:** 22 de septiembre de 2026  

---

# GUÍA A: RECEPCIÓN Y CAJA (VENTANILLA)
*Imprimir en 1 sola cara y colocar junto a la impresora térmica POS de 80mm.*

### 1. Inicio de Turno (Apertura de Caja)
1. Ingrese a `https://portal.lasmellizasperu.com/login` con su correo institucional `@lasmellizasperu.com`.
2. Diríjase a **Admisión & Caja**.
3. Haga clic en **"Abrir Turno de Caja"**, declare el fondo sencillo en efectivo disponible en gaveta (ej. S/ 50.00 o S/ 100.00) y confirme.

### 2. Admisión y Cobro de Paciente (Tiempo estimado: < 60 segundos)
1. **Buscar / Registrar Paciente:** Digite el DNI de la paciente. Si es recurrente, sus datos se autocompletarán. Si es nueva, ingrese Apellidos, Nombres y Celular (WhatsApp).
2. **Seleccionar Servicio o Producto:** Busque el servicio ecográfico o insumo en el catálogo y haga clic en **"+ Agregar"**.
3. **Modalidad de Pago:**
   - **Efectivo:** Digite el monto entregado por la paciente o pulse el botón del billete rápido (`Exacto`, `S/ 50`, `S/ 100`, `S/ 200`). El sistema calcula automáticamente el vuelto exacto a entregar.
   - **Yape / Plin / Tarjeta:** Ingrese el número de operación o referencia del voucher.
   - **Pago Mixto:** Si paga parte en efectivo y parte con Yape, active **"Pago Mixto / Fraccionado"** y desglose los montos.
4. **Confirmar:** Haga clic en **"Confirmar Admisión & Emitir Ticket"**.
5. Se abrirá la ventana de impresión térmica de 80mm. Entregue el ticket a la paciente e indíquele que tome asiento en sala de espera.

### 3. Monitoreo de la Cola en Tiempo Real
- `EN ESPERA` (Ámbar pulsante): La paciente está en sala esperando ser llamada por consultorio.
- `EN ATENCION` (Azul): La obstetra/médico ha iniciado la atención en el consultorio.
- `ATENDIDO` (Verde): La consulta ha finalizado con éxito.
- **Reimpresión de Ticket:** Si la paciente extravía su comprobante, pulse el botón **"Ticket"** en la fila de la paciente.

### 4. Cierre Formal y Arqueo de Caja (Fin de Turno)
1. Al terminar la jornada, haga clic en el botón superior **"Arqueo y Cierre de Caja"**.
2. **Arqueo Físico:** Cuente el efectivo físico real que tiene en gaveta y digítelo en el casillero correspondiente.
3. El sistema contrastará el dinero físico contra las ventas del sistema, calculando si el arqueo es **"Exacto Cuadrado"**, con sobrante o con faltante.
4. Pulse **"Generar Acta de Cierre e Imprimir"** para obtener el comprobante térmico de cierre firmado para administración.

---

# GUÍA B: CONSULTORIO OBSTÉTRICO & ECOGRÁFICO (HCE)
*Imprimir en 1 sola cara y colocar junto al ecógrafo / monitor de consultorio.*

### 1. Llamar Paciente a Consulta
1. Ingrese a **Consultorio HCE**.
2. En el panel izquierdo verá la cola de pacientes admitidas hoy en su sede.
3. Haga clic en la paciente en estado `EN ESPERA`. La paciente pasará automáticamente a estado `EN ATENCIÓN`.
4. El sistema cargará el expediente clínico completamente limpio y desacoplado.

### 2. Triaje y Cálculo Obstétrico Automático
1. **Funciones Vitales:** Registre Presión Arterial (PA) y Frecuencia Cardíaca (FC).
   - *Alerta MEOWS:* Si la PA es ≥ 140/90 mmHg, el sistema mostrará una advertencia roja para descartar preeclampsia.
2. **Calculadora Obstétrica Naegele:**
   - Ingrese la fecha de la **F.U.R.** (Fecha de Última Regla).
   - De inmediato, el sistema calculará la **F.P.P.** (Fecha Probable de Parto a 280 días) y las **Semanas y Días de Gestación (EG)** exactas al día de hoy.
   - Si la paciente cuenta con ecografía del primer trimestre, puede ajustar las semanas de forma manual.

### 3. Registro Clínico y Macros Rápidas
1. **Examen Físico / Ecografía:** Puede redactar libremente o hacer clic en los botones de macros:
   - `+ Eco Obstétrica Normal`: Rellena feto único, biometría, LCF rítmicos y líquido amniótico normal.
   - `+ Gineco Normal`: Rellena examen físico y especuloscopía normal.
2. **Diagnósticos CIE-10:** Digite en el buscador predictivo el término o código (ej. `Z34`, `embarazo`, `ecografía`) y haga clic para agregarlo al acto médico.
3. **Plan Terapéutico:** Utilice la macro `+ Control Prenatal` o redacte la prescripción en Denominación Común Internacional (DCI).
4. **Imágenes Ecográficas:** Si desea adjuntar capturas del ecógrafo, haga clic en **"+ Adjuntar Archivo"**.

### 4. Sellado Criptográfico SHA-256 (Acto Médico Inmutable)
1. Una vez revisada la información, haga clic en el botón verde **"Guardar y Sellar Historia Clínica"**.
2. El sistema generará el **Sello Digital SHA-256 inmutable** (NTS N.° 139-MINSA / Ley N.º 26842).
3. **Bloque Primario Cerrado:** A partir de este momento, los campos originales quedan protegidos contra borrado o alteración. Si requiere agregar una nota médica posterior, pulse **"+ Incorporar Adenda Inmutable"**.
4. La paciente queda registrada como `ATENDIDO` y el turno concluye satisfactoriamente.
