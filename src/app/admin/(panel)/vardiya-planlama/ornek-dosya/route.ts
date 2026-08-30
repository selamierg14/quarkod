import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { toCsv } from "@/lib/feedback-filters";
import { gunEkle, gunGirdisi, haftaBaslangici } from "@/lib/gun";
import { cizelgeyiTabloyaDok, IZINLI_ETIKETI } from "@/lib/vardiya-tablo";
import { SHIFTS } from "@/lib/constants";

/**
 * İçe aktarmanın kabul ettiği biçimi gösteren, gerçek veri taşımayan
 * örnek dosya.
 *
 * "Bu haftayı Excel'e aktar" gerçek personel ve gerçek atamaları
 * taşıyor — round-trip için doğru dosya o. Ama henüz hiç atama
 * yapmamış ya da biçimi merak eden biri için o dosya boş satırlardan
 * ibaret kalıyor, hiçbir şey öğretmiyordu. Bu uç, aynı sütun başlıklarını
 * (bu haftanın GERÇEK günleri — biri bu dosyayı olduğu gibi yüklerse
 * tarih eşleşmesi çalışır) sahte iki personelle dolduruyor: tek vardiya,
 * çoklu vardiya (virgülle) ve izinli günü aynı anda örnekliyor.
 *
 * Sahte isimler gerçek personelle eşleşmeyeceği için olduğu gibi
 * yüklenirse "adı bulunamadı" uyarısı verir — bu istenen: kişi adları
 * kendi ekibiyle değiştirmesi gerektiğini dosyanın kendisinden görür.
 */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  if (user.role === "garson" || !user.moduller.includes("personel")) {
    return NextResponse.json({ error: "Bu işleme yetkiniz yok." }, { status: 403 });
  }

  const baslangicParam = request.nextUrl.searchParams.get("baslangic");
  const haftaBasi = haftaBaslangici(
    baslangicParam ? new Date(baslangicParam) : new Date(),
  );
  const gunler = Array.from({ length: 7 }, (_, i) => gunEkle(haftaBasi, i));

  const sahtePersonel = [
    { id: "ornek-1", name: "Örnek Personel 1" },
    { id: "ornek-2", name: "Örnek Personel 2" },
  ];
  const sahteAtamalar = [
    { userId: "ornek-1", date: gunler[0], shift: "sabah" },
    // Aynı gün iki vardiya: hücrede virgülle yan yana yazılır.
    { userId: "ornek-1", date: gunler[1], shift: "sabah" },
    { userId: "ornek-1", date: gunler[1], shift: "aksam" },
    { userId: "ornek-2", date: gunler[1], shift: "gece" },
    { userId: "ornek-2", date: gunler[2], shift: "ogle" },
  ];
  // 4. güne izinli etiketi düşsün diye sahte bir izin kümesi veriyoruz.
  const izinKumesi = new Map([[`ornek-2|${gunGirdisi(gunler[3])}`, "yillik"]]);

  const tablo = cizelgeyiTabloyaDok(sahtePersonel, gunler, sahteAtamalar, izinKumesi);
  // Açıklayıcı bir alt bilgi satırı: tablo bittikten sonra, ayrı bir
  // "not" satırı olarak. İçe aktarma "başlıktan sonraki tüm dolu satırlar
  // veri" varsayımıyla çalıştığı için bu satır normal bir personel satırı
  // gibi okunur ve adı bulunamadığından zararsızca atlanır.
  tablo.push([
    `NOT: vardiya adları — ${Object.values(SHIFTS).join(" / ")}. Boş hücre = o gün yok. "${IZINLI_ETIKETI}" yazan hücreler içe aktarırken atlanır.`,
  ]);

  return new NextResponse(toCsv(tablo), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vardiya-ornek-dosya.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
