"use client";

import { useRef, useState } from "react";
import {
  ANKET_MAX_DIM,
  COVER_MAX_WIDTH,
  LOGO_MAX_DIM,
  MENU_MAX_DIM,
  type ImageKind,
} from "@/lib/image";

/**
 * Görsel yükleme alanı.
 *
 * Küçültme tamamen tarayıcıda yapılır: seçilen dosya bir canvas'a çizilip
 * hedef boyuta indirgenir ve sıkıştırılmış bir data URI üretilir. Böylece
 * sunucuya megabaytlık dosya gitmez, depolama servisine ihtiyaç kalmaz ve
 * veritabanına birkaç KB'lik bir dize düşer.
 *
 * Değer gizli bir input ile forma taşınır; kaydetme dış formun server
 * action'ıyla olur.
 */
export function ImageUpload({
  name,
  kind,
  label,
  hint,
  initial,
  brandColor,
  onChange,
}: {
  name: string;
  kind: ImageKind;
  label: string;
  hint: string;
  initial: string | null;
  brandColor: string;
  /** Form alanı yerine doğrudan duruma yazan kullanımlar için. */
  onChange?: (value: string) => void;
}) {
  const [value, setValueState] = useState<string>(initial ?? "");

  function setValue(yeni: string) {
    setValueState(yeni);
    onChange?.(yeni);
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Lütfen bir görsel dosyası seçin.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await resizeImage(file, kind);
      setValue(dataUrl);
    } catch {
      setError("Görsel işlenemedi. Başka bir dosya deneyin.");
    } finally {
      setBusy(false);
    }
  }

  const isLogo = kind === "logo";
  const kareOnizleme = kind === "logo" || kind === "menu";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption text-ink-muted">{label}</span>

      <div className="flex items-center gap-4">
        {/* Önizleme */}
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={`${label} önizleme`}
            className={`shrink-0 object-cover ring-1 ring-line ${
              isLogo
                ? "h-16 w-16 rounded-full"
                : kareOnizleme
                  ? "h-16 w-16 rounded-chip"
                  : "h-16 w-28 rounded-chip"
            }`}
          />
        ) : (
          <div
            className={`flex shrink-0 items-center justify-center bg-sunken text-ink-faint ${
              kind === "logo"
                ? "h-16 w-16 rounded-full"
                : kind === "menu"
                  ? "h-16 w-16 rounded-chip"
                  : "h-16 w-28 rounded-chip"
            }`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 12h.008M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-chip border border-line bg-surface px-3 py-1.5 text-small text-ink-soft hover:bg-canvas disabled:opacity-60"
          >
            {busy ? "İşleniyor…" : value ? "Değiştir" : "Görsel seç"}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => setValue("")}
              className="rounded-chip px-2.5 py-1.5 text-small text-ink-muted hover:text-danger"
            >
              Kaldır
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />
      {/* Kaydedilecek değer; boş dize "kaldır" anlamına gelir. */}
      <input type="hidden" name={name} value={value} />

      <p className="text-caption text-ink-faint">{hint}</p>
      {error ? <p className="text-caption text-danger">{error}</p> : null}

      {/* Marka rengi, logo boşken önizleme kenarında ipucu olarak durur. */}
      <span className="sr-only" style={{ color: brandColor }} />
    </div>
  );
}

/** Dosyayı canvas ile küçültüp sıkıştırılmış data URI'ye çevirir. */
function resizeImage(file: File, kind: ImageKind): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("okunamadı"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("çözülemedi"));
      img.onload = () => {
        // Logo ve ürün fotoğrafı kare kırpılır; kapak oranını korur.
        const kareMi = kind === "logo" || kind === "menu";
        let { width, height } = img;

        if (kareMi) {
          // En büyük merkez kareyi al, sonra ölçekle. Menüde her ürün aynı
          // oranda görünmezse liste dağınık durur.
          const side = Math.min(width, height);
          const sx = (width - side) / 2;
          const sy = (height - side) / 2;
          const target = Math.min(kind === "logo" ? LOGO_MAX_DIM : MENU_MAX_DIM, side);
          const canvas = document.createElement("canvas");
          canvas.width = target;
          canvas.height = target;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("canvas yok"));
          ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);
          resolve(canvas.toDataURL("image/webp", 0.85));
          return;
        }

        // Kapak ve anket fotoğrafı: oranı koru, uzun kenarı sınırla.
        // Kanıt fotoğrafını kare kırpmak sorunun yarısını kesebilir.
        const enBoy = kind === "anket" ? ANKET_MAX_DIM : COVER_MAX_WIDTH;
        if (Math.max(width, height) > enBoy) {
          const oran = enBoy / Math.max(width, height);
          width = Math.round(width * oran);
          height = Math.round(height * oran);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas yok"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
