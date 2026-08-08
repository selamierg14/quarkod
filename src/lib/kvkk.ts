/**
 * KVKK aydınlatma metni ve açık rıza ayarları.
 *
 * Metin değiştiğinde KVKK_VERSION'ı da artırın: her kayıtta hangi sürüme rıza
 * verildiği saklanır, sonradan "müşteri neyi onayladı" sorusu cevaplanabilir.
 */

export const KVKK_VERSION = "2026-08-v1";

/** İletişim bilgisinin saklanacağı gün sayısı. Sonrasında silinir. */
export const CONTACT_RETENTION_DAYS = 90;

export const CONTACT_TYPES = {
  telefon: "Telefon",
  eposta: "E-posta",
} as const;

export type ContactType = keyof typeof CONTACT_TYPES;

/**
 * Rıza kutusunun yanındaki tek cümlelik özet.
 *
 * Kutu, iletişim bilgisi girilmemiş olsa da ekranda durur; bu yüzden metin her
 * iki durumu da karşılamalı. Zorunluluk yalnızca iletişim bilgisi bırakıldığında
 * doğar: puan ve yorum açık rıza değil, meşru menfaat kapsamında işlenir.
 */
export function consentSummary(businessName: string): string {
  return `Aydınlatma metnini okudum. İletişim bilgisi bırakırsam ${businessName} ile paylaşılmasına ve yalnızca bu geri bildirim hakkında bana dönülmek üzere ${CONTACT_RETENTION_DAYS} gün saklanmasına açık rıza veriyorum.`;
}

/** Genişletilebilir aydınlatma metninin maddeleri. */
export function kvkkNotice(businessName: string) {
  return {
    title: "Kişisel verilerin korunması hakkında bilgilendirme",
    items: [
      {
        heading: "Veri sorumlusu",
        body: `${businessName}.`,
      },
      {
        heading: "Hangi veriyi alıyoruz",
        body:
          "Verdiğiniz puanlar ve yorumunuz. İsterseniz size dönebilmemiz için " +
          "bıraktığınız telefon numarası veya e-posta adresi. Adınızı sormuyoruz.",
      },
      {
        heading: "Niçin",
        body:
          "Puan ve yorumlar hizmet kalitemizi ölçmek için; iletişim bilgisi " +
          "yalnızca bu geri bildirim hakkında size dönüş yapmak için kullanılır. " +
          "Pazarlama amacıyla kullanılmaz, üçüncü kişilerle paylaşılmaz.",
      },
      {
        heading: "Hukuki dayanak",
        body:
          "Puan ve yorumlar, hizmetimizi geliştirmeye yönelik meşru menfaatimiz " +
          "kapsamında işlenir. İletişim bilgisi yalnızca açık rızanızla saklanır — " +
          "boş bırakırsanız geri bildiriminiz yine kaydedilir.",
      },
      {
        heading: "Ne kadar süreyle",
        body:
          `İletişim bilgisi en fazla ${CONTACT_RETENTION_DAYS} gün saklanır ve ` +
          "sonra otomatik olarak silinir. Puan ve yorumlar, kimliğinizle " +
          "ilişkilendirilmeden istatistik amacıyla saklanmaya devam eder.",
      },
      {
        heading: "Haklarınız",
        body:
          "Verilerinize erişme, düzeltilmesini veya silinmesini isteme ve rızanızı " +
          "geri alma hakkınız var. Bunun için işletmeye başvurmanız yeterli; " +
          "iletişim bilginiz talebiniz üzerine derhal silinir.",
      },
    ],
  };
}
