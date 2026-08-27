import { describe, expect, it } from "vitest";
import {
  PERSONEL_SUTUNU,
  cizelgeyiTabloyaDok,
  csvAyristir,
  gunBasligindanAnahtar,
  tabloyuCizelgeyeCevir,
  vardiyaCoz,
} from "./vardiya-tablo";
import type { Shift } from "./constants";

const PERSONEL = [
  { id: "u1", name: "Ahmet Yılmaz" },
  { id: "u2", name: "Ayşe Demir" },
  { id: "u3", name: "İrem Öz" },
];

/** 24.08.2026 pazartesi başlayan bir hafta. */
const GUNLER = Array.from({ length: 7 }, (_, i) => new Date(2026, 7, 24 + i));
const TUM_VARDIYALAR: Shift[] = ["sabah", "ogle", "aksam", "gece"];

describe("çizelgeyi tabloya dökme", () => {
  it("satır personel, sütun gün olarak yazar", () => {
    const tablo = cizelgeyiTabloyaDok(PERSONEL, GUNLER, [
      { userId: "u1", date: GUNLER[0], shift: "sabah" },
      { userId: "u2", date: GUNLER[1], shift: "gece" },
    ]);

    expect(tablo[0][0]).toBe(PERSONEL_SUTUNU);
    expect(tablo[0][1]).toBe("Pazartesi 24.08");
    expect(tablo[0][7]).toBe("Pazar 30.08");

    expect(tablo[1][0]).toBe("Ahmet Yılmaz");
    expect(tablo[1][1]).toBe("Sabah");
    // Atanmamış gün boş kalır — Excel'de "yok" en okunaklı böyle.
    expect(tablo[1][2]).toBe("");
    expect(tablo[2][2]).toBe("Gece");
  });

  it("aynı gün birden fazla vardiyayı tek hücrede birleştirir", () => {
    const tablo = cizelgeyiTabloyaDok(PERSONEL, GUNLER, [
      { userId: "u1", date: GUNLER[0], shift: "aksam" },
      { userId: "u1", date: GUNLER[0], shift: "sabah" },
    ]);
    // Atama sırasından bağımsız, hep SHIFTS sırasında: aynı çizelge her
    // dışa aktarımda aynı dosyayı üretsin.
    expect(tablo[1][1]).toBe("Sabah, Akşam");
  });

  it("personeli olmayan işletmede yalnızca başlık döner", () => {
    const tablo = cizelgeyiTabloyaDok([], GUNLER, []);
    expect(tablo).toHaveLength(1);
  });
});

describe("vardiya adı çözme", () => {
  it("Türkçe etiketi, anahtarı ve büyük/küçük harfi kabul eder", () => {
    expect(vardiyaCoz("Sabah")).toBe("sabah");
    expect(vardiyaCoz(" sabah ")).toBe("sabah");
    expect(vardiyaCoz("SABAH")).toBe("sabah");
    expect(vardiyaCoz("Öğle")).toBe("ogle");
    expect(vardiyaCoz("ÖĞLE")).toBe("ogle");
    expect(vardiyaCoz("ogle")).toBe("ogle");
  });

  it("tanımadığına null döner", () => {
    expect(vardiyaCoz("kahvaltı")).toBeNull();
    expect(vardiyaCoz("")).toBeNull();
  });
});

describe("gün başlığından tarih çözme", () => {
  it("başlıktaki gün.ay değerini haftanın gerçek gününe bağlar", () => {
    expect(gunBasligindanAnahtar("Pazartesi 24.08", GUNLER)).toBe("2026-08-24");
    expect(gunBasligindanAnahtar("Pazar 30.08", GUNLER)).toBe("2026-08-30");
  });

  it("haftanın dışındaki bir tarihe bağlanmaz", () => {
    expect(gunBasligindanAnahtar("Salı 01.09", GUNLER)).toBeNull();
  });

  it("yıl sonunu sarmalayan haftada iki yılı doğru ayırır", () => {
    // 29.12.2025 pazartesi – 04.01.2026 pazar.
    const yilSonu = Array.from({ length: 7 }, (_, i) => new Date(2025, 11, 29 + i));
    expect(gunBasligindanAnahtar("Pazartesi 29.12", yilSonu)).toBe("2025-12-29");
    expect(gunBasligindanAnahtar("Perşembe 01.01", yilSonu)).toBe("2026-01-01");
  });
});

