import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DENEME_GUN } from "@/lib/deneme";
import { Card, Overline } from "@/components/ui";
import { DenemeForm } from "./DenemeForm";
import { markaStili } from "@/lib/marka";
import { SITE_ADI } from "@/lib/site";
import { Breadcrumb } from "../_landing/Breadcrumb";
import { Footer } from "../_landing/Footer";
import { Header } from "../_landing/Header";

const MARKA_RENGI = "#4f46e5";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${DENEME_GUN} gün ücretsiz deneyin`,
  description:
    "Kredi kartı istemeden hesap açın. Masadaki QR ile müşteri memnuniyetini ölçün, şikayeti müşteri gitmeden duyun.",
  alternates: { canonical: "/deneme" },
};

const MADDELER = [
  "Masalara koyacağınız QR kartları — kod okutan müşteri 30 saniyede puanını bırakır",
  "Düşük puan geldiğinde e-posta ile anında haber",
  "Fotoğraflı QR menü ve ürün bazlı puanlama",
  "Vardiya, masa ve ürün kırılımıyla haftalık rapor",
];

export default async function DenemePage() {
  // Oturumu olan biri kayıt formunda ne arıyor — panele alalım.
  if (await getSession()) redirect("/admin");

  return (
    <main data-marka style={markaStili(MARKA_RENGI)} className="min-h-dvh bg-canvas">
      <Header />
      <Breadcrumb adimlar={[{ ad: "Ana sayfa", href: "/" }, { ad: "Ücretsiz deneme" }]} />

      <div className="mx-auto grid max-w-4xl gap-8 px-5 py-10 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:py-14">
        <div>
          <Overline>{SITE_ADI}</Overline>
          <h1 className="mt-2 text-display font-semibold text-ink">
            {DENEME_GUN} gün ücretsiz deneyin
          </h1>
          <p className="mt-3 text-body text-ink-soft">
            Kurulum yok, kredi kartı yok. Hesabınız açılır açılmaz ilk masanızın
            QR kodu hazır oluyor; telefonunuzla okutup akışın tamamını
            müşterinizin gözünden görebilirsiniz.
          </p>

          <ul className="mt-6 flex flex-col gap-2.5">
            {MADDELER.map((m) => (
              <li key={m} className="flex items-start gap-2.5 text-small text-ink-soft">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success-soft text-[10px] font-bold text-success-ink"
                >
                  ✓
                </span>
                {m}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-caption text-ink-muted">
            Zaten hesabınız var mı?{" "}
            <Link href="/admin/giris" className="underline underline-offset-2">
              Giriş yapın
            </Link>
          </p>
        </div>

        <Card>
          <DenemeForm />
        </Card>
      </div>

      <Footer />
    </main>
  );
}
