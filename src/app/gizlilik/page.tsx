import type { Metadata } from "next";
import { markaStili } from "@/lib/marka";
import { CONTACT_RETENTION_DAYS } from "@/lib/kvkk";
import { ILETISIM_EPOSTA, SITE_ADI } from "@/lib/site";
import { Breadcrumb } from "../_landing/Breadcrumb";
import { Footer } from "../_landing/Footer";
import { Header } from "../_landing/Header";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description:
    "Quarkod'un kişisel verileri nasıl işlediği, ne kadar süreyle sakladığı ve KVKK kapsamındaki haklarınız.",
  alternates: { canonical: "/gizlilik" },
};

const MARKA_RENGI = "#4f46e5";

const BOLUMLER = [
  {
    baslik: "Hangi verileri işliyoruz",
    maddeler: [
      "**İşletme hesabı:** İşletme adı, yetkili adı, e-posta, telefon ve kullanıcı adı. Panele giriş ve iletişim için gerekli.",
      "**Müşteri geri bildirimi:** Verilen yıldız puanları, kategori puanları, serbest yorum ve isteğe bağlı fotoğraf. Ad soyad sorulmuyor — geri bildirim varsayılan olarak anonim.",
      "**İsteğe bağlı iletişim bilgisi:** Müşteri geri bildirim bırakırken kendi isteğiyle telefon veya e-posta girerse, yalnızca açık rızasıyla saklanır.",
      "**Teknik kayıtlar:** Tekrar eden gönderimleri ayıklamak için IP adresinin karması ve tarayıcı başına rastgele bir kimlik. Ham IP yalnızca ticari ileti izninin ispatı için, 6563 sayılı kanun gereği tutulur.",
      "**Bildirim aboneliği:** Panel kullanıcısı telefonuna anlık bildirim açarsa, tarayıcısının ürettiği bildirim adresi ve şifreleme anahtarları saklanır. Yalnızca o cihaza bildirim göndermeye yarar; konum ya da başka bir cihaz bilgisi toplanmaz. Kullanıcı bildirimleri kapattığında ya da çıkış yaptığında abonelik kapatılır.",
    ],
  },
  {
    baslik: "Neden işliyoruz",
    maddeler: [
      "Puan ve yorumlar hizmet kalitesini ölçmek için — işletmenin meşru menfaati kapsamında.",
      "İletişim bilgisi yalnızca o geri bildirim hakkında müşteriye dönüş yapmak için — açık rızaya dayanır.",
      "Bildirim aboneliği yalnızca kullanıcının kendi açtığı uyarıları iletmek için — açık rızaya dayanır, istendiği an kapatılabilir.",
      "Ticari elektronik ileti (kampanya duyurusu) yalnızca ayrı bir kutuyla verilen onaya dayanır ve İYS'ye bildirilir.",
    ],
  },
  {
    baslik: "Ne kadar süreyle saklıyoruz",
    maddeler: [
      `Müşterinin bıraktığı iletişim bilgisi ve fotoğraf en fazla **${CONTACT_RETENTION_DAYS} gün** saklanır.`,
      "Puan ve yorumlar, kimliğe bağlanmadan istatistik amacıyla saklanmaya devam eder.",
      "Ticari ileti izin kayıtları, mevzuatın ispat yükümlülüğü sürdüğü sürece tutulur.",
    ],
  },
  {
    baslik: "Kiminle paylaşıyoruz",
    maddeler: [
      "Geri bildirimler yalnızca ilgili işletmenin yetkili kullanıcılarına gösterilir. Bir işletme başka bir işletmenin verisini hiçbir koşulda göremez.",
      "Veriler pazarlama amacıyla üçüncü kişilere satılmaz veya devredilmez.",
      "Altyapı hizmet sağlayıcıları (sunucu, veritabanı, e-posta/SMS gönderimi) yalnızca hizmetin işleyişi için gereken ölçüde işleme yapar.",
    ],
  },
  {
    baslik: "Çerezler",
    maddeler: [
      "Panelde oturumu açık tutmak için zorunlu bir oturum çerezi kullanılır.",
      "QR sayfalarında, aynı kişinin arka arkaya gönderimini ayıklamak için tarayıcı başına rastgele bir kimlik tutulur.",
      "Reklam veya profilleme amaçlı üçüncü taraf çerezi kullanılmaz.",
    ],
  },
  {
    baslik: "Haklarınız",
    maddeler: [
      "Verilerinize erişme, düzeltilmesini veya silinmesini isteme hakkınız var.",
      "Verdiğiniz açık rızayı istediğiniz an geri alabilirsiniz.",
      "Ticari ileti almayı İYS üzerinden veya doğrudan işletmeye başvurarak durdurabilirsiniz.",
      "Talebiniz üzerine iletişim bilginiz derhal silinir.",
    ],
  },
];

/** **kalın** işaretlerini <strong>'a çevirir; metinler burada tanımlı, güvenli. */
function Vurgulu({ metin }: { metin: string }) {
  const parcalar = metin.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parcalar.map((parca, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-ink">
            {parca}
          </strong>
        ) : (
          <span key={i}>{parca}</span>
        ),
      )}
    </>
  );
}

export default function GizlilikPage() {
  return (
    <main data-marka style={markaStili(MARKA_RENGI)} className="min-h-dvh bg-canvas">
      <Header />
      <Breadcrumb adimlar={[{ ad: "Ana sayfa", href: "/" }, { ad: "Gizlilik Politikası" }]} />

      <article className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-display font-semibold tracking-tight text-ink">
          Gizlilik Politikası
        </h1>
        <p className="mt-3 text-body text-ink-soft">
          Bu metin, {SITE_ADI} hizmetini kullanan işletmelerin ve o işletmelere
          geri bildirim bırakan müşterilerin kişisel verilerinin nasıl
          işlendiğini açıklar.
        </p>

        <div className="mt-10 flex flex-col gap-8">
          {BOLUMLER.map((bolum) => (
            <section key={bolum.baslik}>
              <h2 className="text-title font-semibold text-ink">{bolum.baslik}</h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {bolum.maddeler.map((madde) => (
                  <li key={madde} className="flex gap-2.5 text-body leading-relaxed text-ink-soft">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span>
                      <Vurgulu metin={madde} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section>
            <h2 className="text-title font-semibold text-ink">Başvuru</h2>
            <p className="mt-3 text-body leading-relaxed text-ink-soft">
              Haklarınızı kullanmak için{" "}
              {ILETISIM_EPOSTA ? (
                <a
                  href={`mailto:${ILETISIM_EPOSTA}`}
                  className="font-medium text-brand underline underline-offset-2"
                >
                  {ILETISIM_EPOSTA}
                </a>
              ) : (
                "hizmeti aldığınız işletmeye ya da bize"
              )}{" "}
              başvurabilirsiniz. Geri bildirim bıraktığınız bir işletmeye
              ilişkin talepler için doğrudan o işletmeye başvurmanız da
              yeterlidir.
            </p>
          </section>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-caption text-ink-faint">
          Bu sayfa bilgilendirme amaçlıdır ve hukuki danışmanlık yerine geçmez.
          İşletmenizin kendi aydınlatma yükümlülüğü için bir hukukçuya
          danışmanızı öneririz.
        </p>
      </article>

      <Footer />
    </main>
  );
}
