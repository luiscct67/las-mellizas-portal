import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Rutas protegidas de grado clínico
  const protectedRoutes = [
    "/admision-caja",
    "/hce",
    "/supervision",
    "/recepcion",
    "/caja",
  ];

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isLoginPage = pathname === "/login";

  // Redirección de rutas legadas hacia el módulo unificado
  if (pathname.startsWith("/recepcion") || pathname.startsWith("/caja")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admision-caja";
    return NextResponse.redirect(url);
  }

  // 1. DENEGACIÓN ESTRICTA (ZERO TRUST): Si no hay usuario autenticado en Supabase Auth
  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("from", pathname);

    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Purgar caché y almacenamiento local para impedir persistencia de datos sensibles
    redirectResponse.headers.set("Clear-Site-Data", '"cache", "storage"');
    return redirectResponse;
  }

  // Si hay usuario autenticado, verificar su rol real en la base de datos
  if (user) {
    let userRole = "RECEPCION_CAJA";
    let isActive = true;

    try {
      const { data: profile } = await supabase
        .from("perfil_usuario")
        .select("rol, activo")
        .eq("id", user.id)
        .single();

      if (profile) {
        userRole = profile.rol;
        isActive = profile.activo;
      }
    } catch {
      // Fallback seguro en caso de latencia de red
      userRole = "RECEPCION_CAJA";
    }

    // Cuenta inactiva o revocada
    if (!isActive) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "cuenta_inactiva");
      const redirectResponse = NextResponse.redirect(redirectUrl);
      redirectResponse.headers.set("Clear-Site-Data", '"cache", "cookies", "storage"');
      return redirectResponse;
    }

    // Permitir acceso directo a /login para cambio de cuenta o nuevo inicio de sesión
    // Solo redirigir si el usuario no tiene intención de autenticarse
    if (isLoginPage && request.nextUrl.searchParams.get("from_home") === "true") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = userRole === "PROFESIONAL" ? "/hce" : userRole === "SUPERVISION" || userRole === "ADMIN" ? "/supervision" : "/admision-caja";
      redirectUrl.searchParams.delete("from_home");
      return NextResponse.redirect(redirectUrl);
    }

    // 2. CONTROL DE ACCESO BASADO EN ROL (ANTI-ACCESO CRUZADO / CERO CURIOSIDAD)
    // Aislamiento de HCE: Solo Médicos, Obstetras, Auditores y Admin
    if (pathname.startsWith("/hce")) {
      if (userRole !== "PROFESIONAL" && userRole !== "SUPERVISION" && userRole !== "ADMIN") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/admision-caja";
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Aislamiento de Supervisión y Auditoría: Solo Auditores y Admin General
    if (pathname.startsWith("/supervision")) {
      if (userRole !== "SUPERVISION" && userRole !== "ADMIN") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = userRole === "PROFESIONAL" ? "/hce" : "/admision-caja";
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Aislamiento de Admisión & Caja: Médicos no deben ingresar a caja operativa
    if (pathname.startsWith("/admision-caja")) {
      if (userRole === "PROFESIONAL") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/hce";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, logo.png (assets públicos)
     * - Extensiones de imágenes y fuentes
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
