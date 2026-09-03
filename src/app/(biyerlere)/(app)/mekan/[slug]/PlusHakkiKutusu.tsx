"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import { appAuthPost } from "../../../lib/api-istemci";
import { useOturum } from "../../../lib/OturumSaglayici";

/**
 * Biyerlere Plus'a ortak mekanlarda çıkan "günlük ücretsiz kahve" kutusu.
 *
 * Yalnızca GEÇERLİ Plus üyesine tıklanabilir bir düğme gösteriyor;
 * üye olmayana (ya da girişsize) aynı kutu düz bir tanıtım cümlesi olarak
 * kalıyor — üyeliği olmayan birine "talep et" düğmesi basıp 403 almasını
 * izletmek kötü bir deneyim olurdu.
 */
export function PlusHakkiKutusu({ businessId }: { businessId: string }) {
  const { oturum, yenile } = useOturum();
  const [durum, setDurum] = useState<"bekliyor" | "gonderiliyor" | "alindi">("bekliyor");
  const [hata, setHata] = useState<string | null>(null);

  const plusUyesiMi = oturum.durum === "girisli" && oturum.kullanici.plusUyeMi;

  async function talepEt() {
    setDurum("gonderiliyor");
    setHata(null);
    const sonuc = await appAuthPost<{ kupon: { code: string; discount: string } }>(
      "/api/app/plus-talep",
      { businessId },
    );
    if (!sonuc.ok) {
      setHata(sonuc.hata);
      setDurum("bekliyor");
      return;
    }
    setDurum("alindi");
    yenile();
  }

  return (
    <div className="rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-4">
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-[#F59E0B]" aria-hidden="true" />
        <h2 className="font-bold text-white">Biyerlere Plus ortağı</h2>
      </div>

      {durum === "alindi" ? (
        <p className="mt-2 text-small text-gray-200">
          ✓ Bugünün ücretsiz kahve kuponun cüzdanına eklendi.
        </p>
      ) : plusUyesiMi ? (
        <>
          <p className="mt-1 text-small text-gray-300">
            Plus üyesi olarak burada günde bir kez ücretsiz kahve alabilirsin.
          </p>
          <button
            type="button"
            onClick={talepEt}
            disabled={durum === "gonderiliyor"}
            className="mt-3 w-full rounded-control bg-[#F59E0B] py-2.5 text-small font-semibold text-[#18191E] transition active:scale-[0.97] duration-150 ease-out disabled:opacity-60"
          >
            {durum === "gonderiliyor" ? "Kontrol ediliyor…" : "Bugünün kahvesini al"}
          </button>
          {hata ? <p className="mt-2 text-caption text-[#FCA5A5]">{hata}</p> : null}
        </>
      ) : (
        <p className="mt-1 text-small text-gray-300">
          Biyerlere Plus üyeleri burada günde bir kez ücretsiz kahve alır.
        </p>
      )}
    </div>
  );
}
