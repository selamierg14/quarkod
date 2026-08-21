/**
 * Paylaşım görselleri ve favicon için Quarkod işareti.
 *
 * Daha önce burada "▦" karakteri vardı; ImageResponse'un gömdüğü varsayılan
 * fontta bu glif bulunmadığı için üretilen PNG'de boş kutu (tofu) çıkıyordu.
 * İşaret artık fonta hiç dokunmadan, kutularla çiziliyor — hangi boyutta
 * üretilirse üretilsin aynı görünüyor.
 */
export function QrIsareti({
  boyut,
  renk = "#ffffff",
}: {
  boyut: number;
  /** Karekodun mürekkep rengi; zemin saydam bırakılır. */
  renk?: string;
}) {
  const kose = boyut * 0.38;
  const cizgi = Math.max(1, boyut * 0.085);
  const nokta = boyut * 0.2;

  /** Karekodun köşelerindeki hizalama kareleri: içi boş çerçeve + göz. */
  const cerceve = (stil: Record<string, number | string>) => (
    <div
      style={{
        position: "absolute",
        width: kose,
        height: kose,
        border: `${cizgi}px solid ${renk}`,
        borderRadius: boyut * 0.06,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...stil,
      }}
    >
      <div
        style={{
          width: kose * 0.22,
          height: kose * 0.22,
          background: renk,
          borderRadius: boyut * 0.02,
        }}
      />
    </div>
  );

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: boyut,
        height: boyut,
      }}
    >
      {cerceve({ top: 0, left: 0 })}
      {cerceve({ top: 0, right: 0 })}
      {cerceve({ bottom: 0, left: 0 })}
      <div
        style={{
          position: "absolute",
          right: boyut * 0.09,
          bottom: boyut * 0.09,
          width: nokta,
          height: nokta,
          background: renk,
          borderRadius: boyut * 0.03,
          display: "flex",
        }}
      />
    </div>
  );
}
