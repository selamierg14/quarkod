"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell } from "lucide-react";
import {
  bildirimOku,
  bildirimlerimiGetir,
  tumBildirimleriOku,
  type BildirimOzet,
} from "@/app/admin/bildirim-actions";
import type { PlatformUyarisi } from "@/lib/rapor/platform-uyarilari";
import { formatDateTime } from "./ui";

/** Panel açıkken yeni bildirim ne kadar gecikmeyle görünsün. */
const YOKLAMA_MS = 45_000;

/**
 * Sağ üstteki bildirim zili — sidebar/header'daki profil rozetinin yanına
 * konuyor (bkz. AdminSidebar, layout, PersonelKabuk).
 *
 * Gerçek zamanlı değil, kısa aralıklı yoklama: panel zaten hiçbir yerde
 * WebSocket/SSE kullanmıyor, tek bir zil için o altyapıyı kurmak bu
 * özelliğin değeriyle orantısız olurdu. 45 saniyelik gecikme "vardiyana
 * atandın" gibi bir bilgi için yeterince hızlı.
 */
export function BildirimZili() {
  const [acik, setAcik] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<BildirimOzet[]>([]);
  const [uyarilar, setUyarilar] = useState<PlatformUyarisi[]>([]);
  const [yuklendi, setYuklendi] = useState(false);
  const kutuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let iptal = false;

    async function yenile() {
      // Zil hem AdminSidebar'ın mobil başlığında hem de panel layout'unun
      // masaüstü çubuğunda duruyor; biri `lg:hidden`, diğeri `hidden
      // lg:flex`. CSS bir React bileşenini söküp atmadığı için ikisi de
      // her zaman monte oluyordu ve görünmeyen kopya da 45 saniyede bir
      // sunucuya gidiyordu — her panel kullanıcısı için iki kat sorgu.
      // Görünmeyen kopya yoklamayı atlıyor (display:none olan öğenin hiç
      // istemci dikdörtgeni olmaz).
      if (kutuRef.current && kutuRef.current.getClientRects().length === 0) return;
      // Sekme arka plandayken yoklama duruyor. Panel açık bırakılan bir
      // sekme gün boyunca boşuna sorgu üretiyordu; kimse bakmadığı için o
      // sorguların hiçbirinin karşılığı ekrana çıkmıyor. Sekmeye dönüldüğü
      // anda aşağıdaki dinleyici bir kez tazeliyor, yani gecikme olmuyor.
      if (document.visibilityState === "hidden") return;
      try {
        const sonuc = await bildirimlerimiGetir();
        if (iptal) return;
        setUnread(sonuc.unread);
        setItems(sonuc.items);
        setUyarilar(sonuc.uyarilar);
        setYuklendi(true);
      } catch {
        // Sessizce geç: zil özelliği panelin ana işlevi değil, bir hata
        // kullanıcıyı asıl işinden alıkoymamalı.
      }
    }

    yenile();
    const zamanlayici = setInterval(yenile, YOKLAMA_MS);
    // Sekmeye geri dönüldüğünde bir sonraki turu beklemeden tazele:
    // kullanıcı ekrana baktığı anda güncel listeyi görsün.
    document.addEventListener("visibilitychange", yenile);
    return () => {
      iptal = true;
      clearInterval(zamanlayici);
      document.removeEventListener("visibilitychange", yenile);
    };
  }, []);

  useEffect(() => {
    if (!acik) return;
    function disariTiklandi(e: MouseEvent) {
      if (kutuRef.current && !kutuRef.current.contains(e.target as Node)) {
        setAcik(false);
      }
    }
    document.addEventListener("mousedown", disariTiklandi);
    return () => document.removeEventListener("mousedown", disariTiklandi);
  }, [acik]);

  async function tiklandi(bildirim: BildirimOzet) {
    if (!bildirim.read) {
      setItems((liste) =>
        liste.map((b) => (b.id === bildirim.id ? { ...b, read: true } : b)),
      );
      setUnread((n) => Math.max(0, n - 1));
      await bildirimOku(bildirim.id);
    }
    setAcik(false);
  }

  async function hepsiniOkunduIsaretle() {
    setItems((liste) => liste.map((b) => ({ ...b, read: true })));
    setUnread(0);
    await tumBildirimleriOku();
  }

  // Rozet: okunmamış bildirimler + çözülmemiş platform uyarıları.
  const rozet = unread + uyarilar.length;
  const uyariVar = uyarilar.some((u) => u.ciddiyet === "hata");

  return (
    <div className="relative" ref={kutuRef}>
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        aria-label={rozet > 0 ? `Bildirimler (${rozet} yeni)` : "Bildirimler"}
        aria-expanded={acik}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-sunken"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {rozet > 0 ? (
          <span
            aria-hidden="true"
            className={`absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ${
              uyariVar || unread > 0 ? "bg-danger" : "bg-warning"
            }`}
          >
            {rozet > 9 ? "9+" : rozet}
          </span>
        ) : null}
      </button>

      {acik ? (
        <div className="absolute top-full right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-card bg-surface p-2 text-ink shadow-pop ring-1 ring-line">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-small font-medium text-ink-muted">
              Bildirimler
            </span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={hepsiniOkunduIsaretle}
                className="text-caption font-medium text-accent-700 hover:underline"
              >
                Tümünü okundu işaretle
              </button>
            ) : null}
          </div>

          <div className="mt-1 max-h-96 overflow-y-auto">
            {uyarilar.length > 0 ? (
              <div className="mb-2">
                <p className="px-2 pb-1 text-small font-semibold text-ink-faint">
                  Dikkat gerekiyor
                </p>
                <ul className="flex flex-col gap-0.5">
                  {uyarilar.map((u) => (
                    <li key={u.anahtar}>
                      <Link
                        href={u.href}
                        onClick={() => setAcik(false)}
                        className="flex gap-2.5 rounded-control px-2.5 py-2 transition hover:bg-sunken"
                      >
                        <AlertTriangle
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            u.ciddiyet === "hata" ? "text-danger-ink" : "text-warning-ink"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block text-small font-medium text-ink-strong">
                            {u.baslik}
                          </span>
                          <span className="block text-caption text-ink-soft">{u.aciklama}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mx-2 mt-2 border-t border-line" aria-hidden="true" />
              </div>
            ) : null}
            {!yuklendi ? (
              <p className="px-2 py-4 text-center text-small text-ink-faint">
                Yükleniyor…
              </p>
            ) : items.length === 0 ? (
              <p className="px-2 py-4 text-center text-small text-ink-faint">
                {uyarilar.length > 0 ? "Başka bildirim yok." : "Henüz bildirim yok."}
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {items.map((bildirim) => {
                  const icerik = (
                    <>
                      <p className="text-small font-medium text-ink-strong">
                        {bildirim.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-caption text-ink-soft">
                        {bildirim.body}
                      </p>
                      <p className="mt-1 text-caption text-ink-faint">
                        {formatDateTime(new Date(bildirim.createdAt))}
                      </p>
                    </>
                  );
                  const sinif = `block rounded-control px-2.5 py-2 transition hover:bg-sunken ${
                    bildirim.read ? "" : "bg-accent-50"
                  }`;
                  return (
                    <li key={bildirim.id}>
                      {bildirim.url ? (
                        <Link
                          href={bildirim.url}
                          onClick={() => tiklandi(bildirim)}
                          className={sinif}
                        >
                          {icerik}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => tiklandi(bildirim)}
                          className={`${sinif} w-full text-start`}
                        >
                          {icerik}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
