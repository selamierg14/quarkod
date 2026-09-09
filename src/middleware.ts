import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/kimlik/session-token";
import { yolKarari } from "@/lib/kimlik/yol-koruma";
import { apiKarari } from "@/lib/kimlik/api-politika";

/**
 * Yola girmeden önceki kapı.
 *
 * Üç iş yapıyor, hepsi route çalışmadan ÖNCE:
 *
 *   1. HTTPS zorlaması — düz HTTP isteği kalıcı olarak HTTPS'e taşınıyor.
 *   2. Panel (`/admin/*`) için imzalı oturum çerezi.
 *   3. Tüketici API'si (`/api/app/*`) için yol/metot/kimlik politikası
 *      (bkz. lib/api-politika.ts) — tanınmayan uç 404, yanlış metot 405,
 *      jetonsuz istek 401; hiçbiri veritabanına dokunmadan.
 *
 * Bu katman KABA bir eleme: sayfalar ayrıca requireUser(), API rotaları da
 * appKullaniciGerekli() ile kendi kontrolünü yapıyor. Buradaki amaç
 * yetkisiz isteğin route koduna ve veritabanına kadar gitmesini önlemek.
 *
 * ÇALIŞMA ORTAMI NOTU: middleware Edge'de koşuyor — Prisma ve Node
 * kriptosu burada YOK. Bu yüzden jetonun yalnızca varlığına bakılıyor,
 * imzası route içinde doğrulanıyor. (Panel çerezi `jose` ile doğrulanıyor;
 * o kütüphane Edge uyumlu.)
 */

/**
 * HTTPS zorlaması yalnızca üretimde ve yalnızca açıkça istendiğinde.
 *
 * SSL sertifikası henüz alınmadığı için varsayılan KAPALI: sertifika
 * yokken yönlendirme yapmak siteyi tamamen erişilemez kılardı. Sertifika
 * takıldığında `HTTPS_ZORUNLU=1` verilmesi yeterli — kod değişmiyor.
 */
function httpsZorunluMu(): boolean {
  return process.env.NODE_ENV === "production" && process.env.HTTPS_ZORUNLU === "1";
}

/** Yükün taşındığı protokol — vekil sunucunun arkasında `x-forwarded-proto`. */
function protokol(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(":", "")
  );
}

export async function middleware(request: NextRequest) {
  // --- 1) HTTPS ----------------------------------------------------------
  if (httpsZorunluMu() && protokol(request) === "http") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    // 308: metodu ve gövdeyi koruyan kalıcı yönlendirme. 301/302 POST'u
    // GET'e çevirir ve form gönderimlerini sessizce kaybederdi.
    return NextResponse.redirect(url, 308);
  }

  const karar = yolKarari(
    request.nextUrl.pathname,
    process.env.NODE_ENV === "development",
  );

  // --- 2) Tüketici API'si ------------------------------------------------
  if (karar.tur === "appApi") {
    const corsBasliklari = karar.corsGerekli
      ? {
          "Access-Control-Allow-Origin": request.headers.get("origin") ?? "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        }
      : null;

    // Tarayıcı, `Authorization` başlığı yüzünden önce bir OPTIONS
    // (preflight) atıyor; route handler'larda OPTIONS dışa aktarılmadığı
    // için oraya bırakılırsa 405 dönüyor.
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsBasliklari ?? {} });
    }

    const jetonVar = /^Bearer\s+\S/i.test(request.headers.get("authorization") ?? "");
    const apiSonuc = apiKarari(request.nextUrl.pathname, request.method, jetonVar);

    if (apiSonuc.sonuc !== "gecebilir") {
      const { govde, durum, ekBaslik } = apiHatasi(apiSonuc);
      return NextResponse.json(govde, {
        status: durum,
        headers: { ...(corsBasliklari ?? {}), ...ekBaslik },
      });
    }

    const yanit = NextResponse.next();
    if (corsBasliklari) {
      for (const [ad, deger] of Object.entries(corsBasliklari)) yanit.headers.set(ad, deger);
    }
    return yanit;
  }

  // --- 3) Panel ----------------------------------------------------------
  if (karar.tur === "serbest") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/giris";
    url.search =
      request.nextUrl.pathname === "/admin"
        ? ""
        : `?devam=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Politika kararını HTTP yanıtına çevirir.
 *
 * Hata gövdeleri route'lardakiyle AYNI biçimde (`{ hata }`): mobil taraf
 * yanıtın middleware'den mi route'tan mı geldiğini bilmek zorunda kalmasın.
 */
function apiHatasi(karar: Exclude<ReturnType<typeof apiKarari>, { sonuc: "gecebilir" }>): {
  govde: { hata: string };
  durum: number;
  ekBaslik: Record<string, string>;
} {
  if (karar.sonuc === "bulunamadi") {
    return { govde: { hata: "Uç bulunamadı." }, durum: 404, ekBaslik: {} };
  }
  if (karar.sonuc === "metotYok") {
    return {
      govde: { hata: "Bu uç bu metodu kabul etmiyor." },
      durum: 405,
      ekBaslik: { Allow: karar.izinliler.join(", ") },
    };
  }
  return { govde: { hata: "Oturum geçersiz." }, durum: 401, ekBaslik: {} };
}

export const config = {
  matcher: ["/admin/:path*", "/api/app/:path*"],
};
