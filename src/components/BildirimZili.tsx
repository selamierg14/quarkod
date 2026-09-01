"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  bildirimOku,
  bildirimlerimiGetir,
  tumBildirimleriOku,
  type BildirimOzet,
} from "@/app/admin/bildirim-actions";
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
  const [yuklendi, setYuklendi] = useState(false);
  const kutuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let iptal = false;

    async function yenile() {
      try {
        const sonuc = await bildirimlerimiGetir();
        if (iptal) return;
        setUnread(sonuc.unread);
        setItems(sonuc.items);
        setYuklendi(true);
      } catch {
        // Sessizce geç: zil özelliği panelin ana işlevi değil, bir hata
        // kullanıcıyı asıl işinden alıkoymamalı.
      }
    }

    yenile();
    const zamanlayici = setInterval(yenile, YOKLAMA_MS);
    return () => {
      iptal = true;
      clearInterval(zamanlayici);
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

  return (
    <div className="relative" ref={kutuRef}>
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        aria-label="Bildirimler"
        aria-expanded={acik}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-sunken"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {acik ? (
        <div className="absolute top-full right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-card bg-surface p-2 text-ink shadow-pop ring-1 ring-line">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-caption font-medium tracking-wide text-ink-muted uppercase">
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
            {!yuklendi ? (
              <p className="px-2 py-4 text-center text-small text-ink-faint">
                Yükleniyor…
              </p>
            ) : items.length === 0 ? (
              <p className="px-2 py-4 text-center text-small text-ink-faint">
                Henüz bildirim yok.
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
