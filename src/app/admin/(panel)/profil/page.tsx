import Link from "next/link";
import { requireUser, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/constants";
import { PasswordForm } from "../sifre/PasswordForm";
import { SettingsForm } from "../isletmeler/[id]/SettingsForm";
import { CategoryManager } from "../isletmeler/[id]/CategoryManager";
import { TableManager } from "../isletmeler/[id]/TableManager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Profil" };

const ROL_ADI: Record<string, string> = {
  superadmin: "Platform yöneticisi",
  owner: "Hesap sahibi",
  manager: "İşletme sorumlusu",
};

/**
 * Profil: kullanıcının kendi bilgileri ve şifresi.
 *
 * İşletme sorumlusu hiyerarşinin ucudur — altına başka kullanıcı ya da
 * işletme almaz ve tek bir işletmeye bakar. Bu yüzden ayrı bir "İşletmeler"
 * listesinde dolaşması anlamsız; işletmesinin ayarları doğrudan burada.
 */
export default async function ProfilePage() {
  const user = await requireUser();

  const kayit = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      account: { select: { name: true } },
      business: { select: { name: true } },
    },
  });

  // Sorumlunun tek işletmesi: ayarları burada göster.
  const businesses = await visibleBusinesses(user);
  const kendiIsletmesi =
    user.role === "manager" && businesses.length === 1
      ? await prisma.business.findUnique({
          where: { id: businesses[0].id },
          include: {
            categories: { orderBy: { sortOrder: "asc" } },
            tables: { orderBy: [{ isEntrance: "desc" }, { tableNumber: "asc" }] },
          },
        })
      : null;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-semibold tracking-tight">Profil</h1>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Hesap bilgileri
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Ad soyad</dt>
              <dd className="font-medium">{kayit?.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Kullanıcı adı</dt>
              <dd>
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  {kayit?.username}
                </code>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Telefon</dt>
              <dd className="tabular-nums">
                {kayit?.phone ?? (
                  <span className="text-amber-600">tanımlı değil</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">E-posta</dt>
              <dd className="text-slate-700">{kayit?.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Rol</dt>
              <dd>{ROL_ADI[kayit?.role ?? ""] ?? kayit?.role}</dd>
            </div>
            {kayit?.account ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Bağlı olduğu hesap</dt>
                <dd>{kayit.account.name}</dd>
              </div>
            ) : null}
            {kayit?.business ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">İşletme</dt>
                <dd>{kayit.business.name}</dd>
              </div>
            ) : null}
          </dl>

          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
            Ad, telefon ve e-posta değişikliği için hesap sahibinize başvurun.
          </p>
        </section>

        <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Şifre değiştir
          </h2>
          <div className="mt-4">
            <PasswordForm />
          </div>
        </section>
      </div>

      {/* İşletme sorumlusu için işletme ayarları burada; ayrı bir liste
          ekranında dolaşmasının anlamı yok, tek işletmesi var. */}
      {kendiIsletmesi ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <div>
              <h2 className="flex items-center gap-2 font-semibold tracking-tight">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: kendiIsletmesi.brandColor }}
                />
                {kendiIsletmesi.name}
              </h2>
              <p className="text-sm text-slate-500">
                {BUSINESS_TYPES[kendiIsletmesi.type as BusinessType] ??
                  kendiIsletmesi.type}{" "}
                · <code className="text-xs">/f/{kendiIsletmesi.slug}/…</code>
              </p>
            </div>
            <Link
              href={`/admin/isletmeler/${kendiIsletmesi.id}/qr`}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
            >
              QR kodlarını üret / yazdır
            </Link>
          </div>

          <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <h3 className="mb-4 text-xs font-medium tracking-wide text-slate-500 uppercase">
              İşletme ayarları
            </h3>
            <SettingsForm
              business={{
                id: kendiIsletmesi.id,
                name: kendiIsletmesi.name,
                type: kendiIsletmesi.type,
                address: kendiIsletmesi.address,
                googleReviewUrl: kendiIsletmesi.googleReviewUrl,
                brandColor: kendiIsletmesi.brandColor,
                notifyThreshold: kendiIsletmesi.notifyThreshold,
                googleRedirect: kendiIsletmesi.googleRedirect,
                qrCardText: kendiIsletmesi.qrCardText,
                logoUrl: kendiIsletmesi.logoUrl,
                coverUrl: kendiIsletmesi.coverUrl,
              }}
              isOwner={false}
            />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
              <h3 className="mb-4 text-xs font-medium tracking-wide text-slate-500 uppercase">
                Anket kategorileri
              </h3>
              <CategoryManager
                businessId={kendiIsletmesi.id}
                categories={kendiIsletmesi.categories.map((c) => ({
                  id: c.id,
                  name: c.name,
                  active: c.active,
                }))}
              />
            </section>

            <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
              <h3 className="mb-4 text-xs font-medium tracking-wide text-slate-500 uppercase">
                Masalar / QR noktaları
              </h3>
              <TableManager
                businessId={kendiIsletmesi.id}
                tables={kendiIsletmesi.tables.map((t) => ({
                  id: t.id,
                  tableNumber: t.tableNumber,
                  isEntrance: t.isEntrance,
                  active: t.active,
                }))}
              />
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
