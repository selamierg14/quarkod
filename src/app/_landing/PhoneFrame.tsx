import Image from "next/image";

/**
 * Gerçek müşteri ekranı görüntülerini telefon çerçevesi içinde gösterir.
 *
 * `next/image` kullanılıyor: PNG'ler 45-220 KB ve tanıtım sayfasında altı
 * tane birden var. Otomatik WebP/AVIF dönüşümü ve boyutlandırma, ilk açılış
 * ağırlığını belirgin biçimde düşürüyor.
 */
export function PhoneFrame({
  src,
  alt,
  oncelikli = false,
  className = "",
}: {
  src: string;
  alt: string;
  /** İlk ekranda görünüyorsa true — LCP görselini geciktirmeyelim. */
  oncelikli?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`w-[240px] overflow-hidden rounded-[2rem] bg-ink p-2 shadow-pop ring-1 ring-ink/10 ${className}`}
    >
      <div className="aspect-[9/19.5] w-full overflow-hidden rounded-[1.5rem] bg-surface">
        <Image
          src={src}
          alt={alt}
          width={240}
          height={520}
          sizes="240px"
          priority={oncelikli}
          className="h-full w-full object-cover object-top"
        />
      </div>
    </div>
  );
}
