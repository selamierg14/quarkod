import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Yönetim girişi" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ devam?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/admin");

  const { devam } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
      <h1 className="text-xl font-semibold tracking-tight">Yönetim paneli</h1>
      <p className="mt-1 text-sm text-slate-500">
        İşletme sorumlusu veya patron hesabınızla girin.
      </p>
      <LoginForm devam={devam ?? "/admin"} />
    </main>
  );
}
