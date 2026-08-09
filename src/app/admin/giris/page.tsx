import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Yönetim girişi" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/admin");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
      <h1 className="text-xl font-semibold tracking-tight">Yönetim paneli</h1>
      <p className="mt-1 text-sm text-slate-500">
        Kullanıcı adınızla girin. Güvenlik için telefonunuza bir doğrulama kodu
        gönderilir.
      </p>
      <LoginForm />
    </main>
  );
}
