import { describe, expect, it } from "vitest";
import { yanitEngeli, yanitlanabilir } from "./yanit";

/**
 * Müşteriye yanıt KVKK'nın açık rıza sınırına dayanıyor. Buradaki bir kırmızı,
 * rıza vermemiş ya da bilgisi silinmiş bir müşteriye mesaj gitmesi demek —
 * hem hukuki hem güven açısından en pahalı hata.
 */
describe("yanitEngeli", () => {
  const temel = { consentGiven: true, contactInfo: "0532...", contactErasedAt: null };

  it("rıza + iletişim + silinmemişse yanıt açık", () => {
    expect(yanitEngeli(temel)).toBeNull();
    expect(yanitlanabilir(temel)).toBe(true);
  });

  it("rıza yoksa engeller", () => {
    expect(yanitEngeli({ ...temel, consentGiven: false })).toMatch(/rıza/);
    expect(yanitlanabilir({ ...temel, consentGiven: false })).toBe(false);
  });

  it("iletişim bilgisi yoksa engeller", () => {
    expect(yanitEngeli({ ...temel, contactInfo: null })).toMatch(/bırakmamış/);
  });

  it("bilgi silinmişse engeller", () => {
    // Saklama süresi dolup silinen numaraya yanıt gitmemeli.
    expect(yanitEngeli({ ...temel, contactErasedAt: new Date() })).toMatch(/silinmiş/);
  });

  it("rıza yoksa iletişim dolu olsa da engel rızadan gelir", () => {
    // Öncelik sırası: rıza en başta kontrol edilir.
    expect(yanitEngeli({ consentGiven: false, contactInfo: "x", contactErasedAt: null })).toMatch(
      /rıza/,
    );
  });
});
