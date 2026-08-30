import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dataUriCoz } from "@/lib/image";
import { duyuruAktifMi } from "@/lib/duyuru";

export const dynamic = "force-dynamic";

/**
 * Keşfet görsellerini ham bayt olarak sunar.
 *
 * Görseller veritabanında data URI olarak duruyor. Bunları mekan listesine
 * gömmek yanıtı kullanılamaz hale getiriyordu: tek mekanlı bir liste
 * 164 KB'tı, elli mekanlı bir keşfet ekranı ~8 MB olurdu. Liste artık
 * yalnızca bu ucun adresini veriyor; mobil taraf görselleri görünür
 * oldukça yüklüyor ve normal HTTP önbelleğinden yararlanıyor.
 *
 * Yalnızca KEŞFETTE LİSTELENEN mekanların görselleri veriliyor: bu uç,
 * listenin görünürlük kurallarını (modül açık, hesap aktif) atlayan bir
 * arka kapı olmamalı.
 */
type Tur = "logo" | "kapak" | "etkinlik";

const TURLER: Tur[] = ["logo", "kapak", "etkinlik"];

function gecerliTur(deger: string): deger is Tur {
  return (TURLER as string[]).includes(deger);
}

/** Listeleme kurallarının aynısı; iki yerde ayrışmasın diye tek yerde. */
function listelenebilirMekanKosulu(simdi: Date) {
  return {
    latitude: { not: null },
    longitude: { not: null },
    account: {
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: simdi } }],
      users: { some: { role: "owner", moduller: { has: "kesfet" } } },
    },
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tur: string; id: string }> },
) {
  const { tur, id } = await params;
  if (!gecerliTur(tur)) {
    return NextResponse.json({ hata: "Geçersiz görsel türü." }, { status: 400 });
  }

  const simdi = new Date();
  let ham: string | null = null;

  if (tur === "etkinlik") {
    const duyuru = await prisma.duyuru.findFirst({
      where: { id, aktif: true, business: listelenebilirMekanKosulu(simdi) },
      select: {
        imageUrl: true,
        aktif: true,
        baslangic: true,
        bitis: true,
      },
    });
    // Tarih penceresi dışındaki afiş listede görünmüyor; görseli de
    // sunulmamalı, yoksa süresi geçmiş kampanya adresi elde kalır.
    ham = duyuru && duyuruAktifMi(duyuru) ? duyuru.imageUrl : null;
  } else {
    const mekan = await prisma.business.findFirst({
      where: { id, ...listelenebilirMekanKosulu(simdi) },
      select: { logoUrl: true, coverUrl: true },
    });
    ham = tur === "logo" ? (mekan?.logoUrl ?? null) : (mekan?.coverUrl ?? null);
  }

  const gorsel = dataUriCoz(ham);
  if (!gorsel) {
    return NextResponse.json({ hata: "Görsel bulunamadı." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(gorsel.baytlar), {
    headers: {
      "Content-Type": gorsel.tur,
      "Content-Length": String(gorsel.baytlar.length),
      // Görsel değişince panelde yeni bir data URI yazılıyor ama adres
      // aynı kalıyor; bu yüzden "sonsuza kadar" değil, bir saatlik
      // önbellek. Mobil tarafta liste her açılışta yenilendiği için
      // güncel görsele en geç bir saat içinde geçiliyor.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
