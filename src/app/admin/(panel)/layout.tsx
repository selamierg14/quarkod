import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveAccount } from "@/lib/impersonation";
import { exitAccount } from "./hesaplar/actions";
import { logout } from "../giris/actions";
import { AdminNav } from "@/components/AdminNav";

export const dynamic = "force-dynamic";

const ROL_ADI: Record<string, string> = {
  superadmin: "Platform yöneticisi",
  owner: "Hesap sahibi",
  manager: "İşletme sorumlusu",
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();
  const aktifHesap = await getActiveAccount(user);

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Platform yöneticisi bir kiracıyı görüntülüyorsa bu bant hep üstte
          durur: yanlışlıkla müşterinin verisinde işlem yapmayı önler. */}
      {aktifHesap ? (
        <div className="print-hidden flex flex-wrap items-center justify-between gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-900">
          <span>
            <span className="font-semibold">{aktifHesap.name}</span> hesabını
            görüntülüyorsunuz. Yaptığınız işlemler bu hesaba yazılır.
          </span>
          <form action={exitAccount}>
            <button
              type="submit"
              className="rounded-lg bg-amber-900 px-3 py-1 text-xs font-medium text-white"
            >
              Görüntülemeden çık
            </button>
          </form>
        </div>
      ) : null}

      <header className="print-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="font-semibold tracking-tight">
            Memnuniyet Paneli
          </Link>
          <div className="flex items-center gap-3">
            {/* Profil artık sekmede; başlıktaki bu satır yalnızca kimin
                oturumda olduğunu gösteren bir etiket. */}
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user.name} · {ROL_ADI[user.role]}
            </span>
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
        <AdminNav
          isOwner={user.role !== "manager"}
          isSuperadmin={user.role === "superadmin"}
        />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
