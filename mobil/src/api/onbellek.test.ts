import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Çevrimdışı önbellek.
 *
 * Buradaki bir hata sessiz olur ve kötü biçimde: ya çevrimdışı ekran yine
 * boş kalır (kullanıcı için hiçbir şey değişmemiş olur), ya da aylar
 * öncesinin listesi güncelmiş gibi gösterilir — ikincisi yardım değil,
 * yanlış bilgi.
 *
 * AsyncStorage taklit ediliyor: node ortamında gerçek depo yok.
 */

const depo = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (a: string) => depo.get(a) ?? null,
    setItem: async (a: string, d: string) => {
      depo.set(a, d);
    },
    removeItem: async (a: string) => {
      depo.delete(a);
    },
    getAllKeys: async () => [...depo.keys()],
    multiRemove: async (anahtarlar: string[]) => {
      for (const a of anahtarlar) depo.delete(a);
    },
  },
}));

const { onbellegiTemizle, onbellekOku, onbellekYaz } = await import("./onbellek");

beforeEach(() => {
  depo.clear();
  vi.useRealTimers();
});

describe("yazma ve okuma", () => {
  it("yazılan veri aynen geri geliyor", async () => {
    await onbellekYaz("/api/app/mekanlar", { adet: 2, mekanlar: [{ id: "m1" }] });
    expect(await onbellekOku("/api/app/mekanlar")).toEqual({
      adet: 2,
      mekanlar: [{ id: "m1" }],
    });
  });

  it("hiç yazılmamış yol null dönüyor", async () => {
    expect(await onbellekOku("/api/app/yok")).toBeNull();
  });

  it("yollar birbirine karışmıyor", async () => {
    // Sorgu parametreleri yolun parçası: filtreli liste, filtresizin
    // yerine geçmemeli.
    await onbellekYaz("/api/app/mekanlar", { adet: 52 });
    await onbellekYaz("/api/app/mekanlar?acik=1", { adet: 45 });

    expect(await onbellekOku("/api/app/mekanlar")).toEqual({ adet: 52 });
    expect(await onbellekOku("/api/app/mekanlar?acik=1")).toEqual({ adet: 45 });
  });
});

describe("eskime", () => {
  it("bir haftadan eski kayıt GÖSTERİLMİYOR", async () => {
    /**
     * Çevrimdışı bir kullanıcıya geçen ayın "şu an açık" listesini
     * sunmak yardım değil yanlış bilgi olurdu.
     */
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00Z"));
    await onbellekYaz("/api/app/mekanlar", { adet: 52 });

    vi.setSystemTime(new Date("2026-09-09T12:00:00Z"));
    expect(await onbellekOku("/api/app/mekanlar")).toBeNull();
  });

  it("bir haftanın içindeki kayıt geçerli", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00Z"));
    await onbellekYaz("/api/app/mekanlar", { adet: 52 });

    vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));
    expect(await onbellekOku("/api/app/mekanlar")).toEqual({ adet: 52 });
  });

  it("süresi dolan kayıt diskten de siliniyor", async () => {
    // Yoksa cihazda hiç okunmayacak veri birikiyor.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00Z"));
    await onbellekYaz("/api/app/mekanlar", { adet: 52 });

    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    await onbellekOku("/api/app/mekanlar");
    await vi.advanceTimersByTimeAsync(0);

    expect(depo.size).toBe(0);
  });
});

describe("dayanıklılık", () => {
  it("bozuk JSON çökertmiyor, null dönüyor", async () => {
    // Yarım yazılmış bir kayıt (disk dolu, uygulama öldürüldü) yüzünden
    // uygulamanın açılışta çökmesi kabul edilemez.
    depo.set("onbellek:/api/app/mekanlar", "{bu json degil");
    expect(await onbellekOku("/api/app/mekanlar")).toBeNull();
  });

  it("temizleme YALNIZCA önbellek anahtarlarını siliyor", async () => {
    /**
     * Çıkışta çağrılıyor ve aynı depoda başka şeyler de olabilir;
     * `clear()` çağırmak, uygulamanın ilgisiz tercihlerini de silerdi.
     */
    await onbellekYaz("/api/app/profil", { ad: "Deneme" });
    depo.set("baska_uygulama_verisi", "kalmali");

    await onbellegiTemizle();

    expect(depo.has("baska_uygulama_verisi")).toBe(true);
    expect(await onbellekOku("/api/app/profil")).toBeNull();
  });
});
