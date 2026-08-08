"use client";

import { useActionState, useState } from "react";
import {
  createUser,
  resetPassword,
  toggleUser,
  type UserFormState,
} from "./actions";

const INPUT =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400";

type Business = { id: string; name: string };

export function NewUserForm({ businesses }: { businesses: Business[] }) {
  const [role, setRole] = useState("manager");
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    createUser,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Ad soyad</span>
          <input name="name" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">E-posta</span>
          <input name="email" type="email" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Rol</span>
          <select
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className={INPUT}
          >
            <option value="manager">İşletme sorumlusu</option>
            <option value="owner">Patron (hepsini görür)</option>
          </select>
        </label>

        {role === "manager" ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">İşletme</span>
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

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Başlangıç şifresi</span>
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
        className="self-start rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-400"
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
        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
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
          className="w-36 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs text-white disabled:bg-slate-400"
        >
          Kaydet
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500"
        >
          ✕
        </button>
      </div>
      {state.error ? (
        <span className="text-xs text-red-600">{state.error}</span>
      ) : null}
      {state.saved ? (
        <span className="text-xs text-emerald-600">{state.saved}</span>
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
        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        {active ? "Pasifleştir" : "Aktifleştir"}
      </button>
    </form>
  );
}

function Feedback({ state }: { state: UserFormState }) {
  if (state.error) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  }
  if (state.saved) {
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {state.saved}
      </p>
    );
  }
  return null;
}
