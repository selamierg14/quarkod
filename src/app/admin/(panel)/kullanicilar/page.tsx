import { prisma } from "@/lib/db";
import {
  actingAccountId,
  requireOwner,
  userScope,
  visibleBusinesses,
} from "@/lib/auth";
import { NewUserForm, ResetPasswordForm, ToggleUserButton } from "./UserForms";
import { usesSeedPassword } from "./actions";
import { ROL_ADLARI } from "@/lib/constants";
import { acilabilirRoller } from "@/lib/panel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kullanıcılar" };

export default async function UsersPage() {
  const owner = await requireOwner();

  // Her iki sorgu da hesap kapsamıyla sınırlı: bir kiracı diğerinin
  // kullanıcılarını veya işletmelerini göremez.
  const [users, businesses] = await Promise.all([
    prisma.user.findMany({
      where: await userScope(owner),
      orderBy: [{ role: "asc" }, { name: "asc" }],
      include: { business: true, businesses: { include: { business: true } } },
    }),
    visibleBusinesses(owner),
  ]);

  // Yeni kullanıcının açılacağı hesap: platform yöneticisi için "girilen"
  // hesap, diğerleri için kendi hesabı.
  const hedefHesapId = await actingAccountId(owner);
  const hedefHesap = hedefHesapId
    ? await prisma.account.findUnique({
        where: { id: hedefHesapId },
        select: { name: true },
      })
    : null;

  const seedFlags = await Promise.all(
    users.map(async (user) => [user.id, await usesSeedPassword(user.id)] as const),
  );
  const usingSeed = new Map(seedFlags);
  const seedCount = seedFlags.filter(([, flag]) => flag).length;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-title font-semibold">Kullanıcılar</h1>

      {seedCount > 0 ? (
        <p className="rounded-control bg-warning-soft px-4 py-3 text-small text-warning-ink">
          {seedCount} hesap hâlâ kurulum şifresini (<code>degistir123</code>)
          kullanıyor. Sisteme gerçek veri girmeden önce bunları değiştirin.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-control bg-surface ring-1 ring-line">
        <table className="w-full min-w-[640px] text-small">
          <thead className="border-b border-line text-left text-caption tracking-wide text-ink-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Ad</th>
              <th className="px-4 py-3 font-medium">Kullanıcı adı</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium">E-posta</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">İşletme</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => (
              <tr key={user.id} className={user.active ? "" : "bg-canvas"}>
                <td className="px-4 py-3">
                  <span className={user.active ? "" : "text-ink-faint line-through"}>
                    {user.name}
                  </span>
                  {user.id === owner.id ? (
                    <span className="ml-2 text-caption text-ink-faint">(siz)</span>
                  ) : null}
                  {usingSeed.get(user.id) ? (
                    <span className="ml-2 rounded bg-warning-soft px-1.5 py-0.5 text-caption text-warning-ink">
                      kurulum şifresi
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {/* Giriş kimliği bu; kopyalanabilsin diye tek parça. */}
                  <code className="rounded bg-sunken px-1.5 py-0.5 text-caption text-ink-soft">
                    {user.username}
                  </code>
                </td>
                <td className="px-4 py-3 text-ink-soft tabular">
                  {user.phone ?? (
                    <span className="text-rating" title="2FA ve şifre sıfırlama için gerekli">
                      yok
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-soft">{user.email}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {ROL_ADLARI[user.role] ?? user.role}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {user.role === "bolge"
                    ? // Bölge müdürünün işletmeleri ayrı tabloda; kaç tanesine
                      // baktığı listede tek bakışta görünmeli.
                      user.businesses.map((b) => b.business.name).join(", ") || "—"
                    : (user.business?.name ??
                      (user.role === "owner" || user.role === "viewer" ? "Hepsi" : "—"))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
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

      <section className="rounded-control bg-surface p-5 ring-1 ring-line">
        <h2 className="text-caption font-medium tracking-wide text-ink-muted uppercase">
          Yeni kullanıcı
        </h2>

        {/* "Hangi kafeye kullanıcı açıyorum?" sorusu formun en kritik ama en
            görünmez parçasıydı: kullanıcı her zaman içinde bulunulan hesaba
            açılır ve o hesabın TÜM işletmelerini görür. */}
        <p className="mt-1 mb-4 text-small text-ink-muted">
          {hedefHesap ? (
            <>
              Bu kullanıcı{" "}
              <span className="font-medium text-ink">{hedefHesap.name}</span>{" "}
              hesabına açılacak ve bu hesaptaki{" "}
              {businesses.length > 0 ? (
                <span className="font-medium text-ink">
                  {businesses.map((b) => b.name).join(", ")}
                </span>
              ) : (
                "işletmeleri"
              )}{" "}
              görebilecek.
            </>
          ) : (
            "Kullanıcı, içinde bulunduğunuz hesaba açılır."
          )}
        </p>

        <NewUserForm
          businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
          roller={acilabilirRoller(owner.role)}
        />
      </section>
    </div>
  );
}
