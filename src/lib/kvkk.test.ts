import { describe, expect, it } from "vitest";
import {
  CONTACT_RETENTION_DAYS,
  CONTACT_TYPES,
  KVKK_VERSION,
  consentSummary,
  kvkkNotice,
} from "./kvkk";

describe("KVKK metinleri", () => {
  it("rıza cümlesi işletme adını ve saklama süresini içerir", () => {
    const metin = consentSummary("Ege Cunda Balık");
    expect(metin).toContain("Ege Cunda Balık");
    expect(metin).toContain(String(CONTACT_RETENTION_DAYS));
  });

  it("aydınlatma metni zorunlu başlıkları kapsar", () => {
    const notice = kvkkNotice("Sahne Marin");
    const basliklar = notice.items.map((item) => item.heading);

    // KVKK aydınlatma yükümlülüğünün asgari unsurları.
    expect(basliklar).toContain("Veri sorumlusu");
    expect(basliklar).toContain("Hukuki dayanak");
    expect(basliklar).toContain("Ne kadar süreyle");
    expect(basliklar).toContain("Haklarınız");
  });

  it("veri sorumlusu olarak işletmenin kendisi gösterilir", () => {
    const notice = kvkkNotice("Sahne Marin");
    const sorumlu = notice.items.find((i) => i.heading === "Veri sorumlusu");
    expect(sorumlu?.body).toContain("Sahne Marin");
  });

  it("metin sürümü kayıtlıdır", () => {
    // Rıza kaydında hangi metne onay verildiği saklanabilsin diye.
    expect(KVKK_VERSION).toMatch(/\d{4}-\d{2}/);
  });

  it("iletişim kanalı yalnızca telefon veya e-posta olabilir", () => {
    expect(Object.keys(CONTACT_TYPES).sort()).toEqual(["eposta", "telefon"]);
  });
});
