import { prisma } from "@/lib/db";
import { requireOwner, userScope, visibleBusinesses } from "@/lib/auth";
import { NewUserForm, ResetPasswordForm, ToggleUserButton } from "./UserForms";
import { usesSeedPassword } from "./actions";

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
      include: { business: true },
    }),
    visibleBusinesses(owner),
  ]);

  const seedFlags = await Promise.all(
    users.map(async (user) => [user.id, await usesSeedPassword(user.id)] as const),
  );
  const usingSeed = new Map(seedFlags);
  const seedCount = seedFlags.filter(([, flag]) => flag).length;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-semibold tracking-tight">Kullanıcılar</h1>

      {seedCount > 0 ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {seedCount} hesap hâlâ kurulum şifresini (<code>degistir123</code>)
          kullanıyor. Sisteme gerçek veri girmeden önce bunları değiştirin.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
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
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className={user.active ? "" : "bg-slate-50"}>
                <td className="px-4 py-3">
                  <span className={user.active ? "" : "text-slate-400 line-through"}>
                    {user.name}
                  </span>
                  {user.id === owner.id ? (
                    <span className="ml-2 text-xs text-slate-400">(siz)</span>
                  ) : null}
                  {usingSeed.get(user.id) ? (
                    <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                      kurulum şifresi
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {/* Giriş kimliği bu; kopyalanabilsin diye tek parça. */}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                    {user.username}
                  </code>
                </td>
                <td className="px-4 py-3 text-slate-600 tabular-nums">
                  {user.phone ?? (
                    <span className="text-amber-600" title="2FA ve şifre sıfırlama için gerekli">
                      yok
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3 text-slate-600">
                  {user.role === "owner" ? "Patron" : "İşletme sorumlusu"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {user.business?.name ?? (user.role === "owner" ? "Hepsi" : "—")}
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

      <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="mb-4 text-xs font-medium tracking-wide text-slate-500 uppercase">
          Yeni kullanıcı
        </h2>
        <NewUserForm
          businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
        />
      </section>
    </div>
  );
}
