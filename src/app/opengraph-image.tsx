import { ImageResponse } from "next/og";
import { SITE_ADI } from "@/lib/site";
import { QrIsareti } from "@/lib/og-isaret";

/**
 * Paylaşım görseli (WhatsApp, X, LinkedIn önizlemesi).
 *
 * Önceden panel ekran görüntüsü (1440×900) OG görseli olarak veriliyordu;
 * platformların beklediği oran 1.91:1 olduğu için kenarlardan kırpılıyor ve
 * yazı okunmuyordu. Burada doğru boyutta, metni okunur bir kart üretiliyor.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_ADI} — QR ile müşteri memnuniyet sistemi`;

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #4338ca 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#818cf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <QrIsareti boyut={30} renk="#1e1b4b" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, opacity: 0.9 }}>{SITE_ADI}</div>
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: -1.5,
            maxWidth: 900,
          }}
        >
          Masadaki QR ile müşteri memnuniyetini ölçün
        </div>

        <div style={{ marginTop: 28, fontSize: 30, opacity: 0.75, maxWidth: 880 }}>
          Düşük puanı anında haber alın, yüksek puanı Google yorumuna yönlendirin.
        </div>

        <div
          style={{
            marginTop: 44,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              background: "#818cf8",
              color: "#0f172a",
              padding: "12px 26px",
              borderRadius: 999,
            }}
          >
            7 gün ücretsiz
          </div>
          <div style={{ opacity: 0.7 }}>Kredi kartı istemiyoruz</div>
        </div>
      </div>
    ),
    size,
  );
}
