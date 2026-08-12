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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
      <h1 className="text-xl font-semibold tracking-tight">Yönetim paneli</h1>
      <p className="mt-1 text-small text-ink-muted">
        {/* 2FA kapalıyken "kod gönderilecek" demek kullanıcıyı bekletir. */}
        {twoFactorEnabled()
          ? "Kullanıcı adınızla girin. Güvenlik için telefonunuza bir doğrulama kodu gönderilir."
          : "Kullanıcı adınız ve şifrenizle girin."}
      </p>
      <LoginForm />
    </main>
  );
}
