import { IdCard, Lock, User } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROL_ADLARI } from "@/lib/constants";
import { PasswordForm } from "../sifre/PasswordForm";
import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/ui";
import { BildirimAyarlari } from "./BildirimAyarlari";

export const dynamic = "force-dynamic";

export const metadata = { title: "Profil" };

/**
 * Profil: yalnızca kullanıcının kendi bilgileri ve şifresi.
 *
 * İşletme ayarları, anket kategorileri ve masa/QR yönetimi burada değil —
 * her biri kendi modülünde (İşletme ayarları / Anket kategorileri /
 * Masalar & QR sekmeleri). Önceden işletme sorumlusu için bu üçü burada
 * kopyalanmıştı çünkü sidebar'da ona giden bir bağlantı yoktu; o bağlantı
 * artık panelMenusu()'nda var (bkz. src/lib/panel.ts, "manager" dalı), bu
 * yüzden kopya kaldırıldı — profil yalnızca profil olarak kaldı.
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
      business: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon={<User className="h-4 w-4" aria-hidden="true" />}
        renk="indigo"
        title="Profil"
        description="Hesap bilgileriniz ve şifreniz. Ad, telefon ve e-posta değişikliği hesap sahibinden geçer."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard ikon={<IdCard className="h-4 w-4" aria-hidden="true" />} renk="slate" title="Hesap bilgileri">
          <dl className="space-y-3 text-small">
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
                <dd>
                  {user.role === "manager" ? (
                    <Link
                      href={`/admin/isletmeler/${kayit.business.id}`}
                      className="text-accent-700 underline underline-offset-2 hover:text-accent-600"
                    >
                      {kayit.business.name} — ayarları aç
                    </Link>
                  ) : (
                    kayit.business.name
                  )}
                </dd>
              </div>
            ) : null}
          </dl>

          <p className="mt-4 border-t border-line pt-3 text-caption text-ink-faint">
            Ad, telefon ve e-posta değişikliği için hesap sahibinize başvurun.
          </p>
        </SectionCard>

        <SectionCard
          ikon={<Lock className="h-4 w-4" aria-hidden="true" />}
          renk="rose"
          title="Şifre değiştir"
          description="En az 8 karakter. Değişiklik hemen geçerli olur."
        >
          <PasswordForm />
        </SectionCard>
      </div>

      <BildirimAyarlari />
    </div>
  );
}
