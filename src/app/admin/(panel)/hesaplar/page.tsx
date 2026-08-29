import { ChevronDown, FolderOpen, Settings2 } from "lucide-react";
import { requireSuperadmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveAccountId } from "@/lib/impersonation";
import { PageHeader, formatDateTime } from "@/components/ui";
import { BUSINESS_TYPES, type BusinessType, ROL_ADLARI } from "@/lib/constants";
import {
  EnterAccountButton,
  NewAccountForm,
  SubscriptionForm,
  ToggleAccountButton,
} from "./AccountForms";
import { SorumluListesi } from "./SorumluListesi";
import { MODUL_ANAHTARLARI } from "@/lib/moduller";
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
          moduller: true,
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Elle kopyalanmış bir başlık vardı; ortak bileşene alındı ki
          açıklama (i) davranışı ve boşluklar diğer sayfalarla aynı olsun. */}
      <PageHeader
        ikon={<FolderOpen className="h-4 w-4" aria-hidden="true" />}
        renk="indigo"
        title="Hesaplar"
        description="Sistemi kullanan müşteriler ve altlarındaki işletme/kullanıcı yapısı. Bir hesaba geçtiğinizde panel tam olarak o müşterinin gördüğü hale gelir."
      />

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
          // Modüller hesabın sahiplerinde duruyor (bkz. hesaplar/actions.ts).
          const sahipModulleri = sahipler[0]?.moduller ?? [];
          const acikModulSayisi = sahipModulleri.filter((m) =>
            (MODUL_ANAHTARLARI as string[]).includes(m),
          ).length;
          const sonTarih = account.expiresAt
            ? account.expiresAt.toLocaleDateString("tr-TR")
            : "süresiz";

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
                    {/* Beş modül varken tek bir "QR menü" rozeti yanıltıcıydı:
                        diğer dördü açık mı kapalı mı görünmüyordu. */}
                    <span className="rounded bg-sunken px-1.5 py-0.5 text-caption text-ink-soft">
                      {acikModulSayisi}/{MODUL_ANAHTARLARI.length} modül
                    </span>
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

              {/* Ayarlar katlanıyor: bir hesaba bakarken sorulan ilk soru
                  "kim, kaç işletme, kaç kullanıcı" — tarih kutusu, beş
                  modül kutucuğu ve İYS kodu her kartta açık dururken bu
                  yapı görünmez oluyordu. Süresi dolmak üzere olan ya da
                  dolmuş hesapta bölüm kendiliğinden açılıyor: asıl
                  müdahale gereken yer orası. */}
              <details open={!calisiyor || (gun !== null && gun <= 14)} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 border-b border-line bg-canvas/60 px-4 py-2 text-caption font-medium text-ink-soft hover:bg-canvas">
                  <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="flex-1">Abonelik ve modüller</span>
                  <span className="text-ink-faint">
                    {sonTarih}
                  </span>
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <SubscriptionForm
                  accountId={account.id}
                  expiresAt={dateInputValue(account.expiresAt)}
                  moduller={sahipModulleri}
                  iysCode={account.iysCode ?? ""}
                />
              </details>

              {/* --- Hesap sahipleri */}
              <div className="px-4 py-2.5">
                <p className="text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                  Hesap sahipleri
                </p>
                <SorumluListesi
                  kisiler={sahipler.map((u) => ({
                    id: u.id,
                    name: u.name,
                    username: u.username,
                    active: u.active,
                    rol: ROL_ADLARI[u.role] ?? u.role,
                  }))}
                  etiket="Sahip"
                  bosMesaj="Sahip yok — bu hesaba kimse giremez."
                />
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

                        <SorumluListesi
                          kisiler={business.users.map((u) => ({
                            id: u.id,
                            name: u.name,
                            username: u.username,
                            active: u.active,
                          }))}
                        />
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
