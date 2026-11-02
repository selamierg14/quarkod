import { describe, expect, it } from "vitest";
import {
  KONUM_TAZELIK_SAATI,
  PUSH_YARICAP_METRE,
  gecerliExpoJetonuMu,
  pushHedefleriniSuz,
  pushMesajiOlustur,
  yiginlaraBol,
  type PushHedefi,
} from "./app-push";

const KADIKOY = { enlem: 40.9905, boylam: 29.0277 };
const SIMDI = new Date("2026-09-04T12:00:00Z");

function hedef(
  id: string,
  konum: { enlem: number; boylam: number } | null,
  saatOnce = 1,
): PushHedefi {
  return {
    appUserId: id,
    jeton: `ExponentPushToken[${id}]`,
    konum,
    konumGuncelleme: konum ? new Date(SIMDI.getTime() - saatOnce * 60 * 60 * 1000) : null,
  };
}

describe("pushHedefleriniSuz", () => {
  it("yarıçap içindeki kullanıcıyı seçer", () => {
    // ~300 m kuzeyde.
    const yakin = hedef("yakin", { enlem: 40.9932, boylam: 29.0277 });
    expect(pushHedefleriniSuz([yakin], KADIKOY, SIMDI)).toHaveLength(1);
  });

  it("yarıçap dışındaki kullanıcıyı eler", () => {
    // Bakırköy — Kadıköy'e ~17 km.
    const uzak = hedef("uzak", { enlem: 40.9819, boylam: 28.8772 });
    expect(pushHedefleriniSuz([uzak], KADIKOY, SIMDI)).toHaveLength(0);
  });

  it("konumu olmayan kullanıcıyı eler", () => {
    expect(pushHedefleriniSuz([hedef("konumsuz", null)], KADIKOY, SIMDI)).toHaveLength(0);
  });

  it("konumu bayatlamış kullanıcıyı eler", () => {
    const bayat = hedef("bayat", { enlem: 40.9932, boylam: 29.0277 }, KONUM_TAZELIK_SAATI + 1);
    expect(pushHedefleriniSuz([bayat], KADIKOY, SIMDI)).toHaveLength(0);
  });

  it("tazelik sınırındaki kullanıcıyı tutar", () => {
    const sinirda = hedef("sinirda", { enlem: 40.9932, boylam: 29.0277 }, KONUM_TAZELIK_SAATI - 1);
    expect(pushHedefleriniSuz([sinirda], KADIKOY, SIMDI)).toHaveLength(1);
  });

  /**
   * En önemli kural: mekanın konumu yoksa kimseye gitmemeli.
   * "Konum yoksa herkese gönder" davranışı, yanlış kurulmuş tek bir
   * işletme yüzünden tüm kullanıcılara spam atmak olurdu.
   */
  it("mekan konumsuzsa hiç kimseye göndermez", () => {
    const yakin = hedef("yakin", { enlem: 40.9932, boylam: 29.0277 });
    expect(pushHedefleriniSuz([yakin], null, SIMDI)).toHaveLength(0);
  });

  it("yarıçap dışarıdan daraltılabilir", () => {
    // ~300 m kuzeydeki kullanıcı, 100 m yarıçapta elenmeli.
    const yakin = hedef("yakin", { enlem: 40.9932, boylam: 29.0277 });
    expect(pushHedefleriniSuz([yakin], KADIKOY, SIMDI, 100)).toHaveLength(0);
    expect(pushHedefleriniSuz([yakin], KADIKOY, SIMDI, PUSH_YARICAP_METRE)).toHaveLength(1);
  });
});

describe("pushMesajiOlustur", () => {
  it("Expo'nun beklediği alanları doldurur", () => {
    const mesaj = pushMesajiOlustur("ExponentPushToken[abc]", "⚡ Başlık", "Gövde", {
      slug: "moda-sahil",
    });
    expect(mesaj).toMatchObject({
      to: "ExponentPushToken[abc]",
      title: "⚡ Başlık",
      body: "Gövde",
      sound: "default",
      data: { slug: "moda-sahil" },
    });
    // Android'de kanal olmadan bildirim sessiz düşüyor.
    expect(mesaj.channelId).toBe("varsayilan");
  });
});

describe("yiginlaraBol", () => {
  it("Expo'nun 100'lük sınırına göre böler", () => {
    const yiginlar = yiginlaraBol(Array.from({ length: 250 }, (_, i) => i));
    expect(yiginlar.map((y) => y.length)).toEqual([100, 100, 50]);
  });

  it("boş listede boş sonuç verir", () => {
    expect(yiginlaraBol([])).toEqual([]);
  });
});

describe("gecerliExpoJetonuMu", () => {
  it("gerçek jeton biçimlerini kabul eder", () => {
    expect(gecerliExpoJetonuMu("ExponentPushToken[xxxxxxxxxxxxxx]")).toBe(true);
    expect(gecerliExpoJetonuMu("ExpoPushToken[xxxxxxxxxxxxxx]")).toBe(true);
  });

  it("çöp veriyi reddeder", () => {
    expect(gecerliExpoJetonuMu("merhaba")).toBe(false);
    expect(gecerliExpoJetonuMu("ExponentPushToken[]")).toBe(false);
    expect(gecerliExpoJetonuMu("")).toBe(false);
  });
});
