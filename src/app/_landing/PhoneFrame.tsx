/** Gerçek müşteri ekranı görüntülerini telefon çerçevesi içinde gösterir. */
export function PhoneFrame({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`w-[240px] overflow-hidden rounded-[2rem] bg-ink p-2 shadow-pop ring-1 ring-ink/10 ${className}`}
    >
      <div className="aspect-[9/19.5] w-full overflow-hidden rounded-[1.5rem] bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover object-top" />
      </div>
    </div>
  );
}
