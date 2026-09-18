import { describe, it, expect } from "vitest";
import {
  EN_COK_EK_TELEFON,
  ekTelefonEklenebilirMi,
  ekTelefonlariCoz,
  telefonListesi,
} from "./telefonlar";
import { ROLLER } from "./session-token";

describe("ekTelefonEklenebilirMi", () => {
  it("saha personeli yedek numara EKLEYEMEZ", () => {
    // Kuralın tamamı bu satırda; hem sunucu hem arayüz buradan okuyor.
    expect(ekTelefonEklenebilirMi("garson")).toBe(false);
  });

  it("diğer bütün roller ekleyebilir", () => {
    for (const rol of ROLLER.filter((r) => r !== "garson")) {
      expect(ekTelefonEklenebilirMi(rol), rol).toBe(true);
    }
  });

  it("tanınmayan rol de ekleyemez sayılmıyor — yalnızca garson kısıtlı", () => {
    // Kural bilerek "garson hariç" biçiminde: yeni bir rol eklendiğinde
    // varsayılan davranış "ekleyebilir" olmalı, aksi halde rol eklendiği
    // gün sessizce kısıtlanmış olur ve kimse sebebini bilmez.
    expect(ekTelefonEklenebilirMi("yeni-rol")).toBe(true);
  });
});

describe("telefonListesi", () => {
  it("birincil önce, yedekler sırayla", () => {
    expect(telefonListesi("+905321112233", ["+905331112233", "+905341112233"])).toEqual([
      "+905321112233",
      "+905331112233",
      "+905341112233",
    ]);
  });

  it("farklı yazımları tek biçime indiriyor", () => {
    expect(telefonListesi("0532 111 22 33", ["+90 533 111 22 33"])).toEqual([
      "+905321112233",
      "+905331112233",
    ]);
  });

  it("birincil yedeklerde de varsa bir kez görünüyor", () => {
    // Yoksa giriş ekranında aynı numara iki seçenek olarak çıkardı.
    expect(telefonListesi("+905321112233", ["0532 111 22 33"])).toEqual(["+905321112233"]);
  });

  it("birincil yoksa yalnızca yedekler", () => {
    expect(telefonListesi(null, ["+905331112233"])).toEqual(["+905331112233"]);
  });

  it("geçersiz numaralar listeye girmiyor", () => {
    // Listeden bir numara seçilip kod oraya gönderilecek; sağlayıcının
    // reddedeceği bir değerin seçenek olarak sunulmasının anlamı yok.
    expect(telefonListesi("+905321112233", ["02121234567", "abc", ""])).toEqual([
      "+905321112233",
    ]);
  });

  it("hiç numara yoksa boş liste", () => {
    expect(telefonListesi(null, [])).toEqual([]);
  });
});

describe("ekTelefonlariCoz", () => {
  const patron = { role: "owner", birincil: "+905321112233" };

  it("boş gönderim sorun değil", () => {
    expect(ekTelefonlariCoz([], patron)).toEqual({ ok: true, deger: [] });
    expect(ekTelefonlariCoz(["", "  "], patron)).toEqual({ ok: true, deger: [] });
  });

  it("geçerli numaraları normalleştiriyor", () => {
    expect(ekTelefonlariCoz(["0533 111 22 33", "+90 534 111 22 33"], patron)).toEqual({
      ok: true,
      deger: ["+905331112233", "+905341112233"],
    });
  });

  it("garson hesabına yedek numara REDDEDİLİYOR", () => {
    /**
     * Arayüzde alan çizilmiyor ama form elle kurulabilir — kısıtın
     * gerçekten uygulandığı yer burası.
     */
    const sonuc = ekTelefonlariCoz(["+905331112233"], {
      role: "garson",
      birincil: "+905321112233",
    });
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toContain("Saha personeli");
  });

  it("garson için BOŞ gönderim hata vermiyor", () => {
    // Form alanı hiç çizilmediği için boş gelmesi normal; bunu hata
    // saymak garson düzenlemeyi tamamen imkânsız kılardı.
    expect(ekTelefonlariCoz([], { role: "garson", birincil: "+905321112233" })).toEqual({
      ok: true,
      deger: [],
    });
  });

  it("üst sınırı aşan gönderim reddediliyor", () => {
    const fazla = Array.from({ length: EN_COK_EK_TELEFON + 1 }, (_, i) =>
      `+9053${String(i).padStart(9, "0")}`.slice(0, 13),
    );
    expect(ekTelefonlariCoz(fazla, patron).ok).toBe(false);
  });

  it("tam sınırda kabul ediliyor", () => {
    const tam = ["+905331112233", "+905341112233", "+905351112233", "+905361112233"];
    expect(tam.length).toBe(EN_COK_EK_TELEFON);
    expect(ekTelefonlariCoz(tam, patron).ok).toBe(true);
  });

  it("geçersiz numara AÇIKÇA reddediliyor", () => {
    // Sessizce atmak, kullanıcının eklediğini sandığı bir numaranın
    // kaydedilmemesi demekti — ve bunu ancak koda ihtiyaç duyduğunda,
    // yani giremediğinde fark ederdi.
    const sonuc = ekTelefonlariCoz(["02121234567"], patron);
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toContain("02121234567");
  });

  it("birincille aynı numara SESSİZCE düşüyor", () => {
    // Burada hata vermek gereksiz bir engel: sonuç ikisinde de aynı.
    expect(ekTelefonlariCoz(["0532 111 22 33"], patron)).toEqual({ ok: true, deger: [] });
  });

  it("tekrarlanan yedekler bir kez yazılıyor", () => {
    expect(ekTelefonlariCoz(["0533 111 22 33", "+905331112233"], patron)).toEqual({
      ok: true,
      deger: ["+905331112233"],
    });
  });

  it("string olmayan girdiler yok sayılıyor", () => {
    // `formData.getAll()` File de döndürebilir.
    expect(ekTelefonlariCoz([null, 42, {}, "0533 111 22 33"], patron)).toEqual({
      ok: true,
      deger: ["+905331112233"],
    });
  });
});
