import { ImageResponse } from "next/og";
import { QrIsareti } from "@/lib/og-isaret";

/** Tarayıcı sekmesi ve manifest ikonu — favicon.ico'nun yüksek çözünürlüklü hâli. */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
        }}
      >
        <QrIsareti boyut={300} />
      </div>
    ),
    size,
  );
}
