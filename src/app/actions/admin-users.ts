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
    const initialPassword = data.password || "Mellizas#2026!";

    // Llamada a función RPC de seguridad en PostgreSQL
    const { data: userId, error: rpcError } = await supabase.rpc("crear_usuario_clinico", {
      p_email: data.email.trim().toLowerCase(),
      p_password: initialPassword,
      p_nombre: data.nombre.trim(),
      p_rol: data.rol,
      p_site_id: siteId,
      p_colegiatura: data.colegiatura?.trim() || null,
      p_especialidad: data.especialidad?.trim() || null,
    });

    if (rpcError) {
      // Fallback directo a actualización de perfil si ya existía
      const { error: profileError } = await supabase
        .from("perfil_usuario")
        .upsert(
          {
            email: data.email.trim().toLowerCase(),
            nombre_completo: data.nombre.trim(),
            rol: data.rol,
            site_id: siteId,
            colegiatura: data.colegiatura?.trim() || null,
            especialidad: data.especialidad?.trim() || null,
            activo: data.activo !== false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" }
        );

      if (profileError) {
        return { success: false, error: profileError.message };
      }
    }

    return {
      success: true,
      userId,
      email: data.email,
      passwordGenerada: initialPassword,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al procesar alta de usuario." };
  }
}

/**
 * Resetea la contraseña real en Supabase Auth mediante la función de base de datos
 */
export async function resetearPasswordColaboradorReal(email: string, nuevaPassword?: string) {
  try {
    const supabase = await createClient();
    const tempPassword = nuevaPassword || `Mellizas#${Math.floor(1000 + Math.random() * 9000)}!`;

    // Obtener perfil actual
    const { data: profile } = await supabase
      .from("perfil_usuario")
      .select("*")
      .eq("email", email.trim().toLowerCase())
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