describe("tabloyu çizelgeye çevirme", () => {
  it("isim ve gün eşleşen hücreleri atamaya dönüştürür", () => {
    const { atamalar, uyarilar } = tabloyuCizelgeyeCevir(
      [
        [PERSONEL_SUTUNU, "Pazartesi 24.08", "Salı 25.08"],
        ["Ahmet Yılmaz", "Sabah", ""],
        ["Ayşe Demir", "", "Gece"],
      ],
      PERSONEL,
      GUNLER,
      TUM_VARDIYALAR,
    );

    expect(uyarilar).toEqual([]);
    expect(atamalar).toEqual([
      { userId: "u1", gun: "2026-08-24", shift: "sabah" },
      { userId: "u2", gun: "2026-08-25", shift: "gece" },
    ]);
  });

  it("dışa aktarılan tablo geri okununca aynı çizelgeyi verir", () => {
    // Round-trip: kullanıcının en olası akışı "dışa aktar → Excel'de düzenle
    // → içe aktar". Biçim iki uçta ayrışırsa bu sessizce bozulur.
    const girdi = [
      { userId: "u1", date: GUNLER[0], shift: "sabah" },
      { userId: "u1", date: GUNLER[0], shift: "aksam" },
      { userId: "u3", date: GUNLER[4], shift: "ogle" },
    ];
    const tablo = cizelgeyiTabloyaDok(PERSONEL, GUNLER, girdi);
    const { atamalar, uyarilar } = tabloyuCizelgeyeCevir(
      tablo,
      PERSONEL,
      GUNLER,
      TUM_VARDIYALAR,
    );

    expect(uyarilar).toEqual([]);
    expect(new Set(atamalar.map((a) => `${a.userId}|${a.gun}|${a.shift}`))).toEqual(
      new Set([
        "u1|2026-08-24|sabah",
        "u1|2026-08-24|aksam",
        "u3|2026-08-28|ogle",
      ]),
    );
  });

  it("sütunlar taşınmış olsa bile günü başlıktan bulur", () => {
    // Kullanıcı Excel'de sütun sırasını değiştirebilir; tarih sütun
    // indeksinden değil başlıktan okunduğu için bu bozulmamalı.
    const { atamalar } = tabloyuCizelgeyeCevir(
      [
        [PERSONEL_SUTUNU, "Çarşamba 26.08", "Pazartesi 24.08"],
        ["Ahmet Yılmaz", "Gece", "Sabah"],
      ],
      PERSONEL,
      GUNLER,
      TUM_VARDIYALAR,
    );

    expect(atamalar).toEqual([
      { userId: "u1", gun: "2026-08-26", shift: "gece" },
      { userId: "u1", gun: "2026-08-24", shift: "sabah" },
    ]);
  });

  it("tanınmayan personeli sessizce yutmaz, uyarır", () => {
    const { atamalar, uyarilar } = tabloyuCizelgeyeCevir(
      [
        [PERSONEL_SUTUNU, "Pazartesi 24.08"],
        ["Mehmet Kim", "Sabah"],
      ],
      PERSONEL,
      GUNLER,
      TUM_VARDIYALAR,
    );

    expect(atamalar).toEqual([]);
    expect(uyarilar[0]).toContain("Mehmet Kim");
  });

  it("tanınmayan vardiya adını uyarır ama satırın kalanını işler", () => {
    const { atamalar, uyarilar } = tabloyuCizelgeyeCevir(
      [
        [PERSONEL_SUTUNU, "Pazartesi 24.08", "Salı 25.08"],
        ["Ahmet Yılmaz", "kahvaltı", "Sabah"],
      ],
      PERSONEL,
      GUNLER,
      TUM_VARDIYALAR,
    );

    expect(uyarilar[0]).toContain("kahvaltı");
    expect(atamalar).toEqual([{ userId: "u1", gun: "2026-08-25", shift: "sabah" }]);
  });

  it("işletmede kapalı olan vardiyayı atar ve uyarır", () => {
    const { atamalar, uyarilar } = tabloyuCizelgeyeCevir(
      [
        [PERSONEL_SUTUNU, "Pazartesi 24.08"],
        ["Ahmet Yılmaz", "Gece"],
      ],
      PERSONEL,
      GUNLER,
      ["sabah", "aksam"],
    );

    expect(atamalar).toEqual([]);
    expect(uyarilar[0]).toContain("Gece");
  });

  it("isimdeki fazla boşluk ve harf büyüklüğü eşleşmeyi bozmaz", () => {
    const { atamalar, uyarilar } = tabloyuCizelgeyeCevir(
      [
        [PERSONEL_SUTUNU, "Pazartesi 24.08"],
        ["  ahmet   yılmaz ", "Sabah"],
      ],
      PERSONEL,
      GUNLER,
      TUM_VARDIYALAR,
    );

    expect(uyarilar).toEqual([]);
    expect(atamalar).toEqual([{ userId: "u1", gun: "2026-08-24", shift: "sabah" }]);
  });

  it("aynı adlı iki personel varsa tahmin etmez, uyarır", () => {
    // Yanlış kişiyi vardiyaya yazmak, hiç yazmamaktan daha kötü.
    const ikiz = [
      { id: "a", name: "Ali Veli" },
      { id: "b", name: "Ali Veli" },
    ];
    const { atamalar, uyarilar } = tabloyuCizelgeyeCevir(
      [
        [PERSONEL_SUTUNU, "Pazartesi 24.08"],
        ["Ali Veli", "Sabah"],
      ],
      ikiz,
      GUNLER,
      TUM_VARDIYALAR,
    );

    expect(atamalar).toEqual([]);
    expect(uyarilar[0]).toContain("birden fazla");
  });

  it("aynı hücrede tekrarlanan vardiyayı bir kez atar", () => {
    const { atamalar } = tabloyuCizelgeyeCevir(
      [
        [PERSONEL_SUTUNU, "Pazartesi 24.08"],
        ["Ahmet Yılmaz", "Sabah, Sabah"],
      ],
      PERSONEL,
      GUNLER,
      TUM_VARDIYALAR,
    );
    expect(atamalar).toHaveLength(1);
  });

  it("başlıkta bu haftaya ait gün yoksa hiçbir şey atamaz", () => {
    // Geçen haftanın dosyasını bu haftaya yüklemek sessizce boş bir
    // çizelge üretmemeli; kullanıcı yanlış dosyayı seçtiğini görmeli.
    const { atamalar, uyarilar } = tabloyuCizelgeyeCevir(
      [
        [PERSONEL_SUTUNU, "Pazartesi 17.08", "Salı 18.08"],
        ["Ahmet Yılmaz", "Sabah", "Sabah"],
      ],
      PERSONEL,
      GUNLER,
      TUM_VARDIYALAR,
    );

    expect(atamalar).toEqual([]);
    expect(uyarilar[0]).toContain("hiçbir gün bulunamadı");
  });

  it("boş dosyada anlaşılır uyarı verir", () => {
    expect(tabloyuCizelgeyeCevir([], PERSONEL, GUNLER, TUM_VARDIYALAR).uyarilar)
      .toHaveLength(1);
  });
});

