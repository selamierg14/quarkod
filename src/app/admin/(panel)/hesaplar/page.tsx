import { requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/components/ui";
import { NewAccountForm, ToggleAccountButton } from "./AccountForms";

export const dynamic = "force-dynamic";

export const metadata = { title: "Hesaplar" };

export default async function AccountsPage() {
  await requireSuperadmin();

  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { where: { role: "owner" }, select: { name: true, email: true } },
      _count: { select: { businesses: true, users: true } },
    },
  });

  // İşletme → hesap eşlemesi önce Map'e alınır; döngü içinde .find() yapmak
  // hesap ve işletme sayısının çarpımı kadar tarama demekti.
  const [businessCounts, businesses] = await Promise.all([
    prisma.feedback.groupBy({ by: ["businessId"], _count: { _all: true } }),
    prisma.business.findMany({ select: { id: true, accountId: true } }),
  ]);

  const accountOfBusiness = new Map(businesses.map((b) => [b.id, b.accountId]));
  const feedbackByAccount = new Map<string, number>();

  for (const row of businessCounts) {
    const accountId = accountOfBusiness.get(row.businessId);
    if (!accountId) continue;
    feedbackByAccount.set(
      accountId,
      (feedbackByAccount.get(accountId) ?? 0) + row._count._all,
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Hesaplar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sistemi kullanan müşteriler. Her hesabın verisi diğerlerinden tamamen
          ayrıdır; buradaki liste yalnızca platform yöneticisine görünür.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Hesap</th>
              <th className="px-4 py-3 font-medium">Sahibi</th>
              <th className="px-4 py-3 font-medium">İşletme</th>
              <th className="px-4 py-3 font-medium">Kullanıcı</th>
              <th className="px-4 py-3 font-medium">Geri bildirim</th>
              <th className="px-4 py-3 font-medium">Açılış</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.map((account) => (
              <tr key={account.id} className={account.active ? "" : "bg-slate-50"}>
                <td className="px-4 py-3">
                  <span
                    className={
                      account.active ? "font-medium" : "text-slate-400 line-through"
                    }
                  >
                    {account.name}
                  </span>
                  {!account.active ? (
                    <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700">
                      askıda
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {account.users[0]?.email ?? (
                    <span className="text-amber-600">sahip yok</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-600">
                  {account._count.businesses}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-600">
                  {account._count.users}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-600">
                  {feedbackByAccount.get(account.id) ?? 0}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                  {formatDateTime(account.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <ToggleAccountButton
                    accountId={account.id}
                    active={account.active}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewAccountForm />
    </div>
  );
}
