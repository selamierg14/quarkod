import Link from "next/link";
import { requireUser, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BUSINESS_TYPES, type BusinessType, ROL_ADLARI } from "@/lib/constants";
import { PasswordForm } from "../sifre/PasswordForm";
import { SettingsForm } from "../isletmeler/[id]/SettingsForm";
import { CategoryManager } from "../isletmeler/[id]/CategoryManager";
import { TableManager } from "../isletmeler/[id]/TableManager";
import { masaSirala } from "@/lib/masa";

export const dynamic = "force-dynamic";

export const metadata = { title: "Profil" };

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
      <h1 className="text-title font-semibold">Profil</h1>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-control bg-surface p-5 ring-1 ring-line">
          <h2 className="text-caption font-medium tracking-wide text-ink-muted uppercase">
            Hesap bilgileri
          </h2>
          <dl className="mt-4 space-y-3 text-small">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Ad soyad</dt>
              <dd className="font-medium">{kayit?.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Kullanıcı adı</dt>
              <dd>
                <code className="rounded bg-sunken px-1.5 py-0.5 text-caption">
                  {kayit?.username}
                </code>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Telefon</dt>
              <dd className="tabular">
                {kayit?.phone ?? (
                  <span className="text-rating">tanımlı değil</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">E-posta</dt>
              <dd className="text-ink-soft">{kayit?.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Rol</dt>
              <dd>{ROL_ADLARI[kayit?.role ?? ""] ?? kayit?.role}</dd>
            </div>
            {kayit?.account ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Bağlı olduğu hesap</dt>
                <dd>{kayit.account.name}</dd>
              </div>
            ) : null}
            {kayit?.business ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">İşletme</dt>
                <dd>{kayit.business.name}</dd>
              </div>
            ) : null}
          </dl>

          <p className="mt-4 border-t border-line pt-3 text-caption text-ink-faint">
            Ad, telefon ve e-posta değişikliği için hesap sahibinize başvurun.
          </p>
        </section>

        <section className="rounded-control bg-surface p-5 ring-1 ring-line">
          <h2 className="text-caption font-medium tracking-wide text-ink-muted uppercase">
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <div>
              <h2 className="flex items-center gap-2 font-semibold tracking-tight">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: kendiIsletmesi.brandColor }}
                />
                {kendiIsletmesi.name}
              </h2>
              <p className="text-small text-ink-muted">
                {BUSINESS_TYPES[kendiIsletmesi.type as BusinessType] ??
                  kendiIsletmesi.type}{" "}
                · <code className="text-caption">/f/{kendiIsletmesi.slug}/…</code>
              </p>
            </div>
            <Link
              href={`/admin/isletmeler/${kendiIsletmesi.id}/qr`}
              className="rounded-control bg-ink px-4 py-2.5 text-small font-medium text-white"
            >
              QR kodlarını üret / yazdır
            </Link>
          </div>

          <section className="rounded-control bg-surface p-5 ring-1 ring-line">
            <h3 className="mb-4 text-caption font-medium tracking-wide text-ink-muted uppercase">
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
                iysBrandCode: kendiIsletmesi.iysBrandCode,
                logoUrl: kendiIsletmesi.logoUrl,
                coverUrl: kendiIsletmesi.coverUrl,
                instagramUrl: kendiIsletmesi.instagramUrl,
                wifiSsid: kendiIsletmesi.wifiSsid,
                wifiPassword: kendiIsletmesi.wifiPassword,
                announcement: kendiIsletmesi.announcement,
                announcementActive: kendiIsletmesi.announcementActive,
            yemeksepetiUrl: kendiIsletmesi.yemeksepetiUrl,
            getirUrl: kendiIsletmesi.getirUrl,
            trendyolUrl: kendiIsletmesi.trendyolUrl,
            migrosUrl: kendiIsletmesi.migrosUrl,
              }}
              isOwner={false}
            />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-control bg-surface p-5 ring-1 ring-line">
              <h3 className="mb-4 text-caption font-medium tracking-wide text-ink-muted uppercase">
                Anket kategorileri
              </h3>
              <CategoryManager
                businessId={kendiIsletmesi.id}
                categories={kendiIsletmesi.categories.map((c) => ({
                  id: c.id,
                  name: c.name,
                  active: c.active,
                  problemOptions: c.problemOptions,
                }))}
              />
            </section>

            <section className="rounded-control bg-surface p-5 ring-1 ring-line">
              <h3 className="mb-4 text-caption font-medium tracking-wide text-ink-muted uppercase">
                Masalar / QR noktaları
              </h3>
              <TableManager
                businessId={kendiIsletmesi.id}
                tables={masaSirala(kendiIsletmesi.tables).map((t) => ({
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
