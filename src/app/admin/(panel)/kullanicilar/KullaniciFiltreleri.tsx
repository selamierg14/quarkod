import Link from "next/link";
import { Search, X } from "lucide-react";
import { ROL_ADLARI } from "@/lib/constants";
import { buttonClass } from "@/components/ui";

const ALAN =
  "h-9 w-full rounded-control border border-line bg-surface px-3 text-small text-ink " +
  "placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-1 " +
  "focus-visible:outline-accent-600";

export type FiltreDegerleri = {
  q: string;
  rol: string;
  durum: string;
  isletme: string;
  hesap: string;
};

/**
 * Kullanıcı listesinin filtre şeridi.
 *
 * Bilerek `<form method="get">`: durum adres çubuğunda yaşıyor, sayfa
 * sunucuda süzülüyor. Böylece bir filtre bağlantısı paylaşılabiliyor,
 * geri tuşu çalışıyor ve listeyi daraltmak için istemciye tek satır JS
 * inmiyor — onlarca şirketin binlerce kullanıcısında asıl darboğaz zaten
 * istemci tarafı süzme olurdu.
 */
export function KullaniciFiltreleri({
  degerler,
  isletmeler,
  hesaplar,
  roller,
  filtreVar,
}: {
  degerler: FiltreDegerleri;
  isletmeler: { id: string; name: string }[];
  /** Yalnızca platform görünümünde dolu — orada süzgeç işletme değil hesap. */
  hesaplar: { id: string; name: string }[];
  roller: string[];
  filtreVar: boolean;
}) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-4"
    >
      <label className="min-w-[200px] flex-1">
        <span className="mb-1.5 block text-caption font-medium text-ink-muted">
          Ara
        </span>
        <input
          type="search"
          name="q"
          defaultValue={degerler.q}
          placeholder="Ad, kullanıcı adı veya e-posta"
          className={ALAN}
        />
      </label>

      {/* Platform görünümünde müşteri (hesap) bazlı süzme: sysadmin için
          "hangi şirketin kullanıcıları" asıl sorudur. */}
      {hesaplar.length > 0 ? (
        <label className="min-w-[170px]">
          <span className="mb-1.5 block text-caption font-medium text-ink-muted">
            Hesap
          </span>
          <select name="hesap" defaultValue={degerler.hesap} className={ALAN}>
            <option value="">Hepsi</option>
            {hesaplar.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {/* Şirket süzgeci asıl talep: bir hesapta onlarca işletme olunca
          "kim nerede çalışıyor" listeden okunamıyordu. */}
      {isletmeler.length > 1 ? (
        <label className="min-w-[170px]">
          <span className="mb-1.5 block text-caption font-medium text-ink-muted">
            İşletme
          </span>
          <select name="isletme" defaultValue={degerler.isletme} className={ALAN}>
            <option value="">Hepsi</option>
            {isletmeler.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="min-w-[150px]">
        <span className="mb-1.5 block text-caption font-medium text-ink-muted">
          Rol
        </span>
        <select name="rol" defaultValue={degerler.rol} className={ALAN}>
          <option value="">Hepsi</option>
          {roller.map((rol) => (
            <option key={rol} value={rol}>
              {ROL_ADLARI[rol] ?? rol}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-[130px]">
        <span className="mb-1.5 block text-caption font-medium text-ink-muted">
          Durum
        </span>
        <select name="durum" defaultValue={degerler.durum} className={ALAN}>
          <option value="">Hepsi</option>
          <option value="aktif">Aktif</option>
          <option value="pasif">Pasif</option>
        </select>
      </label>

      <div className="flex items-center gap-2">
        <button type="submit" className={buttonClass({ size: "sm" })}>
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Ara
        </button>
        {filtreVar ? (
          <Link
            href="/admin/kullanicilar"
            className={buttonClass({ variant: "ghost", size: "sm" })}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Temizle
          </Link>
        ) : null}
      </div>
    </form>
  );
}