describe("csv ayrıştırma", () => {
  it("noktalı virgüllü Excel dosyasını okur", () => {
    expect(csvAyristir("a;b;c\r\n1;2;3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("virgüllü dosyayı da okur", () => {
    expect(csvAyristir("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("tırnak içindeki ayracı hücre içeriği sayar", () => {
    // "Sabah, Akşam" tek hücredir; ayraç sanılırsa çizelge kayar.
    expect(csvAyristir('Ahmet;"Sabah, Akşam"')).toEqual([
      ["Ahmet", "Sabah, Akşam"],
    ]);
  });

  it("tırnak içindeki çift tırnağı tek tırnağa indirir", () => {
    expect(csvAyristir('"o ""iyi"" gün"')).toEqual([['o "iyi" gün']]);
  });

  it("BOM'lu dosyada ilk başlık bozulmaz", () => {
    // Excel'in ürettiği dosya BOM ile başlar; temizlenmezse ilk sütun
    // başlığı "Personel" yerine "﻿Personel" olur ve eşleşmez.
    expect(csvAyristir("﻿Personel;Pazartesi 24.08")[0][0]).toBe("Personel");
  });

  it("sekmeyle ayrılmış yapıştırmayı da okur", () => {
    expect(csvAyristir("a\tb\n1\t2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});
