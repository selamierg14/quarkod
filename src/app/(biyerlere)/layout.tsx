import type { Metadata } from "next";
import { OturumSaglayici } from "./lib/OturumSaglayici";

/**
 * Biyerlere'nin (B2C keşfet/sadakat) kök kabuğu.
 *
 * Panelin (`/admin`) ve müşteri QR ekranlarının (`/f/[slug]/[table]`)
 * ikisinden de bilerek ayrı: panel kendi marka rengini kullanmaz, QR
 * ekranları o anki İŞLETMENİN markasını taşır — Biyerlere ise TEK, sabit
 * bir koyu tema kullanır çünkü tek bir işletmenin değil, onlarca mekanın
 * ortak vitrinidir. Bu yüzden global tema/@theme sistemine değil, doğrudan
 * Tailwind'in keyfi (arbitrary) renk değerlerine dayanıyor.
 *
 * Yalnızca oturum sağlayıcıyı ve zemin rengini kuruyor; başlık/alt menü gibi
 * görünür kabuk (app) alt grubunda, giriş/kayıt sadeliği ise (auth) alt
 * grubunda — ikisinin farklı ihtiyacı var (bkz. o klasörlerin layout.tsx'i).
 */
export const metadata: Metadata = {
  // `absolute` (default değil) bilerek: `default` kök layout'un kendi
  // template'inden ("%s · Quarkod") geçip "Biyerlere · Quarkod" üretirdi —
  // Biyerlere B2B panelden ayrı bir ürün, sekme başlığında Quarkod hiç
  // görünmemeli (bkz. Next.js metadata title.absolute belgesi).
  title: { absolute: "Biyerlere", template: "%s · Biyerlere" },
  description: "Şehrindeki canlı müzik, indirim ve mekanları keşfet.",
};

export default function BiyerlereLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#18191E] text-white">
      <OturumSaglayici>{children}</OturumSaglayici>
    </div>
  );
}
