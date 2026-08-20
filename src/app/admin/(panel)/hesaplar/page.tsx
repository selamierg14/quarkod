import { requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveAccountId } from "@/lib/impersonation";
import { formatDateTime } from "@/components/ui";
import { BUSINESS_TYPES, type BusinessType, ROL_ADLARI } from "@/lib/constants";
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
        <h1 className="flex items-center gap-2.5 text-title font-semibold">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-chip bg-indigo-100 text-base text-indigo-700 ring-1 ring-indigo-200"
          >
            🗂️
          </span>
          Hesaplar
        </h1>
        <p className="mt-1 text-small text-ink-muted">
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
              className={`overflow-hidden rounded-control bg-surface ring-1 ${
                goruntuleniyor ? "ring-2 ring-ink" : "ring-line"
              }`}
            >
              {/* --- Hesap başlığı */}
              {/* min-w-0 + flex-wrap: telefonda uzun hesap adı ve rozetler
                  satırı taşırıp kartı ekranın dışına itiyordu. */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={`min-w-0 truncate font-semibold ${calisiyor ? "" : "text-ink-faint line-through"}`}
                    >
                      {account.name}
                    </span>
                    {!account.active ? (
                      <span className="rounded bg-danger-soft px-1.5 py-0.5 text-caption text-danger-ink">
                        askıda
                      </span>
                    ) : null}
                    {account.active && !calisiyor ? (
                      <span className="rounded bg-danger-soft px-1.5 py-0.5 text-caption text-danger-ink">
                        süresi doldu
                      </span>
                    ) : null}
                    {calisiyor && gun !== null && gun <= 14 ? (
                      <span className="rounded bg-warning-soft px-1.5 py-0.5 text-caption text-warning-ink">
                        {gun} gün kaldı
                      </span>
                    ) : null}
                    {account.menuEnabled ? (
                      <span className="rounded bg-sunken px-1.5 py-0.5 text-caption text-ink-soft">
                        QR menü
                      </span>
                    ) : null}
                    {goruntuleniyor ? (
                      <span className="rounded bg-ink px-1.5 py-0.5 text-caption text-white">
                        görüntüleniyor
                      </span>
                    ) : null}
                  </span>
                  <p className="mt-0.5 text-caption text-ink-faint">
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
                iysCode={account.iysCode ?? ""}
              />

              {/* --- Hesap sahipleri */}
              <div className="px-4 py-2.5">
                <p className="text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                  Hesap sahipleri
                </p>
                {sahipler.length === 0 ? (
                  <p className="mt-1 text-small text-rating">
                    Sahip yok — bu hesaba kimse giremez.
                  </p>
                ) : (
                  <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {/* Satır içi flex-wrap: ad + kullanıcı adı + rol dar
                        telefonda tek satıra sığmayıp kartı ekran dışına
                        itiyordu. */}
                    {sahipler.map((u) => (
                      <li
                        key={u.id}
                        className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-small"
                      >
                        <span className={u.active ? "" : "text-ink-faint line-through"}>
                          {u.name}
                        </span>
                        <code className="rounded bg-sunken px-1 text-caption text-ink-soft">
                          {u.username}
                        </code>
                        <span className="text-caption text-ink-faint">
                          {ROL_ADLARI[u.role] ?? u.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* --- İşletmeler ve altlarındaki sorumlular */}
              {account.businesses.length === 0 ? (
                <p className="px-4 pb-3 text-small text-ink-faint">
                  Henüz işletme eklenmemiş.
                </p>
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {account.businesses.map((business) => (
                    <li key={business.id} className="flex flex-wrap items-start gap-3 px-4 py-2.5">
                      {/* Girinti + çizgi: kimin altında olduğu görsel olarak belli. */}
                      <span className="mt-1.5 ml-1 h-3 w-3 shrink-0 rounded-bl border-b border-l border-line-strong" />

                      <div className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: business.brandColor }}
                          />
                          <span className="font-medium">{business.name}</span>
                          <code className="rounded bg-sunken px-1 text-caption text-ink-muted">
                            /f/{business.slug}
                          </code>
                        </span>
                        <p className="mt-0.5 text-caption text-ink-faint">
                          {BUSINESS_TYPES[business.type as BusinessType] ?? business.type} ·{" "}
                          {business._count.tables} QR · {business._count.feedbacks} geri bildirim
                        </p>

                        {business.users.length > 0 ? (
                          <p className="mt-1 text-caption text-ink-muted">
                            Sorumlu:{" "}
                            {business.users.map((u, i) => (
                              <span key={u.id}>
                                {i > 0 ? ", " : ""}
                                <span className={u.active ? "" : "line-through"}>
                                  {u.name}
                                </span>{" "}
                                <code className="rounded bg-sunken px-1">
                                  {u.username}
                                </code>
                              </span>
                            ))}
                          </p>
                        ) : (
                          <p className="mt-1 text-caption text-rating">Sorumlu atanmamış</p>
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
