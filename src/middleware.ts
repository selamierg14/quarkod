import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

/**
 * /admin altındaki her şey oturum ister; giriş sayfası hariç.
 * Sayfalar ayrıca requireUser() ile kendi kontrolünü yapar — bu katman
 * sadece gereksiz sayfa render'ını önler.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/giris") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/giris";
    url.search = pathname === "/admin" ? "" : `?devam=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Platform yöneticisi kiracıların operasyonel ekranlarında işi yok: farklı
  // hesapların ortalamaları tek sayıda birleşir (anlamsız) ve gereksiz yere
  // müşteri verisine temas edilir. Onu hesap yönetimine yönlendiriyoruz.
  if (
    session.role === "superadmin" &&
    !SUPERADMIN_PATHS.some((allowed) => pathname.startsWith(allowed))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/hesaplar";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/** Platform yöneticisinin girebileceği yollar. */
const SUPERADMIN_PATHS = ["/admin/hesaplar", "/admin/sifre"];

export const config = {
  matcher: ["/admin/:path*"],
};
