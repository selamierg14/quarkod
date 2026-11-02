import { mesafeMetre, type Koordinat } from "./mekan";

/**
 * Bölgesel push bildirimi.
 *
 * "Flaş indirim" (bkz. admin/biyerlere) bugüne kadar yalnızca süreli bir
 * duyuru açıyordu; işletmeden kredi düşülmesine rağmen kimseye bildirim
 * GİTMİYORDU. Bu dosya o eksiği kapatıyor.
 *
 * Kurallar saf fonksiyonlarda çünkü ikisi de yanlış olursa pahalıya
 * patlıyor: geniş tutulursa şehrin öbür ucundaki insana bildirim gider ve
 * uygulama silinir, dar tutulursa işletme kredisini boşa harcar.
 */

/**
 * Bildirimin ulaşacağı en uzak mesafe.
 *
 * 3 km, "yolun üstündeyken haberim olsun" ile "burası benim semtim
 * değil" arasındaki sınır. Doğrulanmış ziyaretteki 100 metreden (bkz.
 * lib/ziyaret.ts) bilerek çok geniş: orada "şu an içeride mi" sorusu
 * vardı, burada "haberi olsun mu" sorusu var.
 */
export const PUSH_YARICAP_METRE = 3000;

/**
 * Konum bilgisi bu süreden eskiyse kullanılmıyor.
 *
 * İki gün önce Kadıköy'de olan biri bugün orada olmayabilir; eski konuma
 * güvenmek, kişiyi hiç bulunmadığı bir yerin reklamıyla rahatsız etmek
 * demek. Konum yalnızca uygulama zaten izin istediğinde tazeleniyor
 * (bkz. AppUser.sonBilinenEnlem şema yorumu), o yüzden pencere geniş
 * ama sınırsız değil.
 */
export const KONUM_TAZELIK_SAATI = 72;

export type PushHedefi = {
  appUserId: string;
  jeton: string;
  konum: Koordinat | null;
  konumGuncelleme: Date | null;
};

/**
 * Bir işletmenin çevresindeki hedefleri süzer.
 *
 * Mekanın konumu yoksa hedefleme yapılamaz ve BOŞ liste döner — "konum
 * yoksa herkese gönder" davranışı, bir kez yanlış kurulmuş bir işletme
 * yüzünden tüm kullanıcılara spam atmak olurdu.
 */
export function pushHedefleriniSuz(
  hedefler: PushHedefi[],
  mekanKonumu: Koordinat | null,
  simdi: Date = new Date(),
  yaricapMetre: number = PUSH_YARICAP_METRE,
): PushHedefi[] {
  if (!mekanKonumu) return [];

  const enEskiKabul = simdi.getTime() - KONUM_TAZELIK_SAATI * 60 * 60 * 1000;

  return hedefler.filter((hedef) => {
    if (!hedef.konum) return false;
    if (!hedef.konumGuncelleme || hedef.konumGuncelleme.getTime() < enEskiKabul) return false;
    return mesafeMetre(hedef.konum, mekanKonumu) <= yaricapMetre;
  });
}

/** Expo'nun beklediği bildirim gövdesi. */
export type ExpoMesaji = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound: "default";
  channelId: "varsayilan";
};

export function pushMesajiOlustur(
  jeton: string,
  baslik: string,
  govde: string,
  veri?: Record<string, string>,
): ExpoMesaji {
  return {
    to: jeton,
    title: baslik,
    body: govde,
    data: veri,
    sound: "default",
    // Android'de kanal olmadan bildirim sessiz düşüyor; native taraf
    // aynı adla kanalı açıyor (bkz. mobil/src/push.ts).
    channelId: "varsayilan",
  };
}

/** Expo tek istekte en fazla bu kadar mesaj kabul ediyor. */
const YIGIN_BOYUTU = 100;

export function yiginlaraBol<T>(liste: T[], boyut: number = YIGIN_BOYUTU): T[][] {
  const yiginlar: T[][] = [];
  for (let i = 0; i < liste.length; i += boyut) yiginlar.push(liste.slice(i, i + boyut));
  return yiginlar;
}

export type GonderimSonucu = {
  gonderilen: number;
  /** Expo'nun "bu jeton artık geçersiz" dediği jetonlar. */
  gecersizJetonlar: string[];
};

type ExpoYanitOgesi = {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string; expoPushToken?: string };
};

/**
 * Expo Push servisine gönderir.
 *
 * Hata durumunda İSTİSNA FIRLATMIYOR: bildirim, flaş indirimin yan
 * etkisi — Expo'ya ulaşılamadı diye duyurunun kendisi de iptal olursa
 * işletme hem kredisini hem kampanyasını kaybeder. Bunun yerine kaç
 * mesajın gittiği ve hangi jetonların çürüdüğü dönüyor, çağıran taraf
 * ona göre davranıyor.
 */
export async function expoyaGonder(mesajlar: ExpoMesaji[]): Promise<GonderimSonucu> {
  const gecersizJetonlar: string[] = [];
  let gonderilen = 0;

  for (const yigin of yiginlaraBol(mesajlar)) {
    try {
      const yanit = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(yigin),
      });

      if (!yanit.ok) continue;

      const govde = (await yanit.json()) as { data?: ExpoYanitOgesi[] };
      const ogeler = govde.data ?? [];

      ogeler.forEach((oge, sira) => {
        if (oge.status === "ok") {
          gonderilen += 1;
          return;
        }
        // "DeviceNotRegistered": uygulama silinmiş ya da izin kapatılmış.
        // Bu jetona bir daha gönderilmemeli.
        if (oge.details?.error === "DeviceNotRegistered") {
          gecersizJetonlar.push(oge.details.expoPushToken ?? yigin[sira].to);
        }
      });
    } catch {
      // Ağ hatası — bu yığın atlanıyor, kalanlar denenmeye devam ediyor.
    }
  }

  return { gonderilen, gecersizJetonlar };
}

/** Expo jetonu biçim kontrolü — çöp veriyi veritabanına almamak için. */
export function gecerliExpoJetonuMu(deger: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(deger.trim());
}
