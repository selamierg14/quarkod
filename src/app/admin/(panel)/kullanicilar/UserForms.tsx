"use client";

import { useActionState, useState, type ReactNode } from "react";
import {
  createUser,
  resetPassword,
  toggleUser,
  updateUser,
  type UserFormState,
} from "./actions";
import { KeyRound, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui";
import {
  MODULLER,
  MODUL_ACIKLAMALARI,
  type ModulAnahtari,
} from "@/lib/moduller";

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

type Business = { id: string; name: string };

const ROL_SECENEKLERI: Record<string, string> = {
  manager: "İşletme sorumlusu (tek işletme)",
  bolge: "Bölge müdürü (seçili işletmeler)",
  viewer: "Salt okunur (rapor görür, değiştiremez)",
  owner: "Patron (hesabın tamamını yönetir)",
  garson: "Saha personeli (yalnızca kendi vardiyasını/görevlerini görür)",
};

/** İşletme seçimi gerektiren roller — tek işletmeye bağlanır. */
function isletmeGerekir(rol: string): boolean {
  return rol === "manager" || rol === "garson";
}

/**
 * Yeni kullanıcı formu artık liste sayfasıyla aynı sayfada değil, kendi
 * rotasında (/admin/kullanicilar/ekle) yaşıyor — sol menüde "Kullanıcılar"
 * altında "Listele" ve "Ekle" ayrı satırlar olarak görünüyor.
 */
export function NewUserForm({
  businesses,
  roller,
  hint,
}: {
  businesses: Business[];
  /** Ekleyen kişinin açmaya yetkili olduğu roller — sunucuda da doğrulanır. */
  roller: string[];
  hint?: ReactNode;
}) {
  const [role, setRole] = useState(roller[0] ?? "manager");
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    createUser,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {hint ? <div className="text-small text-ink-muted">{hint}</div> : null}

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

        {isletmeGerekir(role) ? (
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
        className="self-start rounded-control bg-accent-600 px-4 py-2.5 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
      >
        {pending ? "Ekleniyor..." : "Kullanıcı ekle"}
      </button>
    </form>
  );
}

export type EditableUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string | null;
  role: string;
  businessId: string | null;
  bolgeIsletmeleri: string[];
  moduller: string[];
};

/**
 * Var olan bir kullanıcının bilgilerini, rolünü ve modül izinlerini
 * düzenler. Şifre burada yok — o "Şifre sıfırla" ile ayrı kalıyor.
 */
export function EditUserForm({
  user,
  businesses,
  roller,
  verilebilirModuller,
}: {
  user: EditableUser;
  businesses: Business[];
  roller: string[];
  /** Formu açan kişinin KENDİ sahip olduğu modüller — fazlasını veremez. */
  verilebilirModuller: ModulAnahtari[];
}) {
  const [role, setRole] = useState(user.role);
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    updateUser,
    {},
  );
  const rolSabit = user.role === "owner";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={user.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Ad soyad</span>
          <input name="name" defaultValue={user.name} required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">E-posta</span>
          <input
            name="email"
            type="email"
            defaultValue={user.email}
            required
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">
            Kullanıcı adı (girişte bu kullanılır)
          </span>
          <input
            name="username"
            defaultValue={user.username}
            autoCapitalize="none"
            spellCheck={false}
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">
            Cep telefonu (doğrulama kodu buraya gider)
          </span>
          <input
            name="phone"
            type="tel"
            defaultValue={user.phone ?? ""}
            required
            placeholder="05XX XXX XX XX"
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Rol</span>
          {rolSabit ? (
            <>
              <input
                readOnly
                value={ROL_SECENEKLERI.owner}
                className={`${INPUT} bg-canvas text-ink-muted`}
              />
              <span className="text-caption text-ink-faint">
                Patron rolü buradan değiştirilemez.
              </span>
            </>
          ) : (
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
          )}
        </label>

        {!rolSabit && isletmeGerekir(role) ? (
          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">İşletme</span>
            <select name="businessId" defaultValue={user.businessId ?? ""} required className={INPUT}>
              <option value="">Seçin</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {!rolSabit && role === "bolge" ? (
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
                    defaultChecked={user.bolgeIsletmeleri.includes(business.id)}
                    className="h-4 w-4 accent-[var(--color-ink)]"
                  />
                  {business.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>

      {/* Modül dağıtımı ticari bir karar: yalnızca platform yöneticisi ve
          hesap sahibi yapabilir (bkz. lib/moduller.ts). Bölge müdürü ya da
          işletme sorumlusu kendi altına kullanıcı açabilir ama patronun
          kapattığı bir modülü ekibine açamaz — bölüm onlara hiç görünmüyor.
          Garson da bu ekranlara zaten hiç girmiyor.

          Listede yalnızca dağıtan kişinin KENDİ sahip olduğu modüller var;
          sunucuda istenenModulleriSuz() aynı kesişimi tekrar alıyor, yani
          form alanı elle kurulsa bile fazlası geçmiyor. */}
      {verilebilirModuller.length > 0 && !rolSabit && role !== "garson" ? (
        <fieldset className="flex flex-col gap-2 rounded-chip border border-line bg-canvas p-3">
          <legend className="px-1 text-caption font-medium tracking-wide text-ink-muted uppercase">
            Modül izinleri
          </legend>
          {verilebilirModuller.map((modul) => (
            <label key={modul} className="flex items-start gap-2 text-small text-ink-soft">
              <input
                type="checkbox"
                name="moduller"
                value={modul}
                defaultChecked={user.moduller.includes(modul)}
                className="mt-0.5 h-4 w-4 accent-[var(--color-ink)]"
              />
              <span>
                {MODULLER[modul]}
                <span className="block text-caption text-ink-faint">
                  {MODUL_ACIKLAMALARI[modul]}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <Feedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-accent-600 px-4 py-2.5 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
      >
        {pending ? "Kaydediliyor..." : "Kaydet"}
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
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="px-2"
        onClick={() => setOpen(true)}
        title="Şifre sıfırla"
      >
        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">Şifre sıfırla</span>
      </Button>
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
          className="rounded-chip bg-accent-600 px-2.5 py-1 text-caption text-white transition hover:bg-accent-700 disabled:bg-slate-400"
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
      {/* Pasifleştirme geri alınabilir ama girişi kesen bir işlem:
          "Düzenle" ile aynı görsel ağırlıkta durunca yanlışlıkla
          tıklanabiliyordu. Aktifleştirme riskli değil, nötr kalıyor. */}
      <Button
        type="submit"
        variant={active ? "destructive" : "secondary"}
        size="sm"
        className="px-2"
        disabled={disabled}
        title={
          disabled
            ? "Kendi hesabınızı kapatamazsınız"
            : active
              ? "Pasifleştir — panele giremez, kaydı silinmez"
              : "Aktifleştir"
        }
      >
        {active ? (
          <UserX className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span className="sr-only">{active ? "Pasifleştir" : "Aktifleştir"}</span>
      </Button>
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
