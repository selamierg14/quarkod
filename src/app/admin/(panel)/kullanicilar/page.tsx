import bcrypt from "bcryptjs";
import { KeyRound, Pencil, User as UserIcon, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireKullaniciYonetimi, userScope, visibleBusinesses } from "@/lib/auth";
import { ResetPasswordForm, ToggleUserButton } from "./UserForms";
import { SEED_SIFRESI } from "./sabitler";
import { ROL_ADLARI } from "@/lib/constants";
import { acilabilirRoller } from "@/lib/panel";
import { Alert, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { KullaniciFiltreleri } from "./KullaniciFiltreleri";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kullanıcılar" };

/** Rol rozeti — renk değil, ton farkı: satırda tek bir vurgu rengi kalsın. */
function RolRozeti({ rol }: { rol: string }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-chip bg-sunken px-2 py-0.5 text-caption font-medium text-ink-soft">
      {ROL_ADLARI[rol] ?? rol}
    </span>
  );
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const owner = await requireKullaniciYonetimi();
  const params = await searchParams;
  const tek = (ad: string) => {
    const deger = params[ad];
    return (Array.isArray(deger) ? deger[0] : deger)?.trim() ?? "";
  };

  const filtreler = {
    q: tek("q"),
    rol: tek("rol"),
    durum: tek("durum"),
    isletme: tek("isletme"),
  };
  const filtreVar = Object.values(filtreler).some(Boolean);

  const isletmeler = await visibleBusinesses(owner);

  // Süzme veritabanında: onlarca işletmeli bir hesapta bütün kullanıcıları
  // çekip bellekte elemek hem yavaş hem gereksiz.
  const users = await prisma.user.findMany({
    where: {
      ...(await userScope(owner)),
      ...(filtreler.q
        ? {
            OR: [
              { name: { contains: filtreler.q, mode: "insensitive" as const } },
              { username: { contains: filtreler.q, mode: "insensitive" as const } },
              { email: { contains: filtreler.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(filtreler.rol ? { role: filtreler.rol } : {}),
      ...(filtreler.durum ? { active: filtreler.durum === "aktif" } : {}),
      // Bölge müdürünün işletmeleri ayrı tabloda; "bu işletmede kim var"
      // sorusu ikisini birden kapsamalı.
      ...(filtreler.isletme
        ? {
            OR: [
              { businessId: filtreler.isletme },
              { businesses: { some: { businessId: filtreler.isletme } } },
            ],
          }
        : {}),
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { business: true, businesses: { include: { business: true } } },
  });

  // Her satır için ayrı bir sorguyla "varsayılan şifre mi" sormak N+1'di;
  // cevap zaten yukarıdaki sorgunun getirdiği passwordHash'te.
  const seedFlags = await Promise.all(
    users.map(
      async (user) => [user.id, await bcrypt.compare(SEED_SIFRESI, user.passwordHash)] as const,
    ),
  );
  const usingSeed = new Map(seedFlags);
  const seedCount = seedFlags.filter(([, flag]) => flag).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        ikon={<Users className="h-4 w-4" aria-hidden="true" />}
        renk="indigo"
        title="Kullanıcılar"
        description="Panele giren ekip üyeleri, rolleri ve modül izinleri."
        action={
          <ButtonLink href="/admin/kullanicilar/ekle" size="sm">
            + Yeni kullanıcı
          </ButtonLink>
        }
      />

      <KullaniciFiltreleri
        degerler={filtreler}
        isletmeler={isletmeler.map((b) => ({ id: b.id, name: b.name }))}
        roller={acilabilirRoller(owner.role)}
        filtreVar={filtreVar}
      />

      {seedCount > 0 ? (
        <Alert tone="uyari" baslik={`${seedCount} hesap hâlâ kurulum şifresini kullanıyor`}>
          Sisteme gerçek veri girmeden önce <code>degistir123</code> şifresini
          değiştirin.
        </Alert>
      ) : null}

      {users.length === 0 ? (
        <EmptyState
          ikon={<Users className="h-5 w-5" aria-hidden="true" />}
          baslik={filtreVar ? "Bu filtreye uyan kullanıcı yok" : "Henüz kullanıcı yok"}
        >
          {filtreVar
            ? "Filtreleri temizleyip tekrar deneyin."
            : "Ekibinizi kurmak için ilk kullanıcıyı ekleyin."}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[720px] text-small">
            <thead className="border-b border-line text-left text-caption tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-2.5 font-medium">İsim</th>
                <th className="px-4 py-2.5 font-medium">Kullanıcı adı</th>
                <th className="px-4 py-2.5 font-medium">İletişim</th>
                <th className="px-4 py-2.5 font-medium">Rol</th>
                <th className="px-4 py-2.5 font-medium">İşletme</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((user) => (
                <tr key={user.id} className={user.active ? "" : "bg-canvas"}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {/* Boş bir kare yerine nötr bir avatar: satırın
                          başlangıcı gözle yakalanabilsin. */}
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-faint"
                      >
                        <UserIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <span
                          className={
                            user.active ? "font-medium" : "text-ink-faint line-through"
                          }
                        >
                          {user.name}
                        </span>
                        {user.id === owner.id ? (
                          <span className="ml-1.5 text-caption text-ink-faint">(siz)</span>
                        ) : null}
                        {usingSeed.get(user.id) ? (
                          <span className="ml-1.5 rounded bg-warning-soft px-1.5 py-0.5 text-caption text-warning-ink">
                            kurulum şifresi
                          </span>
                        ) : null}
                        {!user.active ? (
                          <span className="ml-1.5 text-caption text-ink-faint">pasif</span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  {/* Giriş kimliği; kutu içinde vurgulanınca satırdaki en
                      koyu leke o oluyordu — düz, soluk mono yeterli. */}
                  <td className="px-4 py-2.5 font-mono text-caption text-ink-muted">
                    {user.username}
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft">
                    <span className="block truncate">{user.email}</span>
                    <span className="block text-caption text-ink-faint tabular">
                      {user.phone ?? (
                        <span
                          className="text-rating"
                          title="2FA ve şifre sıfırlama için gerekli"
                        >
                          telefon yok
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <RolRozeti rol={user.role} />
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft">
                    {user.role === "bolge"
                      ? user.businesses.map((b) => b.business.name).join(", ") || "—"
                      : (user.business?.name ?? (user.role === "owner" ? "Hepsi" : "—"))}
                  </td>
                  <td className="px-4 py-2.5">
                    {/* Satırda tek bir dolu (birincil) aksiyon var: Düzenle.
                        Şifre sıfırlama nötr, pasifleştirme riskli — üçü aynı
                        görsel ağırlıkta olunca hangisinin tehlikeli olduğu
                        okunmuyordu. */}
                    <div className="flex items-center justify-end gap-1.5">
                      {user.id === owner.id ? null : (
                        <ButtonLink
                          href={`/admin/kullanicilar/${user.id}/duzenle`}
                          size="sm"
                          className="px-2"
                          title={`${user.name} — düzenle`}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          {/* İkon tek başına ekran okuyucuya bir şey
                              söylemiyor; title ipucu, asıl ad bu. */}
                          <span className="sr-only">Düzenle</span>
                        </ButtonLink>
                      )}
                      <ResetPasswordForm userId={user.id} />
                      <ToggleUserButton
                        userId={user.id}
                        active={user.active}
                        disabled={user.id === owner.id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-caption text-ink-faint">
        <KeyRound className="mr-1 inline h-3 w-3" aria-hidden="true" />
        Kullanıcılar silinmez, pasifleştirilir: pasif kullanıcı panele giremez
        ama geçmiş kayıtlarındaki adı ve işlem geçmişi yerinde kalır.
      </p>
    </div>
  );
}
