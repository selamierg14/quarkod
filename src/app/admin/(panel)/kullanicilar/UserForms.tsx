"use client";

import { useActionState, useState, type ReactNode } from "react";
import {
  createUser,
  resetPassword,
  toggleUser,
  type UserFormState,
} from "./actions";

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

type Business = { id: string; name: string };

const ROL_SECENEKLERI: Record<string, string> = {
  manager: "İşletme sorumlusu (tek işletme)",
  bolge: "Bölge müdürü (seçili işletmeler)",
  viewer: "Salt okunur (rapor görür, değiştiremez)",
  owner: "Patron (hesabın tamamını yönetir)",
};

/**
 * Yeni kullanıcı formu artık liste sayfasıyla aynı anda görünmüyor: kapalı
 * bir alt modül olarak başlar, "Yeni kullanıcı" düğmesiyle açılır. Sayfa
 * karışık görünmesin diye — kullanıcı sadece ekleme yapacağı zaman formu
 * açsın.
 */
export function NewUserSection({
  businesses,
  roller,
  hint,
}: {
  businesses: Business[];
  roller: string[];
  hint: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-control bg-surface p-5 ring-1 ring-line">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-caption font-medium tracking-wide text-ink-muted uppercase">
          Yeni kullanıcı
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-chip border border-line px-3 py-1.5 text-small font-medium text-ink-soft hover:bg-canvas"
        >
          {open ? "Kapat" : "+ Yeni kullanıcı ekle"}
        </button>
      </div>

      {open ? (
        <div className="mt-4">
          <div className="mb-4 text-small text-ink-muted">{hint}</div>
          <NewUserForm businesses={businesses} roller={roller} />
        </div>
      ) : null}
    </section>
  );
}

function NewUserForm({
  businesses,
  roller,
}: {
  businesses: Business[];
  /** Ekleyen kişinin açmaya yetkili olduğu roller — sunucuda da doğrulanır. */
  roller: string[];
}) {
  const [role, setRole] = useState(roller[0] ?? "manager");
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    createUser,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Ad soyad</span>
          <input name="name" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">E-posta</span>
          <input name="email" type="email" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">
            Kullanıcı adı (girişte bu kullanılır)
          </span>
          <input
            name="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="boş bırakılırsa e-postadan türetilir"
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">
            Cep telefonu (doğrulama kodu buraya gider)
          </span>
          <input name="phone" type="tel" required placeholder="05XX XXX XX XX" className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Rol</span>
          <select
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className={INPUT}
          >
            {roller.map((r) => (
              <option key={r} value={r}>
                {ROL_SECENEKLERI[r] ?? r}
              </option>
            ))}
          </select>
        </label>

        {role === "manager" ? (
          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">İşletme</span>
            <select name="businessId" required className={INPUT}>
              <option value="">Seçin</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {role === "bolge" ? (
          <fieldset className="flex flex-col gap-1 sm:col-span-2">
            <legend className="text-caption text-ink-muted">
              Sorumlu olduğu işletmeler
            </legend>
            <div className="mt-1 flex flex-wrap gap-3 rounded-chip border border-line bg-surface p-3">
              {businesses.map((business) => (
                <label
                  key={business.id}
                  className="flex items-center gap-2 text-small text-ink-soft"
                >
                  <input
                    type="checkbox"
                    name="bolgeIsletmeleri"
                    value={business.id}
                    className="h-4 w-4 accent-[var(--color-ink)]"
                  />
                  {business.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

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
      </div>

      <Feedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-ink px-4 py-2.5 text-small font-medium text-white disabled:bg-slate-400"
      >
        {pending ? "Ekleniyor..." : "Kullanıcı ekle"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    resetPassword,
    {},
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-chip border border-line px-2.5 py-1 text-caption text-ink-soft hover:bg-canvas"
      >
        Şifre sıfırla
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex gap-1">
        <input
          name="password"
          type="text"
          required
          minLength={8}
          placeholder="yeni şifre"
          className="w-36 rounded-chip border border-line px-2 py-1 text-caption outline-none focus:border-line-strong"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-chip bg-ink px-2.5 py-1 text-caption text-white disabled:bg-slate-400"
        >
          Kaydet
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-chip border border-line px-2 py-1 text-caption text-ink-muted"
        >
          ✕
        </button>
      </div>
      {state.error ? (
        <span className="text-caption text-danger">{state.error}</span>
      ) : null}
      {state.saved ? (
        <span className="text-caption text-success">{state.saved}</span>
      ) : null}
    </form>
  );
}

export function ToggleUserButton({
  userId,
  active,
  disabled,
}: {
  userId: string;
  active: boolean;
  disabled: boolean;
}) {
  return (
    <form action={toggleUser}>
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={disabled}
        title={disabled ? "Kendi hesabınızı kapatamazsınız" : undefined}
        className="rounded-chip border border-line px-2.5 py-1 text-caption text-ink-soft hover:bg-canvas disabled:opacity-40"
      >
        {active ? "Pasifleştir" : "Aktifleştir"}
      </button>
    </form>
  );
}

function Feedback({ state }: { state: UserFormState }) {
  if (state.error) {
    return (
      <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink">
        {state.error}
      </p>
    );
  }
  if (state.saved) {
    return (
      <p className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink">
        {state.saved}
      </p>
    );
  }
  return null;
}
