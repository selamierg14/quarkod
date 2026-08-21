import Link from "next/link";
import { Mail, Phone, QrCode } from "lucide-react";
import {
  ILETISIM_EPOSTA,
  SITE_ADI,
  iletisimTelefonu,
  telefonHref,
} from "@/lib/site";

/**
 * Site altbilgisi.
 *
 * İç linklemenin ana taşıyıcısı: her sayfadan her sayfaya buradan
 * gidilebiliyor. Önceden yalnızca ana sayfa çapaları (#paketler gibi) ve
 * iki bağlantı vardı; vaka çalışmaları ile gizlilik sayfası hiçbir yerden
 * bağlantı almıyordu — arama motoru için de ziyaretçi için de görünmezdi.
 */
export function Footer() {
  const tel = iletisimTelefonu();

  return (
    <footer className="border-t border-line bg-surface py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xs">
          <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
            <span className="flex h-7 w-7 items-center justify-center rounded-control bg-brand text-brand-ink">
              <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            {SITE_ADI}
          </Link>
          <p className="mt-3 text-small text-ink-muted">
            QR ile masa başı müşteri geri bildirimi ve yönetim paneli.
          </p>

          {tel || ILETISIM_EPOSTA ? (
            <div className="mt-4 flex flex-col gap-2 text-small">
              {tel ? (
                <a
                  href={telefonHref(tel)}
                  className="inline-flex items-center gap-2 text-ink-soft hover:text-ink"
                >
                  <Phone className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                  {tel}
                </a>
              ) : null}
              {ILETISIM_EPOSTA ? (
                <a
                  href={`mailto:${ILETISIM_EPOSTA}`}
                  className="inline-flex items-center gap-2 text-ink-soft hover:text-ink"
                >
                  <Mail className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                  {ILETISIM_EPOSTA}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-x-10 gap-y-6 text-small sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <p className="font-medium text-ink">Ürün</p>
            <Link href="/#ozellikler" className="text-ink-muted hover:text-ink">
              Özellikler
            </Link>
            <Link href="/#nasil-calisir" className="text-ink-muted hover:text-ink">
              Nasıl çalışır
            </Link>
            <Link href="/#paketler" className="text-ink-muted hover:text-ink">
              Paketler
            </Link>
            <Link href="/#sss" className="text-ink-muted hover:text-ink">
              Sık sorulan sorular
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <p className="font-medium text-ink">Kaynaklar</p>
            <Link href="/vaka-calismalari" className="text-ink-muted hover:text-ink">
              Vaka çalışmaları
            </Link>
            <Link href="/gizlilik" className="text-ink-muted hover:text-ink">
              Gizlilik politikası
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <p className="font-medium text-ink">Hesap</p>
            <Link href="/deneme" className="text-ink-muted hover:text-ink">
              Ücretsiz dene
            </Link>
            <Link href="/admin/giris" className="text-ink-muted hover:text-ink">
              Giriş yap
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-caption text-ink-faint">
        <p>
          © {new Date().getFullYear()} {SITE_ADI}. Kayıt sırasında KVKK
          aydınlatma metni gösterilir.
        </p>
        <Link href="/gizlilik" className="hover:text-ink-soft">
          Gizlilik Politikası
        </Link>
      </div>
    </footer>
  );
}
