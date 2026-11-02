import { redirect } from "next/navigation";
import { getSession } from "@/lib/kimlik/auth";
import { twoFactorEnabled } from "@/lib/kimlik/otp";
import { LoginForm } from "./LoginForm";
import { PANEL_FONT_SINIFI } from "../fontlar";

export const dynamic = "force-dynamic";

export const metadata = { title: "Yönetim girişi" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/admin");

  return (
    <main
      data-tema="panel"
      className={`${PANEL_FONT_SINIFI} flex min-h-dvh flex-col items-center justify-center bg-kabuk px-5`}
    >
      <div className="w-full max-w-sm">
        <div
          aria-hidden="true"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-cta font-display text-xl font-bold text-cta-ink"
        >
          Q
        </div>
        <p className="mt-3 text-center font-display text-lg font-semibold text-white">Quarkod</p>

        <div className="mt-6 rounded-card bg-surface p-7">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Yönetim paneli</h1>
          <p className="mt-1 text-small text-ink-muted">
            {/* 2FA kapalıyken "kod gönderilecek" demek kullanıcıyı bekletir. */}
            {twoFactorEnabled()
              ? "Kullanıcı adınızla girin. Güvenlik için telefonunuza bir doğrulama kodu gönderilir."
              : "Kullanıcı adınız ve şifrenizle girin."}
          </p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
