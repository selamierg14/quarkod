import { requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveAccountId } from "@/lib/impersonation";
import { formatDateTime } from "@/components/ui";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/constants";
import {
  EnterAccountButton,
  NewAccountForm,
  SubscriptionForm,
  ToggleAccountButton,
} from "./AccountForms";
import { hesapAktifMi, kalanGun } from "@/lib/abonelik";

/** date input'unun beklediği yyyy-aa-gg; yerel saate göre. */
function dateInputValue(tarih: Date | null): string {
  if (!tarih) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${tarih.getFullYear()}-${p(tarih.getMonth() + 1)}-${p(tarih.getDate())}`;
}

export const dynamic = "force-dynamic";

export const metadata = { title: "Hesaplar" };

const ROL_ADI: Record<string, string> = {
  owner: "Hesap sahibi",
  manager: "İşletme sorumlusu",
};

export default async function AccountsPage() {
  const user = await requireSuperadmin();
  const aktifHesap = await getActiveAccountId(user);

  // Hiyerarşi tek sorguda: hesap → işletmeleri → o işletmenin sorumluları.
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      businesses: {
        orderBy: { createdAt: "asc" },
        include: {
          users: { select: { id: true, name: true, username: true, active: true } },
          _count: { select: { feedbacks: true, tables: true } },
        },
      },
      users: {
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          active: true,
          businessId: true,
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Hesaplar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sistemi kullanan müşteriler ve altlarındaki işletme/kullanıcı yapısı.
          Bir hesaba geçtiğinizde panel tam olarak o müşterinin gördüğü hale
          gelir.
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {accounts.map((account) => {
          // Hesap düzeyindeki kullanıcılar (sahipler) ile işletmeye bağlı
          // sorumluları ayırıyoruz: ağaçta kimin nerede durduğu belli olsun.
          const sahipler = account.users.filter((u) => !u.businessId);
          const goruntuleniyor = aktifHesap === account.id;
          // "Aktif" iki şeye birden bağlı: elle askıya alınmamış olmak ve
          // abonelik süresinin dolmamış olması.
          const calisiyor = hesapAktifMi(account);
          const gun = kalanGun(account);

          return (
            <li
              key={account.id}
              className={`overflow-hidden rounded-xl bg-white ring-1 ${
                goruntuleniyor ? "ring-2 ring-slate-900" : "ring-slate-200"
              }`}
            >
              {/* --- Hesap başlığı */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <span className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${calisiyor ? "" : "text-slate-400 line-through"}`}
                    >
                      {account.name}
                    </span>
                    {!account.active ? (
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700">
                        askıda
                      </span>
                    ) : null}
                    {account.active && !calisiyor ? (
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700">
                        süresi doldu
                      </span>
                    ) : null}
                    {calisiyor && gun !== null && gun <= 14 ? (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                        {gun} gün kaldı
                      </span>
                    ) : null}
                    {account.menuEnabled ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                        QR menü
                      </span>
                    ) : null}
                    {goruntuleniyor ? (
                      <span className="rounded bg-slate-900 px-1.5 py-0.5 text-xs text-white">
                        görüntüleniyor
                      </span>
                    ) : null}
                  </span>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {account.businesses.length} işletme · {account.users.length}{" "}
                    kullanıcı · {formatDateTime(account.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <EnterAccountButton accountId={account.id} active={calisiyor} />
                  <ToggleAccountButton
                    accountId={account.id}
                    active={account.active}
                  />
                </div>
              </div>

              <SubscriptionForm
                accountId={account.id}
                expiresAt={dateInputValue(account.expiresAt)}
                menuEnabled={account.menuEnabled}
              />

              {/* --- Hesap sahipleri */}
              <div className="px-4 py-2.5">
                <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                  Hesap sahipleri
                </p>
                {sahipler.length === 0 ? (
                  <p className="mt-1 text-sm text-amber-600">
                    Sahip yok — bu hesaba kimse giremez.
                  </p>
                ) : (
                  <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {sahipler.map((u) => (
                      <li key={u.id} className="text-sm">
                        <span className={u.active ? "" : "text-slate-400 line-through"}>
                          {u.name}
                        </span>
                        <code className="ml-1.5 rounded bg-slate-100 px-1 text-xs text-slate-600">
                          {u.username}
                        </code>
                        <span className="ml-1.5 text-xs text-slate-400">
                          {ROL_ADI[u.role] ?? u.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* --- İşletmeler ve altlarındaki sorumlular */}
              {account.businesses.length === 0 ? (
                <p className="px-4 pb-3 text-sm text-slate-400">
                  Henüz işletme eklenmemiş.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {account.businesses.map((business) => (
                    <li key={business.id} className="flex flex-wrap items-start gap-3 px-4 py-2.5">
                      {/* Girinti + çizgi: kimin altında olduğu görsel olarak belli. */}
                      <span className="mt-1.5 ml-1 h-3 w-3 shrink-0 rounded-bl border-b border-l border-slate-300" />

                      <div className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: business.brandColor }}
                          />
                          <span className="font-medium">{business.name}</span>
                          <code className="rounded bg-slate-100 px-1 text-xs text-slate-500">
                            /f/{business.slug}
                          </code>
                        </span>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {BUSINESS_TYPES[business.type as BusinessType] ?? business.type} ·{" "}
                          {business._count.tables} QR · {business._count.feedbacks} geri bildirim
                        </p>

                        {business.users.length > 0 ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Sorumlu:{" "}
                            {business.users.map((u, i) => (
                              <span key={u.id}>
                                {i > 0 ? ", " : ""}
                                <span className={u.active ? "" : "line-through"}>
                                  {u.name}
                                </span>{" "}
                                <code className="rounded bg-slate-100 px-1">
                                  {u.username}
                                </code>
                              </span>
                            ))}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-amber-600">Sorumlu atanmamış</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <NewAccountForm />
    </div>
  );
}
