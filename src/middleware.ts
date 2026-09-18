import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Rutas protegidas que requieren sesión activa verificada
  const protectedRoutes = [
    "/admision-caja",
    "/hce",
    "/supervision",
    "/recepcion",
    "/caja",
  ];

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isLoginPage = pathname === "/login";

  // Redirección de legado: Si acceden a /recepcion o /caja, redirigir al módulo unificado
  if (pathname.startsWith("/recepcion") || pathname.startsWith("/caja")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admision-caja";
    return NextResponse.redirect(url);
  }

  // Verificación de Autenticación: Cookie de Supabase Auth o Cookie de Sesión Verificada
  const hasAuthCookie = !!user || request.cookies.has("lm_auth_user") || request.cookies.has("sb-access-token");

  if (isProtectedRoute && !hasAuthCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("from", pathname);

    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Limpieza de caché local para evitar persistencia en navegadores compartidos
    redirectResponse.headers.set("Clear-Site-Data", '"cache", "storage"');
    return redirectResponse;
  }

  // Si ya está autenticado e intenta ir a /login, redirigir al módulo asignado
  if (isLoginPage && hasAuthCookie) {
    const redirectUrl = request.nextUrl.clone();
    // Leer rol de cookie si existe
    const roleCookie = request.cookies.get("lm_auth_role")?.value;
    if (roleCookie === "PROFESIONAL") {
      redirectUrl.pathname = "/hce";
    } else if (roleCookie === "SUPERVISION" || roleCookie === "ADMIN") {
      redirectUrl.pathname = "/supervision";
    } else {
      redirectUrl.pathname = "/admision-caja";
    }
    return NextResponse.redirect(redirectUrl);
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
