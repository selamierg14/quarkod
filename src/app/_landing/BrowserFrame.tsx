import Image from "next/image";

/**
 * Gerçek panel görüntülerini tarayıcı penceresi çerçevesi içinde gösterir.
 *
 * `next/image` ile: kaynak PNG'ler 1440px genişliğinde ve 100-135 KB;
 * ziyaretçinin ekranına göre küçültülüp modern biçime çevriliyor.
 */
export function BrowserFrame({
  src,
  alt,
  label,
  oncelikli = false,
  className = "",
}: {
  src: string;
  alt: string;
  label?: string;
  /** İlk ekranda görünüyorsa true. */
  oncelikli?: boolean;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-card bg-ink shadow-pop ring-1 ring-ink/10 ${className}`}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" aria-hidden="true" />
        </div>
        {label ? (
          <span className="mx-auto -ml-6 rounded-full bg-white/10 px-3 py-0.5 text-caption text-white/70">
            {label}
          </span>
        ) : null}
      </div>
      <div className="aspect-[1440/900] w-full overflow-hidden bg-surface">
        <Image
          src={src}
          alt={alt}
          width={1440}
          height={900}
          sizes="(min-width: 1024px) 900px, 100vw"
          priority={oncelikli}
          className="h-full w-full object-cover object-top"
        />
      </div>
    </div>
  );
}
