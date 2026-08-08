import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "../giris/actions";
import { AdminNav } from "@/components/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="print-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="font-semibold tracking-tight">
            Memnuniyet Paneli
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/sifre"
              className="hidden text-sm text-slate-500 hover:text-slate-900 sm:inline"
            >
              {user.name} · {user.role === "owner" ? "Patron" : "İşletme sorumlusu"}
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Çıkış
              </button>
            </form>
          </div>
        </div>
        <AdminNav isOwner={user.role === "owner"} />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
