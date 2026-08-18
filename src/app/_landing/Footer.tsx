import Link from "next/link";
import { QrCode } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
            <span className="flex h-7 w-7 items-center justify-center rounded-control bg-brand text-brand-ink">
              <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            Memnuniyet Paneli
          </Link>
          <p className="mt-3 text-small text-ink-muted">
            QR ile masa başı müşteri geri bildirimi ve yönetim paneli.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-6 text-small">
          <div className="flex flex-col gap-2">
            <p className="font-medium text-ink">Ürün</p>
            <a href="#ozellikler" className="text-ink-muted hover:text-ink">
              Özellikler
            </a>
            <a href="#paketler" className="text-ink-muted hover:text-ink">
              Paketler
            </a>
            <a href="#sss" className="text-ink-muted hover:text-ink">
              Sık sorulan sorular
            </a>
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

      <p className="mx-auto mt-10 max-w-6xl px-5 text-caption text-ink-faint">
        © {new Date().getFullYear()} Memnuniyet Paneli. Kayıt sırasında KVKK
        aydınlatma metni gösterilir.
      </p>
    </footer>
  );
}
