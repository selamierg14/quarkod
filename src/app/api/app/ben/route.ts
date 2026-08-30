import { NextResponse } from "next/server";
import { appKullaniciGerekli } from "@/lib/app-api";

export const dynamic = "force-dynamic";

/**
 * Oturumdaki tüketicinin kendi bilgisi.
 *
 * Mobil uygulama açılışta bunu çağırıp jetonunun hâlâ geçerli olup
 * olmadığını anlıyor: 401 dönerse kullanıcıyı giriş ekranına atıyor.
 * Jetonun süresi dolmamış olsa bile hesap askıya alınmış ya da şifre
 * değişmiş olabilir — bu uç ikisini de yakalar.
 */
export async function GET(request: Request) {
  const sonuc = await appKullaniciGerekli(request);
  if ("yanit" in sonuc) return sonuc.yanit;

  return NextResponse.json({ kullanici: sonuc.kullanici });
}
