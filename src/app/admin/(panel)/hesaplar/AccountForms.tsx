"use client";

import { useActionState, useState } from "react";
import { TarihGirdisi } from "@/components/ui";
import {
  createAccount,
  enterAccount,
  toggleAccount,
  updateSubscription,
  type AccountFormState,
} from "./actions";

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

export function NewAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    createAccount,
    {},
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-control border border-dashed border-line-strong px-4 py-3 text-small text-ink-soft hover:bg-surface"
      >
        + Yeni müşteri hesabı aç
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-control bg-surface p-5 ring-1 ring-line"
    >
      <h2 className="font-semibold tracking-tight">Yeni hesap</h2>
      <p className="text-small text-ink-muted">
        Hesap ve ilk sahibi birlikte açılır. Sahibi daha sonra kendi
        işletmelerini ve sorumlularını kendisi ekler.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Hesap adı (firma/zincir)</span>
          <input name="name" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Sahibinin adı</span>
          <input name="ownerName" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Sahibinin e-postası</span>
          <input name="ownerEmail" type="email" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Kullanıcı adı (giriş için)</span>
          <input
            name="ownerUsername"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="boş bırakılırsa e-postadan türetilir"
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">
            Cep telefonu (doğrulama kodu)
          </span>
          <input name="ownerPhone" type="tel" required placeholder="05XX XXX XX XX" className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Başlangıç şifresi</span>
          <input
            name="password"
            type="text"
            required
            minLength={8}
            placeholder="en az 8 karakter"
            className={INPUT}
          />
        </label>

        <GecerlilikAlani ad="yeni-hesap" />

        <label className="flex items-center gap-2 pb-1 text-small sm:pt-6">
          <input
            type="checkbox"
            name="menuEnabled"
            className="h-4 w-4 accent-[var(--color-ink)]"
          />
          QR menü modülü satıldı
        </label>
      </div>

      {state.error ? (
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink">
          {state.saved}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-control bg-ink px-4 py-2.5 text-small font-medium text-white disabled:bg-slate-400"
        >
          {pending ? "Açılıyor..." : "Hesabı aç"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-control border border-line px-4 py-2.5 text-small text-ink-soft"
        >
          Kapat
        </button>
      </div>
    </form>
  );
}

/** Bu hesabın paneline geç. */
export function EnterAccountButton({
  accountId,
  active,
}: {
  accountId: string;
  active: boolean;
}) {
  return (
    <form action={enterAccount}>
      <input type="hidden" name="accountId" value={accountId} />
      <button
        type="submit"
        disabled={!active}
        title={active ? undefined : "Askıdaki hesabın paneline girilemez"}
        className="rounded-chip bg-ink px-3 py-1.5 text-caption font-medium text-white disabled:bg-slate-300"
      >
        Bu hesabı görüntüle
      </button>
    </form>
  );
}

export function ToggleAccountButton({
  accountId,
  active,
}: {
  accountId: string;
  active: boolean;
}) {
  return (
    <form action={toggleAccount}>
      <input type="hidden" name="accountId" value={accountId} />
      <button
        type="submit"
        title={
          active
            ? "Askıya alınınca kullanıcılar giremez ve QR'lar çalışmaz; veri silinmez."
            : "Hesabı yeniden aktif et"
        }
        className="rounded-chip border border-line px-2.5 py-1 text-caption text-ink-soft hover:bg-canvas"
      >
        {active ? "Askıya al" : "Aktifleştir"}
      </button>
    </form>
  );
}

/**
 * Abonelik süresi ve satılan modüller.
 *
 * Tarih girilmezse süresiz. Süre dolduğunda hesap kendiliğinden kapanır;
 * bu yüzden "askıya al" düğmesinden ayrı duruyor — biri ödeme takvimi,
 * diğeri elle müdahale.
 */
export function SubscriptionForm({
  accountId,
  expiresAt,
  menuEnabled,
  iysCode,
}: {
  accountId: string;
  /** yyyy-aa-gg biçiminde ya da boş. */
  expiresAt: string;
  menuEnabled: boolean;
  iysCode: string;
}) {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    updateSubscription,
    {},
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 border-t border-line bg-canvas/60 px-4 py-3"
    >
      <input type="hidden" name="accountId" value={accountId} />

      <GecerlilikAlani ad={accountId} baslangic={expiresAt} />

      <label className="flex items-center gap-2 pb-2 text-small">
        <input
          type="checkbox"
          name="menuEnabled"
          defaultChecked={menuEnabled}
          className="h-4 w-4 accent-[var(--color-ink)]"
        />
        QR menü modülü
      </label>

      <label className="flex flex-col gap-1 pb-2">
        <span className="text-caption text-ink-muted">İYS hizmet sağlayıcı kodu</span>
        <input
          name="iysCode"
          defaultValue={iysCode}
          placeholder="ör. 123456"
          className={`${INPUT} w-36 py-1.5`}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-chip border border-line-strong bg-surface px-3 py-1.5 text-caption font-medium text-ink-soft hover:bg-canvas disabled:opacity-50"
      >
        {pending ? "Kaydediliyor…" : "Kaydet"}
      </button>

      <span className="pb-2 text-caption">
        {state.error ? <span className="text-danger">{state.error}</span> : null}
        {state.saved ? <span className="text-success-ink">{state.saved}</span> : null}
        {!state.error && !state.saved ? (
          <span className="text-ink-faint">
            Boş bırakılırsa süresiz. Tarih geçince QR kodları çalışmaz.
          </span>
        ) : null}
      </span>
    </form>
  );
}


/** Bugünden itibaren ay ekleyen kısayol; girilen gün dahil sayılır. */
function ayEkle(ay: number): string {
  const t = new Date();
  t.setMonth(t.getMonth() + ay);
  const iki = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${iki(t.getMonth() + 1)}-${iki(t.getDate())}`;
}

const KISAYOLLAR = [
  { etiket: "1 ay", ay: 1 },
  { etiket: "3 ay", ay: 3 },
  { etiket: "6 ay", ay: 6 },
  { etiket: "1 yıl", ay: 12 },
];

/**
 * Hesabın geçerlilik tarihi.
 *
 * Satış konuşması "31 Aralık" diye değil "bir yıllık" diye geçiyor; takvimden
 * gün saymak yerine süreyi seçip tarihi otomatik doldurmak hatayı azaltıyor.
 * Tarih yine görünür ve elle değiştirilebilir kalıyor.
 */
function GecerlilikAlani({
  ad,
  baslangic = "",
}: {
  ad: string;
  baslangic?: string;
}) {
  const [deger, setDeger] = useState(baslangic);
  const alanId = `gecerlilik-${ad}`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={alanId} className="text-caption text-ink-muted">
        Hesap geçerlilik tarihi
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        <TarihGirdisi
          id={alanId}
          name="expiresAt"
          deger={deger}
          onDegisim={setDeger}
          className={`${INPUT} py-1.5`}
        />
        {KISAYOLLAR.map((k) => (
          <button
            key={k.ay}
            type="button"
            onClick={() => setDeger(ayEkle(k.ay))}
            className="rounded-chip border border-line bg-surface px-2 py-1 text-caption text-ink-soft hover:bg-canvas"
          >
            +{k.etiket}
          </button>
        ))}
        {deger ? (
          <button
            type="button"
            onClick={() => setDeger("")}
            className="rounded-chip px-2 py-1 text-caption text-ink-muted underline underline-offset-2"
          >
            süresiz yap
          </button>
        ) : null}
      </div>
    </div>
  );
}
