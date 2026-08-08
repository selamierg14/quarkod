import { requireUser } from "@/lib/auth";
import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Şifre değiştir" };

export default async function PasswordPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-lg font-semibold tracking-tight">Şifre değiştir</h1>
      <p className="mt-1 text-sm text-slate-500">
        {user.name} · {user.email}
      </p>

      <section className="mt-5 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <PasswordForm />
      </section>
    </div>
  );
}
