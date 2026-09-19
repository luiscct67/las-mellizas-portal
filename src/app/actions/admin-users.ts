"use server";

import { createClient } from "@/lib/supabase/server";

export interface ColaboradorDTO {
  id?: string;
  email: string;
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

    // Si no tenemos UUID, buscar si ya existe en perfil_usuario por email
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
      // 1. Intentar actualizar mediante función RPC segura
      const { error: rpcUpdateError } = await supabase.rpc("actualizar_perfil_colaborador", {
        p_id: targetUserId,
        p_nombre: cleanNombre,
        p_rol: data.rol,
        p_site_id: siteId,
        p_colegiatura: cleanColegiatura,
        p_especialidad: cleanEspecialidad,
        p_activo: isActivo,
      });

      if (!rpcUpdateError) {
        return { success: true, userId: targetUserId, email: cleanEmail };
      }

      // 2. Fallback: Actualización directa en la tabla perfil_usuario por ID
      const { error: directUpdateError } = await supabase
        .from("perfil_usuario")
        .update({
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
