import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { webhookUrl, payload } = body;

    if (!webhookUrl || typeof webhookUrl !== "string") {
      return NextResponse.json(
        { ok: false, error: "Debe ingresar la URL del Webhook de Google Apps Script." },
        { status: 400 }
      );
    }

    let cleanUrl = webhookUrl.trim();

    // Validar formato preliminar
    if (!cleanUrl.startsWith("https://script.google.com/macros/s/")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La URL es inválida. Debe comenzar con 'https://script.google.com/macros/s/' y terminar en '/exec'.",
        },
        { status: 400 }
      );
    }

    if (!cleanUrl.endsWith("/exec")) {
      // Auto-completar /exec si le falta
      if (!cleanUrl.includes("/exec")) {
        cleanUrl = cleanUrl.replace(/\/+$/, "") + "/exec";
      }
    }

    // Ejecutar petición hacia Google Apps Script siguiendo redirecciones 302
    const googleRes = await fetch(cleanUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload || {}),
      redirect: "follow",
    });

    const status = googleRes.status;
    const text = await googleRes.text();

    if (status === 404 || text.includes("No se encontró la página") || text.includes("El archivo que solicitaste no existe")) {
      return NextResponse.json(
        {
          ok: false,
          status: 404,
          error:
            "Error 404 (No Encontrado): La URL de Google Apps Script no existe o el ID de implementación fue eliminado. Siga la guía para volver a generar una 'Nueva Implementación' como Aplicación Web.",
        },
        { status: 404 }
      );
    }

    if (
      status === 401 ||
      status === 403 ||
      text.includes("accounts.google.com") ||
      text.includes("ServiceLogin") ||
      text.includes("Iniciar sesión")
    ) {
      return NextResponse.json(
        {
          ok: false,
          status: 401,
          error:
            "Error de Permisos (401/403): El script solicita inicio de sesión en Google. Al implementar en Apps Script, en el campo 'Quién tiene acceso' debe seleccionar obligatoriamente: 'Cualquier usuario' (Anyone).",
        },
        { status: 401 }
      );
    }

    if (!googleRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          status,
          error: `Google Apps Script respondió con error HTTP ${status}: ${text.slice(0, 200)}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: 200,
      googleResponse: text,
      message: "¡Conexión verificada exitosamente! Se transmitió la información a Google Sheets.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: `Error de red al conectar con Google Apps Script: ${err?.message || String(err)}`,
      },
      { status: 500 }
    );
  }
}
