import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { twoFactorEnabled } from "@/lib/otp";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Yönetim girişi" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/admin");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-canvas via-canvas to-accent-50 px-5">
      <div className="w-full max-w-sm">
        <div
          aria-hidden="true"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 text-lg font-bold text-white shadow-card"
        >
          M
        </div>

        <div className="mt-6 rounded-card bg-surface p-7 shadow-card ring-1 ring-line">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Yönetim paneli</h1>
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
