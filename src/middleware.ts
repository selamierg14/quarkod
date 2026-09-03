import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

/**
 * /admin altındaki her şey oturum ister; giriş sayfası hariç.
 * Sayfalar ayrıca requireUser() ile kendi kontrolünü yapar — bu katman
 * sadece gereksiz sayfa render'ını önler.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Mobil geliştirme: /api/app/* için CORS -----------------------------
  //
  // Native uygulamada CORS diye bir şey YOK (tarayıcı kaynak politikası
  // fetch'e uygulanmıyor), dolayısıyla bu başlıklar üretimde hiçbir işe
  // yaramaz — YALNIZCA Expo'nun web önizlemesi (`expo start --web`,
  // localhost:8081) geliştirme sırasında API'ye ulaşabilsin diye var ve
  // bilerek `development` ile sınırlı. Üretimde bu uçları herkese açmak,
  // hiçbir karşılığı olmayan bir saldırı yüzeyi olurdu.
  //
  // Jeton `Authorization` başlığında taşındığı (çerezde DEĞİL) için bu
  // izin CSRF yüzeyi açmıyor: başka bir origin'deki sayfa, kullanıcının
  // jetonunu okuyamadığı için kimliğiyle istek atamaz.
  if (process.env.NODE_ENV === "development" && pathname.startsWith("/api/app/")) {
    const izinler = {
      "Access-Control-Allow-Origin": request.headers.get("origin") ?? "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };
    // Tarayıcı, `Authorization` başlığı yüzünden önce bir OPTIONS
    // (preflight) atıyor; route handler'larda OPTIONS dışa aktarılmadığı
    // için oraya bırakılırsa 405 dönüyor.
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: izinler });
    }
    const yanit = NextResponse.next();
    for (const [ad, deger] of Object.entries(izinler)) yanit.headers.set(ad, deger);
    return yanit;
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/app/:path*"],
};
