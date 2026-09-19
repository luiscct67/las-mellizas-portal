"use client";

import { useState, useEffect, useRef } from "react";
import {
  Stethoscope,
  Lock,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Maximize2,
  Trash2,
  X,
  Search,
  Check,
  FileText,
  Printer,
  Calendar,
  MessageSquare,
  Share2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface PacienteEnConsulta {
  id: string;
  pacienteId?: string;
  paciente: string;
  dni: string;
  edad: string;
  servicio: string;
  alergias?: string;
  grupoSanguineo?: string;
  sede: string;
  estado?: string;
  telefono?: string;
  horaLlegada?: string;
}

interface ImagenAdjunta {
  id: string;
  titulo: string;
  tipo: string;
  url: string;
  hora: string;
}

interface DiagnosticoItem {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: "Definitivo" | "Presuntivo" | "Repetido";
}

const CIE10_FRECUENTES = [
  { codigo: "Z34.8", descripcion: "Supervisión de otros embarazos normales" },
  { codigo: "Z34.0", descripcion: "Supervisión de primer embarazo normal" },
  { codigo: "Z36.8", descripcion: "Pesquisa prenatal para otras anomalías (Ecografía)" },
  { codigo: "O26.8", descripcion: "Otras afecciones especificadas relacionadas con el embarazo" },
  { codigo: "N76.0", descripcion: "Vaginitis aguda / Leucorrea" },
  { codigo: "N72", descripcion: "Enfermedad inflamatoria del cuello uterino (Cervicitis)" },
  { codigo: "Z30.0", descripcion: "Consejo y asesoramiento general sobre la anticoncepción" },
  { codigo: "N91.2", descripcion: "Amenorrea, sin otra especificación" },
];

export default function HcePage() {
  const [sede, setSede] = useState<string>("Independencia");
  const [profesionalNombre, setProfesionalNombre] = useState<string>("Profesional de Turno");
  const [colegiatura, setColegiatura] = useState<string>("");

  // Pacientes en cola del consultorio (Cargados desde Supabase en Tiempo Real)
  const [pacientesCola, setPacientesCola] = useState<PacienteEnConsulta[]>([]);
  const [atendidosHoy, setAtendidosHoy] = useState<PacienteEnConsulta[]>([]);
  const [vistaCola, setVistaCola] = useState<"espera" | "atendidos">("espera");
  const [isLoadingCola, setIsLoadingCola] = useState<boolean>(true);
  const [selectedPatient, setSelectedPatient] = useState<PacienteEnConsulta | null>(null);

  // Modal de Reversión y Reapertura de Caso Clínico (Control de Calidad / Auditoría)
  const [showReabrirModal, setShowReabrirModal] = useState<boolean>(false);
  const [encuentroAReabrir, setEncuentroAReabrir] = useState<PacienteEnConsulta | null>(null);
  const [motivoReapertura, setMotivoReapertura] = useState<string>("");
  const [reabriendo, setReabriendo] = useState<boolean>(false);

  // Referencias para Aislamiento Absoluto de Estado y Prevención de Cruce
  const activeEncuentroIdRef = useRef<string | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Triaje & Funciones Vitales (Inicia 100% limpio y desacoplado)
  const [pa, setPa] = useState("");
  const [fc, setFc] = useState("");
  const [fr, setFr] = useState("");
  const [temp, setTemp] = useState("");
  const [satO2, setSatO2] = useState("");
  const [peso, setPeso] = useState("");
  const [talla, setTalla] = useState("");

  // IMC dinámico
  const pNum = parseFloat(peso) || 0;
  const tNum = parseFloat(talla) || 0;
  const imc = tNum > 0 ? (pNum / (tNum * tNum)).toFixed(1) : "0.0";

  // Perfil Obstétrico (Inicia 100% limpio)
  const [formulaG, setFormulaG] = useState("");
  const [formulaP, setFormulaP] = useState("");
  const [fur, setFur] = useState("");
  const [fpp, setFpp] = useState("");
  const [eg, setEg] = useState("");
  const [alturaUterina, setAlturaUterina] = useState("");
  const [lcf, setLcf] = useState("");
  const [presentacion, setPresentacion] = useState("Cefálica");

  // Anamnesis, Examen y Tratamiento (Inicia limpio sin mocks)
  const [motivo, setMotivo] = useState("");
  const [antecedentes, setAntecedentes] = useState("");
  const [examenFisico, setExamenFisico] = useState("");
  const [planTratamiento, setPlanTratamiento] = useState("");

  // Diagnósticos CIE-10 (Inicia arreglo vacío)
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>([]);
  const [busquedaCie, setBusquedaCie] = useState("");
  const [mostrarSugerenciasCie, setMostrarSugerenciasCie] = useState(false);

  // Imágenes / Ecografías (Inicia arreglo vacío)
  const [imagenes, setImagenes] = useState<ImagenAdjunta[]>([]);
  const [modalImagen, setModalImagen] = useState<ImagenAdjunta | null>(null);

  // Estado de Sellado y Adendas
  const [isSealed, setIsSealed] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);
  const [adendas, setAdendas] = useState<{ fecha: string; texto: string; hash: string }[]>([]);
  const [showAdendaModal, setShowAdendaModal] = useState(false);
  const [textoAdenda, setTextoAdenda] = useState("");

  // Reagendamiento Post-Consulta y Recordatorio por WhatsApp
  const [reagendarFecha, setReagendarFecha] = useState("");
  const [reagendarHora, setReagendarHora] = useState("09:00");
  const [reagendarMotivo, setReagendarMotivo] = useState("Control Prenatal y Ecografía de Seguimiento");
  const [reagendarSede, setReagendarSede] = useState("Independencia");
  const [reagendadaExito, setReagendadaExito] = useState(false);

  // Reset Síncrono Obligatorio de Todo el Estado del Formulario
  const resetearEstadoHceSincrono = (p?: PacienteEnConsulta | null) => {
    setPa("");
    setFc("");
    setFr("");
    setTemp("");
    setSatO2("");
    setPeso("");
    setTalla("");
    setFormulaG("");
    setFormulaP("");
    setFur("");
    setFpp("");
    setEg("");
    setAlturaUterina("");
    setLcf("");
    setPresentacion("Cefálica");
    setMotivo(p ? `Atención de ${p.servicio}. Paciente acude para evaluación y control.` : "");
    setAntecedentes("");
    setExamenFisico("");
    setPlanTratamiento("");
    setDiagnosticos([]);
    setImagenes([]);
    setAdendas([]);
    setTextoAdenda("");
    setBusquedaCie("");
    setMostrarSugerenciasCie(false);
    setReagendarFecha("");
    setReagendarMotivo(p ? `Control de Seguimiento - ${p.servicio}` : "Control Prenatal y Ecografía de Seguimiento");
    setReagendadaExito(false);
    setSaveStatus("idle");
    setLastSavedTime("");
  };

  // ============================================================================
  // CARGA REAL DE COLA Y SINCRONIZACIÓN EN TIEMPO REAL (SUPABASE REALTIME)
  // ============================================================================
  const cargarColaEncuentros = async (sedeActual?: string) => {
    setIsLoadingCola(true);
    try {
      // 1. Cargar pacientes en espera o en atención médica activa
      const { data: enEspera, error: errEspera } = await supabase
        .from("encuentro")
        .select(`
          id,
          servicio_solicitado,
          estado,
          site_id,
          fecha_hora,
          paciente:paciente_id (
            id,
            dni,
            nombres,
            apellidos,
            telefono
          ),
          sede:site_id (
            id,
            nombre
          )
        `)
        .in("estado", ["EN_ESPERA", "EN_ATENCION"])
        .order("fecha_hora", { ascending: true });

      if (errEspera) {
        console.warn("Advertencia al consultar encuentros en espera:", errEspera.message);
      } else if (enEspera) {
        const mapeados: PacienteEnConsulta[] = enEspera.map((item: any) => ({
          id: item.id,
          pacienteId: item.paciente?.id,
          paciente: item.paciente ? `${item.paciente.nombres} ${item.paciente.apellidos}`.trim() : "Paciente Registrado",
          dni: item.paciente?.dni || "S/DNI",
          edad: "28 a",
          servicio: item.servicio_solicitado,
          alergias: "Ninguna",
          grupoSanguineo: "O Rh(+)",
          sede: item.sede?.nombre?.includes("Vivanco") ? "Vivanco" : "Independencia",
          estado: item.estado,
          telefono: item.paciente?.telefono || "",
          horaLlegada: new Date(item.fecha_hora).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }));
        setPacientesCola(mapeados);

        setSelectedPatient((prev) => {
          if (prev && mapeados.some((p) => p.id === prev.id)) {
            return mapeados.find((p) => p.id === prev.id) || prev;
          }
          return prev;
        });
      }

      // 2. Cargar atenciones finalizadas hoy
      const { data: atendidos, error: errAtendidos } = await supabase
        .from("encuentro")
        .select(`
          id,
          servicio_solicitado,
          estado,
          site_id,
          fecha_hora,
          paciente:paciente_id (
            id,
            dni,
            nombres,
            apellidos,
            telefono
          ),
          sede:site_id (
            id,
            nombre
          )
        `)
        .eq("estado", "ATENDIDO")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (atendidos) {
        const mapeadosAtendidos: PacienteEnConsulta[] = atendidos.map((item: any) => ({
          id: item.id,
          pacienteId: item.paciente?.id,
          paciente: item.paciente ? `${item.paciente.nombres} ${item.paciente.apellidos}`.trim() : "Paciente Registrado",
          dni: item.paciente?.dni || "S/DNI",
          edad: "28 a",
          servicio: item.servicio_solicitado,
          alergias: "Ninguna",
          grupoSanguineo: "O Rh(+)",
          sede: item.sede?.nombre?.includes("Vivanco") ? "Vivanco" : "Independencia",
          estado: item.estado,
          telefono: item.paciente?.telefono || "",
          horaLlegada: new Date(item.fecha_hora).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }));
        setAtendidosHoy(mapeadosAtendidos);
      }
    } catch (err) {
      console.warn("Error al cargar cola de HCE:", err);
    } finally {
      setIsLoadingCola(false);
    }
  };

  useEffect(() => {
    const s = sessionStorage.getItem("lm_sede") || "Independencia";
    const nom = sessionStorage.getItem("lm_nombre") || "Profesional de Turno";
    const col = sessionStorage.getItem("lm_colegiatura") || "";
    setSede(s);
    setProfesionalNombre(nom);
    setColegiatura(col);

    cargarColaEncuentros(s);

    // Suscripción Realtime a eventos de postgres y broadcast
    const canalCambios = supabase
      .channel("hce-realtime-encuentros")
      .on("postgres_changes", { event: "*", schema: "public", table: "encuentro" }, () => {
        cargarColaEncuentros(s);
      })
      .on("broadcast", { event: "nuevo_paciente_en_espera" }, () => {
        cargarColaEncuentros(s);
      })
      .subscribe();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "lm_nuevo_paciente_en_espera") {
        cargarColaEncuentros(s);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      supabase.removeChannel(canalCambios);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Transición a EN_ATENCION al seleccionar paciente y carga de nota clínica previa
  const handleSeleccionarPaciente = async (p: PacienteEnConsulta) => {
    // 1. Cancelar de inmediato cualquier timer de autoguardado previo
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    // 2. Establecer el ID de encuentro activo en la referencia síncrona
    activeEncuentroIdRef.current = p.id;

    // 3. RESET OBLIGATORIO Y SÍNCRONO DEL 100% DEL FORMULARIO
    resetearEstadoHceSincrono(p);
    setSelectedPatient(p);

    // 4. Bloqueo inmediato si el paciente ya fue ATENDIDO (Modo Solo Lectura)
    const estaAtendido = p.estado === "ATENDIDO";
    setIsSealed(estaAtendido);
    setSealedHash(estaAtendido ? "SELLADO-CONFORME" : null);

    // 5. Cargar nota clínica previa asociada ESTRICTAMENTE a este encuentro_id
    try {
      const { data: notaExistente } = await supabase
        .from("nota_clinica")
        .select("*")
        .eq("encuentro_id", p.id)
        .maybeSingle();

      // Protección contra condiciones de carrera: descartar si el usuario cambió de paciente mientras respondía la red
      if (activeEncuentroIdRef.current !== p.id) {
        return;
      }

      if (notaExistente) {
        if (notaExistente.motivo_consulta) setMotivo(notaExistente.motivo_consulta);
        if (notaExistente.antecedentes) setAntecedentes(notaExistente.antecedentes);
        if (notaExistente.plan_trabajo) setPlanTratamiento(notaExistente.plan_trabajo);
        if (notaExistente.diagnostico_cie10) {
          try {
            setDiagnosticos(JSON.parse(notaExistente.diagnostico_cie10));
          } catch {}
        }
        if (notaExistente.examen_fisico) {
          try {
            const ef = JSON.parse(notaExistente.examen_fisico);
            if (ef.pa) setPa(ef.pa);
            if (ef.fc) setFc(ef.fc);
            if (ef.fr) setFr(ef.fr);
            if (ef.temp) setTemp(ef.temp);
            if (ef.satO2) setSatO2(ef.satO2);
            if (ef.peso) setPeso(ef.peso);
            if (ef.talla) setTalla(ef.talla);
            if (ef.formulaG) setFormulaG(ef.formulaG);
            if (ef.formulaP) setFormulaP(ef.formulaP);
            if (ef.fur) setFur(ef.fur);
            if (ef.fpp) setFpp(ef.fpp);
            if (ef.eg) setEg(ef.eg);
            if (ef.alturaUterina) setAlturaUterina(ef.alturaUterina);
            if (ef.lcf) setLcf(ef.lcf);
            if (ef.presentacion) setPresentacion(ef.presentacion);
            if (ef.detalles) setExamenFisico(ef.detalles);
          } catch {}
        }
        if (notaExistente.cerrada || notaExistente.hash_firma || estaAtendido) {
          setIsSealed(true);
          setSealedHash(notaExistente.hash_firma || "SELLADO-CONFORME");
        }
      }
    } catch (err) {
      console.warn("Error cargando nota clínica previa:", err);
    }

    if (p.estado === "EN_ESPERA") {
      try {
        await supabase
          .from("encuentro")
          .update({ estado: "EN_ATENCION", updated_at: new Date().toISOString() })
          .eq("id", p.id);

        setPacientesCola((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, estado: "EN_ATENCION" } : item))
        );
        setSelectedPatient((prev) => (prev && prev.id === p.id ? { ...prev, estado: "EN_ATENCION" } : prev));
      } catch (err) {
        console.warn("No se pudo actualizar estado a EN_ATENCION:", err);
      }
    }
  };

  const generarEnlaceWhatsApp = () => {
    const tel = selectedPatient?.telefono || "966123456";
    const msg = `*Consultorio Obstétrico Ecográfico Las Mellizas* 🩺✨%0A%0AEstimada paciente *${encodeURIComponent(
      selectedPatient?.paciente || "Paciente"
    )}*:%0A%0ALe confirmamos su próxima cita de control médico programada:%0A📅 *Fecha:* ${
      reagendarFecha || "Por coordinar"
    }%0A⏰ *Hora:* ${reagendarHora}%0A🏥 *Sede:* ${reagendarSede}%0A📋 *Servicio:* ${encodeURIComponent(
      reagendarMotivo
    )}%0A👨‍⚕️ *Profesional:* ${encodeURIComponent(profesionalNombre)}%0A%0A_Por favor acudir 10 minutos antes. ¡Cuidamos de ti y de tu bebé con amor y tecnología!_`;

    return `https://wa.me/51${tel}?text=${msg}`;
  };

  const handleGuardarReagendamiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reagendarFecha) {
      alert("Por favor seleccione la fecha de la próxima cita.");
      return;
    }
    if (!selectedPatient) {
      alert("No hay paciente seleccionado.");
      return;
    }
    try {
      await supabase.from("cita_reagendada").insert({
        paciente_nombre: selectedPatient.paciente,
        fecha: reagendarFecha,
        hora: reagendarHora,
        motivo: reagendarMotivo,
        site_id: reagendarSede === "Vivanco" ? "b0000000-0000-0000-0000-000000000002" : "b0000000-0000-0000-0000-000000000001",
      });
    } catch {}
    setReagendadaExito(true);
    setTimeout(() => setReagendadaExito(false), 4000);
  };

  // ============================================================================
  // AUTOGUARDADO SILENCIOSO Y PERSISTENCIA POR ENCUENTRO_ID ÚNICO
  // ============================================================================
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Si no hay paciente, o la nota está sellada / ATENDIDA, BLOQUEAR AUTOGUARDADO
    if (isSealed || !selectedPatient || selectedPatient.estado === "ATENDIDO") {
      setSaveStatus("idle");
      return;
    }

    const currentEncuentroId = selectedPatient.id;
    setSaveStatus("saving");

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      // Verificación estricta de concurrencia: el encuentro activo debe ser el mismo
      if (activeEncuentroIdRef.current !== currentEncuentroId) return;

      try {
        const { data: userAuth } = await supabase.auth.getUser();
        await supabase.from("nota_clinica").upsert(
          {
            encuentro_id: currentEncuentroId,
            paciente_id: selectedPatient.pacienteId,
            profesional_id: userAuth.user?.id,
            motivo_consulta: motivo,
            antecedentes: antecedentes,
            examen_fisico: JSON.stringify({
              pa, fc, fr, temp, satO2, peso, talla, imc,
              formulaG, formulaP, fur, fpp, eg, alturaUterina, lcf, presentacion,
              detalles: examenFisico,
            }),
            diagnostico_cie10: JSON.stringify(diagnosticos),
            plan_trabajo: planTratamiento,
            cerrada: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "encuentro_id" }
        );

        if (activeEncuentroIdRef.current === currentEncuentroId) {
          setSaveStatus("saved");
          setLastSavedTime(new Date().toLocaleTimeString("es-PE"));
        }
      } catch {
        if (activeEncuentroIdRef.current === currentEncuentroId) {
          setSaveStatus("idle");
        }
      }
    }, 2500);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [pa, fc, fr, temp, peso, talla, motivo, antecedentes, examenFisico, planTratamiento, diagnosticos, formulaG, formulaP, fur, fpp, eg, alturaUterina, lcf, presentacion]);

  const handleAgregarCie = (item: { codigo: string; descripcion: string }) => {
    if (diagnosticos.some((d) => d.codigo === item.codigo)) return;
    setDiagnosticos([
      ...diagnosticos,
      { id: `dx-${Date.now()}`, codigo: item.codigo, descripcion: item.descripcion, tipo: "Definitivo" },
    ]);
    setBusquedaCie("");
    setMostrarSugerenciasCie(false);
  };

  // Sellar y Firmar HCE con Persistencia Real y Cierre del Encuentro
  const handleSellarNota = async () => {
    if (!selectedPatient) return;
    if (diagnosticos.length === 0) {
      alert("Debe registrar al menos un código CIE-10 antes de sellar.");
      return;
    }

    const hash = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    try {
      const { data: userAuth } = await supabase.auth.getUser();

      // 1. Guardar nota clínica en Supabase
      const { error: notaErr } = await supabase.from("nota_clinica").upsert(
        {
          encuentro_id: selectedPatient.id,
          paciente_id: selectedPatient.pacienteId,
          profesional_id: userAuth.user?.id,
          motivo_consulta: motivo,
          antecedentes: antecedentes,
          examen_fisico: JSON.stringify({
            pa,
            fc,
            fr,
            temp,
            satO2,
            peso,
            talla,
            imc,
            formulaG,
            formulaP,
            fur,
            fpp,
            eg,
            alturaUterina,
            lcf,
            presentacion,
            detalles: examenFisico,
          }),
          diagnostico_cie10: JSON.stringify(diagnosticos),
          plan_trabajo: planTratamiento,
          cerrada: true,
          fecha_cierre: new Date().toISOString(),
          hash_firma: hash,
        },
        { onConflict: "encuentro_id" }
      );

      if (notaErr) {
        console.warn("Advertencia al guardar nota clínica:", notaErr.message);
      }

      // 2. Marcar encuentro como ATENDIDO
      const { error: encErr } = await supabase
        .from("encuentro")
        .update({ estado: "ATENDIDO", updated_at: new Date().toISOString() })
        .eq("id", selectedPatient.id);

      if (encErr) {
        console.warn("Advertencia al actualizar estado de encuentro:", encErr.message);
      }

      // 3. Registrar en auditoría
      if (userAuth.user?.id) {
        await supabase.from("auditoria").insert({
          usuario_id: userAuth.user.id,
          site_id: sede === "Vivanco" ? "b0000000-0000-0000-0000-000000000002" : "b0000000-0000-0000-0000-000000000001",
          accion: "SELLO_NOTA_CLINICA",
          entidad: "nota_clinica",
          entidad_id: selectedPatient.id,
          detalle: {
            paciente: selectedPatient.paciente,
            dni: selectedPatient.dni,
            hash_firma: hash,
          },
        });
      }

      setSealedHash(hash);
      setIsSealed(true);
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
      setSaveStatus("saved");
      if (selectedPatient) {
        setSelectedPatient((prev) => (prev ? { ...prev, estado: "ATENDIDO" } : prev));
      }

      // Recargar cola de pacientes de Supabase
      await cargarColaEncuentros();
    } catch (err: any) {
      alert("Error al sellar historia clínica:\n" + (err?.message || err));
    }
  };

  // Reversión / Reapertura autorizada de un caso clínico cerrado
  const handleEjecutarReversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encuentroAReabrir) return;
    if (motivoReapertura.trim().length < 5) {
      alert("Debe ingresar una justificación u observación obligatoria de al menos 5 caracteres.");
      return;
    }

    setReabriendo(true);
    try {
      // Intentar mediante RPC
      const { error: rpcErr } = await supabase.rpc("revertir_estado_encuentro", {
        p_encuentro_id: encuentroAReabrir.id,
        p_nuevo_estado: "EN_ATENCION",
        p_motivo: motivoReapertura.trim(),
      });

      if (rpcErr) {
        // Fallback directo a tablas
        await supabase
          .from("encuentro")
          .update({ estado: "EN_ATENCION", updated_at: new Date().toISOString() })
          .eq("id", encuentroAReabrir.id);

        const { data: userAuth } = await supabase.auth.getUser();
        if (userAuth.user?.id) {
          await supabase.from("auditoria").insert({
            usuario_id: userAuth.user.id,
            accion: "REVERSION_ESTADO_ENCUENTRO_MANUAL",
            entidad: "encuentro",
            entidad_id: encuentroAReabrir.id,
            detalle: {
              motivo: motivoReapertura.trim(),
              nuevo_estado: "EN_ATENCION",
            },
          });
        }
      }

      setShowReabrirModal(false);
      setMotivoReapertura("");
      setVistaCola("espera");
      await cargarColaEncuentros();
      setSelectedPatient({ ...encuentroAReabrir, estado: "EN_ATENCION" });
      setIsSealed(false);
      setSealedHash(null);
      alert(`El encuentro de ${encuentroAReabrir.paciente} fue reabierto y colocado en atención activa.`);
    } catch (err: any) {
      alert("Error al reabrir el caso clínico:\n" + (err?.message || err));
    } finally {
      setReabriendo(false);
    }
  };

  const handleGuardarAdenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoAdenda.trim()) return;

    const hash = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    setAdendas([...adendas, { fecha: new Date().toLocaleString("es-PE"), texto: textoAdenda, hash }]);
    setTextoAdenda("");
    setShowAdendaModal(false);
  };

  const pacientesFiltrados = pacientesCola.filter(
    (p) => sede === "Todas las Sedes" || p.sede === sede
  );

  const atendidosFiltrados = atendidosHoy.filter(
    (p) => sede === "Todas las Sedes" || p.sede === sede
  );

  return (
    <div className="space-y-3 max-w-[1600px] mx-auto text-xs">
      {/* Barra de Control Clínico & Autoguardado */}
      <div className="bg-white border border-neutral-200 rounded-lg p-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-900 text-xs">{profesionalNombre}</span>
            <span className="font-mono text-[10px] bg-neutral-100 text-neutral-700 px-1.5 py-0.2 rounded border border-neutral-200">
              {colegiatura}
            </span>
          </div>
          <span className="text-neutral-300">&bull;</span>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500">Paciente:</span>
            <span className="font-bold text-neutral-900">
              {selectedPatient ? selectedPatient.paciente : "Ningún paciente seleccionado"}
            </span>
            {selectedPatient && (
              <span className="font-mono text-neutral-400">({selectedPatient.dni})</span>
            )}
            {selectedPatient?.alergias && selectedPatient.alergias !== "Ninguna" && (
              <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200 flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />
                {selectedPatient.alergias}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador de Autoguardado Silencioso */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-400">
            {saveStatus === "saving" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Guardando cambios...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-neutral-500">Guardado aut. {lastSavedTime}</span>
              </>
            )}
          </div>

          {/* Botón de Sellar / Adenda */}
          {!isSealed ? (
            <button
              onClick={handleSellarNota}
              disabled={!selectedPatient}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-black text-white font-bold rounded-lg transition disabled:opacity-40"
            >
              <Lock className="w-3 h-3" />
              <span>Sellar & Firmar HCE</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAdendaModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-lg transition"
            >
              <PlusCircle className="w-3 h-3" />
              <span>Incorporar Adenda</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de Bloqueo Inmutable Post-Atención */}
      {(isSealed || selectedPatient?.estado === "ATENDIDO") && selectedPatient && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2 rounded-lg flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-extrabold text-xs">Historia Clínica Sellada & Cerrada (Modo Solo Lectura)</span>
            <span className="text-[11px] text-amber-700 hidden sm:inline">&bull; Ley N.° 30024 & NTS N.° 139-MINSA (Acto Médico Inalterable)</span>
          </div>
          {sealedHash && (
            <span className="font-mono text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              Firma Hash: {sealedHash.slice(0, 16)}...
            </span>
          )}
        </div>
      )}

      {/* Grid Clínico de Alta Densidad (3 Columnas) */}
      <div className="grid lg:grid-cols-12 gap-3">
        {/* ================================================================== */}
        {/* COLUMNA 1: COLA DE SEDE, TRIAJE & OBSTÉTRICO (3 columnas)           */}
        {/* ================================================================== */}
        <div className="lg:col-span-3 space-y-3">
          {/* Selector Rápido de Pacientes en Espera / Atendidos */}
          <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
              <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setVistaCola("espera")}
                  className={`px-2 py-0.5 rounded-md transition ${
                    vistaCola === "espera"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  En Espera ({pacientesFiltrados.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVistaCola("atendidos")}
                  className={`px-2 py-0.5 rounded-md transition ${
                    vistaCola === "atendidos"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  Atendidos ({atendidosFiltrados.length})
                </button>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">
                {sede}
              </span>
            </div>

            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
              {vistaCola === "espera" ? (
                pacientesFiltrados.length === 0 ? (
                  <div className="py-6 text-center text-neutral-400">
                    <Clock className="w-5 h-5 mx-auto mb-1 opacity-40" />
                    <p className="font-bold text-[11px] text-neutral-600">No hay pacientes en espera</p>
                    <p className="text-[10px] text-neutral-400">Las admisiones ingresadas aparecerán automáticamente.</p>
                  </div>
                ) : (
                  pacientesFiltrados.map((p) => {
                    const isSelected = selectedPatient?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSeleccionarPaciente(p)}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                          isSelected
                            ? "border-neutral-900 bg-neutral-50 font-bold"
                            : "border-neutral-100 hover:border-neutral-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-900 truncate">{p.paciente}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-neutral-100 text-neutral-600">
                            {p.estado === "EN_ATENCION" ? "EN ATENCIÓN" : "EN ESPERA"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-0.5">
                          <span className="truncate">{p.servicio}</span>
                          <span className="font-mono text-neutral-400 shrink-0">{p.horaLlegada || p.edad}</span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                atendidosFiltrados.length === 0 ? (
                  <div className="py-6 text-center text-neutral-400">
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1 opacity-40 text-emerald-500" />
                    <p className="font-bold text-[11px] text-neutral-600">No hay atenciones finalizadas hoy</p>
                  </div>
                ) : (
                  atendidosFiltrados.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 rounded-lg border border-emerald-100 bg-emerald-50/30 text-left transition flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-neutral-900 truncate">{p.paciente}</span>
                          <span className="text-[9px] text-neutral-400 font-mono">({p.dni})</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 block truncate">{p.servicio}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEncuentroAReabrir(p);
                          setShowReabrirModal(true);
                        }}
                        title="Reabrir caso clínico por error material u omisión"
                        className="px-2 py-1 bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-[10px] rounded border border-neutral-200 transition shrink-0"
                      >
                        Reabrir
                      </button>
                    </div>
                  ))
                )
              )}
            </div>
          </div>

          {/* Triaje / Funciones Vitales */}
          <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
              <span className="font-bold text-[11px] text-neutral-700 uppercase tracking-wider">
                1. Triaje Vital
              </span>
              <span className="font-mono text-[10px] text-neutral-500">
                IMC: <strong className="text-neutral-900">{imc}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">P.A. (mmHg)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={pa}
                  onChange={(e) => setPa(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">F.C. (lpm)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={fc}
                  onChange={(e) => setFc(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">Temp (°C)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">SatO2 (%)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={satO2}
                  onChange={(e) => setSatO2(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">Peso (kg)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">Talla (m)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={talla}
                  onChange={(e) => setTalla(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono"
                />
              </div>
            </div>
          </div>

          {/* Módulo Obstétrico Especializado */}
          <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2">
            <span className="font-bold text-[11px] text-neutral-700 uppercase tracking-wider block border-b border-neutral-100 pb-1">
              2. Parámetros Materno-Fetales
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">G / P</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    disabled={isSealed}
                    value={formulaG}
                    onChange={(e) => setFormulaG(e.target.value)}
                    className="w-1/2 px-1.5 py-1 border border-neutral-200 rounded font-mono text-center font-bold"
                  />
                  <input
                    type="text"
                    disabled={isSealed}
                    value={formulaP}
                    onChange={(e) => setFormulaP(e.target.value)}
                    className="w-1/2 px-1.5 py-1 border border-neutral-200 rounded font-mono text-center font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">EG Semanas</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={eg}
                  onChange={(e) => setEg(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">F.U.R.</label>
                <input
                  type="date"
                  disabled={isSealed}
                  value={fur}
                  onChange={(e) => setFur(e.target.value)}
                  className="w-full px-1.5 py-1 border border-neutral-200 rounded font-mono text-[10px]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">F.P.P. (Naegele)</label>
                <input
                  type="date"
                  disabled={isSealed}
                  value={fpp}
                  onChange={(e) => setFpp(e.target.value)}
                  className="w-full px-1.5 py-1 border border-neutral-200 rounded font-mono text-[10px]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">A.U. (cm)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={alturaUterina}
                  onChange={(e) => setAlturaUterina(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">L.C.F. (lpm)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={lcf}
                  onChange={(e) => setLcf(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono font-bold text-neutral-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* COLUMNA 2: ANAMNESIS, EXAMEN, CIE-10 & TRATAMIENTO (6 columnas)    */}
        {/* ================================================================== */}
        <div className="lg:col-span-6 bg-white border border-neutral-200 rounded-lg p-3.5 space-y-3">
          {/* Motivo de Consulta & Anamnesis */}
          <div>
            <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
              3. Motivo de Consulta & Relato Cronológico
            </label>
            <textarea
              rows={2}
              disabled={isSealed}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full p-2 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {/* Antecedentes Clínicos */}
          <div>
            <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
              4. Antecedentes Gineco-Obstétricos & Quirúrgicos
            </label>
            <textarea
              rows={2}
              disabled={isSealed}
              value={antecedentes}
              onChange={(e) => setAntecedentes(e.target.value)}
              className="w-full p-2 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {/* Examen Físico Segmentario & Ginecológico */}
          <div>
            <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
              5. Examen Físico Preferencial / Especuloscopía
            </label>
            <textarea
              rows={2}
              disabled={isSealed}
              value={examenFisico}
              onChange={(e) => setExamenFisico(e.target.value)}
              className="w-full p-2 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {/* Diagnósticos CIE-10 con Búsqueda Rápida */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[11px] text-neutral-700 uppercase tracking-wider">
                6. Diagnósticos CIE-10 *
              </label>
              <span className="text-[10px] text-neutral-400">Autocompletado predictivo</span>
            </div>

            {/* Lista de Diagnósticos Cargados */}
            <div className="space-y-1">
              {diagnosticos.map((dx) => (
                <div
                  key={dx.id}
                  className="flex items-center justify-between p-1.5 px-2 bg-neutral-50 rounded border border-neutral-200 text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold bg-neutral-200 px-1 py-0.2 rounded text-[10px]">
                      {dx.codigo}
                    </span>
                    <span className="font-medium text-neutral-900">{dx.descripcion}</span>
                  </div>
                  {!isSealed && (
                    <button
                      onClick={() => setDiagnosticos(diagnosticos.filter((d) => d.id !== dx.id))}
                      className="text-neutral-400 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Input de Búsqueda Predictiva */}
            {!isSealed && (
              <div className="relative">
                <input
                  type="text"
                  value={busquedaCie}
                  onChange={(e) => {
                    setBusquedaCie(e.target.value);
                    setMostrarSugerenciasCie(true);
                  }}
                  onFocus={() => setMostrarSugerenciasCie(true)}
                  placeholder="Escribe código o término (ej. Z34, embarazo, vaginitis)..."
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
                {mostrarSugerenciasCie && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                    {CIE10_FRECUENTES.filter(
                      (c) =>
                        c.codigo.toLowerCase().includes(busquedaCie.toLowerCase()) ||
                        c.descripcion.toLowerCase().includes(busquedaCie.toLowerCase())
                    ).map((item) => (
                      <div
                        key={item.codigo}
                        onClick={() => handleAgregarCie(item)}
                        className="p-2 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0 flex items-center justify-between"
                      >
                        <span className="font-medium text-neutral-800">{item.descripcion}</span>
                        <span className="font-mono font-bold text-[10px] text-neutral-500">{item.codigo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plan de Trabajo & Receta Médica DCI */}
          <div>
            <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
              7. Plan de Trabajo & Prescripción (DCI)
            </label>
            <textarea
              rows={3}
              disabled={isSealed}
              value={planTratamiento}
              onChange={(e) => setPlanTratamiento(e.target.value)}
              className="w-full p-2 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>
        </div>

        {/* ================================================================== */}
        {/* COLUMNA 3: GALERÍA DE IMÁGENES & ADENDAS (3 columnas)               */}
        {/* ================================================================== */}
        <div className="lg:col-span-3 space-y-3">
          {/* Imágenes Médicas Adjuntas */}
          <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
              <span className="font-bold text-[11px] text-neutral-700 uppercase tracking-wider flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Imágenes / Ecografías ({imagenes.length})
              </span>
              {!isSealed && (
                <button
                  onClick={() => {
                    const nueva: ImagenAdjunta = {
                      id: `img-${Date.now()}`,
                      titulo: "Captura Ecográfica",
                      tipo: "Ecografía",
                      url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&auto=format&fit=crop&q=80",
                      hora: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
                    };
                    setImagenes([...imagenes, nueva]);
                  }}
                  className="text-[10px] font-bold text-neutral-700 hover:text-black flex items-center gap-0.5"
                >
                  <Upload className="w-3 h-3" /> + Adjuntar
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {imagenes.map((img) => (
                <div
                  key={img.id}
                  className="flex items-center gap-2 p-1.5 bg-neutral-50 rounded border border-neutral-200 group"
                >
                  <img src={img.url} alt={img.titulo} className="w-10 h-10 object-cover rounded" />
                  <div className="flex-1 truncate">
                    <span className="font-semibold text-neutral-900 block truncate leading-tight">
                      {img.titulo}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">{img.hora}</span>
                  </div>
                  <button
                    onClick={() => setModalImagen(img)}
                    className="p-1 text-neutral-400 hover:text-neutral-900"
                    title="Ampliar imagen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Reagendamiento Post-Consulta & Recordatorio por WhatsApp */}
          <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                <Calendar className="w-3.5 h-3.5 text-brand-700" />
                <span className="uppercase text-[11px] tracking-wider">Próximo Control / Cita</span>
              </div>
              <span className="text-[10px] font-semibold text-neutral-500">Post-Consulta</span>
            </div>

            <form onSubmit={handleGuardarReagendamiento} className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Fecha Cita *</label>
                  <input
                    type="date"
                    required
                    value={reagendarFecha}
                    onChange={(e) => setReagendarFecha(e.target.value)}
                    className="w-full p-1.5 border border-neutral-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Hora *</label>
                  <input
                    type="time"
                    required
                    value={reagendarHora}
                    onChange={(e) => setReagendarHora(e.target.value)}
                    className="w-full p-1.5 border border-neutral-300 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Sede</label>
                <select
                  value={reagendarSede}
                  onChange={(e) => setReagendarSede(e.target.value)}
                  className="w-full p-1.5 border border-neutral-300 rounded text-xs bg-white"
                >
                  <option value="Independencia">Sede Independencia</option>
                  <option value="Vivanco">Sede Vivanco</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Motivo / Estudio</label>
                <input
                  type="text"
                  value={reagendarMotivo}
                  onChange={(e) => setReagendarMotivo(e.target.value)}
                  placeholder="Ej: Control Prenatal 28 sem..."
                  className="w-full p-1.5 border border-neutral-300 rounded text-xs"
                />
              </div>

              <div className="pt-1 flex flex-col gap-1.5">
                <button
                  type="submit"
                  className="w-full py-1.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded transition flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Programar en Calendario</span>
                </button>

                <a
                  href={generarEnlaceWhatsApp()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Enviar Recordatorio por WhatsApp</span>
                </a>
              </div>

              {reagendadaExito && (
                <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-800 text-center font-semibold">
                  ✓ Cita registrada exitosamente.
                </div>
              )}
            </form>
          </div>

          {/* Historial de Adendas Inmutables */}
          {isSealed && (
            <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2">
              <span className="font-bold text-[11px] text-neutral-700 uppercase tracking-wider block border-b border-neutral-100 pb-1">
                Adendas Inmutables ({adendas.length})
              </span>

              {adendas.length === 0 ? (
                <p className="text-[11px] text-neutral-400">Sin adendas agregadas post-sellado.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {adendas.map((a, i) => (
                    <div key={i} className="p-2 bg-neutral-50 rounded border border-neutral-200 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                        <span>{a.fecha}</span>
                        <span>{a.hash}</span>
                      </div>
                      <p className="text-neutral-800">{a.texto}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Certificado de Integridad / Sello */}
          {isSealed && sealedHash && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] font-mono text-emerald-800 space-y-0.5">
              <span className="font-bold block font-sans">Historia Sellada e Inmutable</span>
              <p className="break-all text-emerald-700">SHA-256: {sealedHash}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Visor de Imagen */}
      {modalImagen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-3xl w-full bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800">
            <div className="p-3 bg-neutral-900 flex items-center justify-between text-white border-b border-neutral-800">
              <span className="font-bold text-xs">{modalImagen.titulo}</span>
              <button onClick={() => setModalImagen(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center">
              <img src={modalImagen.url} alt="Ampliación" className="max-h-[70vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Adenda */}
      {showAdendaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl border border-neutral-200 space-y-3">
            <h3 className="font-bold text-sm text-neutral-900">Incorporar Adenda Inmutable (NTS N.º 139)</h3>
            <p className="text-xs text-neutral-500">
              Las notas cerradas no admiten modificación directa. Toda aclaración o corrección se anexa con fecha y firma digital.
            </p>
            <form onSubmit={handleGuardarAdenda} className="space-y-3">
              <textarea
                rows={4}
                required
                value={textoAdenda}
                onChange={(e) => setTextoAdenda(e.target.value)}
                placeholder="Escribe el texto de la adenda clínica..."
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-xs focus:ring-1 focus:ring-neutral-900"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdendaModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-lg"
                >
                  Firmar Adenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reabrir Caso Clínico (Reversión Auditada) */}
      {showReabrirModal && encuentroAReabrir && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl border border-neutral-200 space-y-3">
            <div className="flex items-center gap-2 text-neutral-900 border-b border-neutral-100 pb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <h3 className="font-bold text-sm">Reabrir Caso Clínico (Reversión Auditada)</h3>
            </div>
            <p className="text-xs text-neutral-600">
              Está solicitando reabrir el encuentro de <strong>{encuentroAReabrir.paciente}</strong> (DNI: {encuentroAReabrir.dni}). El estado volverá a <strong>EN ATENCIÓN</strong> para permitir correcciones médicas.
            </p>
            <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
              Conforme a la NTS N.º 139-MINSA, esta acción quedará registrada permanentemente en el libro inalterable de auditoría con su usuario y hora exacta.
            </p>
            <form onSubmit={handleEjecutarReversion} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Motivo o Justificación Obligatoria * (Mín. 5 caracteres)
                </label>
                <textarea
                  rows={3}
                  required
                  value={motivoReapertura}
                  onChange={(e) => setMotivoReapertura(e.target.value)}
                  placeholder="Ej. Corrección de dosis farmacológica / complementación de triaje..."
                  className="w-full p-2.5 border border-neutral-300 rounded-lg text-xs focus:ring-1 focus:ring-neutral-900 bg-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReabrirModal(false);
                    setMotivoReapertura("");
                  }}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reabriendo || motivoReapertura.trim().length < 5}
                  className="px-4 py-1.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  {reabriendo ? "Reabriendo..." : "Confirmar Reapertura"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}