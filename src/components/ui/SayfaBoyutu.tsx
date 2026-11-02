"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SAYFA_BOYUTLARI, type SayfaBoyutu as Boyut } from "@/lib/cekirdek/sayfalama";

/**
 * "Sayfada kaç kayıt" açılır listesi.
 *
 * Seçim ADRESTE taşınıyor (`?boyut=`), bileşenin içinde değil: liste
 * sunucuda sayfalanıyor ve boyut yalnızca istemcide dursaydı sunucu
 * yine 10 kayıt getirirdi. Adreste olmasının ikinci faydası, bağlantının
 * paylaşılabilir ve tarayıcı geçmişinde geri alınabilir olması.
 *
 * Boyut değişince SAYFA SIFIRLANIYOR: 10'luk listede 9. sayfadayken
 * 100'e geçen kullanıcı, 801. kayıttan başlayan (ve çoğu zaman boş olan)
 * bir ekran görürdü.
 *
 * Diğer süzgeçler korunuyor — mevcut sorgu kopyalanıp yalnızca iki
 * anahtara dokunuluyor; aksi halde boyutu değiştirmek uygulanmış
 * süzgeçleri sessizce siler.
 */
export function SayfaBoyutu({ boyut }: { boyut: Boyut }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function degistir(yeni: string) {
    const sonraki = new URLSearchParams(params.toString());
    sonraki.set("boyut", yeni);
    sonraki.delete("sayfa");
    router.push(`${pathname}?${sonraki.toString()}`);
  }

  return (
    <label className="flex items-center gap-1.5 text-small text-ink-muted">
      <span className="hidden sm:inline">Sayfada</span>
      <select
        value={boyut}
        onChange={(e) => degistir(e.target.value)}
        aria-label="Sayfada gösterilecek kayıt sayısı"
        className="h-9 rounded-control border border-line bg-surface px-2 text-small text-ink-soft"
      >
        {SAYFA_BOYUTLARI.map((secenek) => (
          <option key={secenek} value={secenek}>
            {secenek}
          </option>
        ))}
      </select>
    </label>
  );
}
