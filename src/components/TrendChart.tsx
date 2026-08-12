import type { TrendPoint } from "@/lib/stats";

/**
 * Haftalık ortalama puan grafiği. Harici grafik kütüphanesi yok — düz SVG,
 * böylece sayfa hafif kalıyor ve baskıda da düzgün çıkıyor.
 *
 * Veri olmayan haftalar çizgide boşluk bırakır; sıfırmış gibi gösterilip
 * yanıltıcı bir düşüş yaratmasınlar.
 */
export function TrendChart({
  points,
  color,
  height = 120,
}: {
  points: TrendPoint[];
  color: string;
  height?: number;
}) {
  const width = 560;
  const padding = { top: 10, right: 8, bottom: 20, left: 24 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const withData = points.filter((point) => point.average !== null);
  if (withData.length < 2) {
    return (
      <p className="py-6 text-center text-small text-ink-faint">
        Trend için en az iki haftalık veri gerekiyor.
      </p>
    );
  }

  const x = (index: number) =>
    padding.left + (index / (points.length - 1)) * innerW;
  // Ölçek 1-5 arası sabit: haftadan haftaya eksen kayıp yanıltmasın.
  const y = (value: number) =>
    padding.top + innerH - ((value - 1) / 4) * innerH;

  // Veri olmayan haftalarda çizgiyi kes.
  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((point, index) => {
    if (point.average === null) {
      if (current.length > 1) segments.push(current.join(" "));
      current = [];
      return;
    }
    current.push(`${current.length === 0 ? "M" : "L"} ${x(index)} ${y(point.average)}`);
  });
  if (current.length > 1) segments.push(current.join(" "));

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`Haftalık ortalama puan grafiği. Son değer ${
          withData[withData.length - 1].average
        }.`}
      >
        {/* Dikey eksen başlığı: "bu sayılar ne?" sorusunu grafiğin içinde
            cevaplıyoruz; yan yana birden çok grafik olduğunda tek tek
            açıklama okumak zor. */}
        <text
          x={4}
          y={padding.top - 2}
          className="fill-ink-faint"
          style={{ fontSize: 8 }}
        >
          puan
        </text>

        {[1, 2, 3, 4, 5].map((value) => (
          <g key={value}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(value)}
              y2={y(value)}
              stroke={value === 3 ? "var(--color-line)" : "var(--color-sunken)"}
              strokeWidth={1}
            />
            <text
              x={padding.left - 6}
              y={y(value) + 3}
              textAnchor="end"
              className="fill-ink-faint"
              style={{ fontSize: 9 }}
            >
              {value}
            </text>
          </g>
        ))}

        {segments.map((segment) => (
          <path
            key={segment}
            d={segment}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {points.map((point, index) =>
          point.average === null ? null : (
            <circle
              key={point.start.toISOString()}
              cx={x(index)}
              cy={y(point.average)}
              r={2.5}
              fill={color}
            >
              <title>{`${point.label} haftası · ${point.average} ortalama · ${point.count} kayıt`}</title>
            </circle>
          ),
        )}

        {/* Son veri noktasını büyütüp değerini yazıyoruz: bakan kişinin ilk
            aradığı şey "şu an neredeyiz". */}
        {(() => {
          const sonIndex = points.reduce(
            (acc, p, i) => (p.average !== null ? i : acc),
            -1,
          );
          if (sonIndex < 0) return null;
          const son = points[sonIndex];
          const cx = x(sonIndex);
          const cy = y(son.average!);
          return (
            <g>
              <circle cx={cx} cy={cy} r={4} fill={color} />
              <text
                x={cx - 6}
                y={cy - 8}
                textAnchor="end"
                className="fill-ink-soft"
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {son.average!.toFixed(1)}
              </text>
            </g>
          );
        })()}

        {points.map((point, index) =>
          index % 2 === 0 ? (
            <text
              key={`etiket-${point.start.toISOString()}`}
              x={x(index)}
              y={height - 6}
              textAnchor="middle"
              className="fill-ink-faint"
              style={{ fontSize: 9 }}
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="sr-only">
        Son {points.length} haftanın ortalama yıldız puanı; dikey eksen 1 ile 5
        arasındadır.
      </figcaption>
    </figure>
  );
}

/** Son 30 gün ile önceki 30 günü karşılaştıran değişim rozeti. */
export function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="text-caption text-ink-faint" title="Karşılaştırma için yeterli veri yok">
        yeni
      </span>
    );
  }

  // 0.1'in altındaki oynamalar gürültü; "sabit" demek daha dürüst.
  if (Math.abs(delta) < 0.1) {
    return <span className="text-caption text-ink-muted">önceki aya göre sabit</span>;
  }

  const up = delta > 0;
  return (
    <span
      className={`text-caption font-medium ${up ? "text-success" : "text-danger"}`}
      title="Son 30 günün ortalaması, önceki 30 güne göre"
    >
      {up ? "▲" : "▼"} {Math.abs(delta).toFixed(2)} önceki aya göre
    </span>
  );
}
