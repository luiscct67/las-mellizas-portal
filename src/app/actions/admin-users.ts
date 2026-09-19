"use server";

import { createClient } from "@/lib/supabase/server";

export interface ColaboradorDTO {
  id?: string;
  email: string;
  emailAnterior?: string;
  nombre: string;
  rol: "RECEPCION_CAJA" | "PROFESIONAL" | "SUPERVISION" | "ADMIN";
  sede: "Independencia" | "Vivanco" | "Todas las Sedes";
  colegiatura?: string;
  especialidad?: string;
  cargo: string;
  activo?: boolean;
  password?: string;
}

const SEDE_UUIDS: Record<string, string | null> = {
  Independencia: "b0000000-0000-0000-0000-000000000001",
  Vivanco: "b0000000-0000-0000-0000-000000000002",
  "Todas las Sedes": null,
};

/**
 * Registra o actualiza de manera REAL un usuario en Supabase Auth y perfil_usuario
 */
export async function registrarOActualizarColaboradorReal(data: ColaboradorDTO) {
  try {
    const supabase = await createClient();
    const siteId = data.sede ? SEDE_UUIDS[data.sede] : null;
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanNombre = data.nombre.trim();
    const cleanColegiatura = data.colegiatura?.trim() || null;
    const cleanEspecialidad = data.especialidad?.trim() || null;
    const isActivo = data.activo !== false;

    // Verificar si se especificó un ID de UUID válido (modo edición)
    const hasValidUuid = Boolean(data.id && !data.id.startsWith("padron-"));
    let targetUserId = hasValidUuid ? data.id! : null;

    // Si no tenemos UUID, buscar si ya existe en perfil_usuario por email anterior o actual
    if (!targetUserId && data.emailAnterior) {
      const cleanOld = data.emailAnterior.trim().toLowerCase();
      const { data: prevProfile } = await supabase
        .from("perfil_usuario")
        .select("id")
        .eq("email", cleanOld)
        .maybeSingle();
      if (prevProfile?.id) {
        targetUserId = prevProfile.id;
      }
    }

    if (!targetUserId) {
      const { data: existingProfile } = await supabase
        .from("perfil_usuario")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existingProfile?.id) {
        targetUserId = existingProfile.id;
      }
    }

    // =========================================================================
    // MODO EDICIÓN: Si el colaborador ya existe, actualizar su perfil directamente
    // =========================================================================
    if (targetUserId) {
      // 1. Intentar actualizar mediante función RPC segura con soporte de email
      let rpcUpdateError: any = null;
      try {
        const { error: errWithEmail } = await supabase.rpc("actualizar_perfil_colaborador", {
          p_id: targetUserId,
          p_nombre: cleanNombre,
          p_rol: data.rol,
          p_site_id: siteId,
          p_colegiatura: cleanColegiatura,
          p_especialidad: cleanEspecialidad,
          p_activo: isActivo,
          p_email: cleanEmail,
        });
        rpcUpdateError = errWithEmail;
      } catch (e: any) {
        rpcUpdateError = e;
      }

      // Si falló por firma de parámetros, intentar firma de 7 parámetros
      if (rpcUpdateError) {
        const { error: errLegacy } = await supabase.rpc("actualizar_perfil_colaborador", {
          p_id: targetUserId,
          p_nombre: cleanNombre,
          p_rol: data.rol,
          p_site_id: siteId,
          p_colegiatura: cleanColegiatura,
          p_especialidad: cleanEspecialidad,
          p_activo: isActivo,
        });
        if (!errLegacy) {
          // Si la función legacy funcionó, actualizar el email directamente en la tabla
          await supabase
            .from("perfil_usuario")
            .update({ email: cleanEmail, updated_at: new Date().toISOString() })
            .eq("id", targetUserId);
          return { success: true, userId: targetUserId, email: cleanEmail };
        }
      } else {
        return { success: true, userId: targetUserId, email: cleanEmail };
      }

      // 2. Fallback: Actualización directa en la tabla perfil_usuario por ID
      const { error: directUpdateError } = await supabase
        .from("perfil_usuario")
        .update({
          email: cleanEmail,
          nombre_completo: cleanNombre,
          rol: data.rol,
          site_id: siteId,
          colegiatura: cleanColegiatura,
          especialidad: cleanEspecialidad,
          activo: isActivo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUserId);

      if (directUpdateError) {
        return { success: false, error: directUpdateError.message };
      }

      return { success: true, userId: targetUserId, email: cleanEmail };
    }

    // =========================================================================
    // MODO CREACIÓN: Colaborador completamente nuevo
    // =========================================================================
    const initialPassword = data.password || "Mellizas#2026!";

    // 1. Provisionamiento mediante RPC con hash seguro y registro en auth.users
    const { data: userId, error: rpcError } = await supabase.rpc("crear_usuario_clinico", {
      p_email: cleanEmail,
      p_password: initialPassword,
      p_nombre: cleanNombre,
      p_rol: data.rol,
      p_site_id: siteId,
      p_colegiatura: cleanColegiatura,
      p_especialidad: cleanEspecialidad,
    });

    if (rpcError) {
      // 2. Fallback: Inserción directa en perfil_usuario
      const { data: inserted, error: insertError } = await supabase
        .from("perfil_usuario")
        .insert({
          email: cleanEmail,
          nombre_completo: cleanNombre,
          rol: data.rol,
          site_id: siteId,
          colegiatura: cleanColegiatura,
          especialidad: cleanEspecialidad,
          activo: isActivo,
        })
        .select("id")
        .single();

      if (insertError) {
        if (insertError.message.includes("duplicate key") || insertError.message.includes("unique constraint") || insertError.code === "23505") {
          return { success: false, error: `El correo institucional '${cleanEmail}' ya se encuentra registrado en el sistema por otro colaborador.` };
        }
        return { success: false, error: insertError.message };
      }

      return {
        success: true,
        userId: inserted?.id,
        email: cleanEmail,
        passwordGenerada: initialPassword,
      };
    }

    return {
      success: true,
      userId,
      email: cleanEmail,
      passwordGenerada: initialPassword,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al procesar colaborador." };
  }
}

/**
 * Resetea la contraseña real en Supabase Auth mediante la función de base de datos
 */
export async function resetearPasswordColaboradorReal(email: string, nuevaPassword?: string) {
  try {
    const supabase = await createClient();
    const cleanEmail = email.trim().toLowerCase();
    const tempPassword = nuevaPassword || `Mellizas#${Math.floor(1000 + Math.random() * 9000)}!`;

    // Obtener perfil actual
    const { data: profile } = await supabase
      .from("perfil_usuario")
      .select("*")
      .eq("email", cleanEmail)
      .single();

    if (!profile) {
      return { success: false, error: "Colaborador no encontrado en el sistema." };
    }

    const { error } = await supabase.rpc("crear_usuario_clinico", {
      p_email: profile.email,
      p_password: tempPassword,
      p_nombre: profile.nombre_completo,
      p_rol: profile.rol,
      p_site_id: profile.site_id,
      p_colegiatura: profile.colegiatura,
      p_especialidad: profile.especialidad,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, passwordTemporal: tempPassword };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al resetear contraseña." };
  }
}

/**
 * Obtiene la lista oficial y en vivo de colaboradores registrados en Supabase
 */
export async function obtenerColaboradoresReales() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("perfil_usuario")
      .select("*, sede:site_id(nombre)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, colaboradores: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, colaboradores: [] };
  }
}

/**
 * Elimina definitivamente un colaborador de perfil_usuario y auth.users (Exclusivo Administrador)
 */
export async function eliminarColaboradorReal(id?: string, email?: string) {
  try {
    const supabase = await createClient();
    const cleanEmail = email ? email.trim().toLowerCase() : "";

    if (cleanEmail === "admin@lasmellizasperu.com") {
      return { success: false, error: "Operación rechazada: No se puede eliminar la cuenta principal de Administración General." };
    }

    const hasValidUuid = Boolean(id && !id.startsWith("padron-"));

    // 1. Invocar RPC segura con permisos SECURITY DEFINER
    const { error: rpcError } = await supabase.rpc("eliminar_usuario_clinico", {
      p_id: hasValidUuid ? id : null,
      p_email: cleanEmail || null,
    });

    if (!rpcError) {
      return { success: true };
    }

    // 2. Fallback: Borrado directo en perfil_usuario
    if (hasValidUuid) {
      const { error: delIdError } = await supabase
        .from("perfil_usuario")
        .delete()
        .eq("id", id);

      if (!delIdError) return { success: true };
    }

    if (cleanEmail) {
      const { error: delEmailError } = await supabase
        .from("perfil_usuario")
        .delete()
        .eq("email", cleanEmail);

      if (!delEmailError) return { success: true };
    }

    return { success: false, error: rpcError?.message || "No fue posible eliminar el registro del colaborador." };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al procesar baja del colaborador." };
  }
}

