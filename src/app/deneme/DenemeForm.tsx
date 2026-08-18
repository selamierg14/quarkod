"use client";

import { useActionState } from "react";
import { Button, Checkbox, Field, Input } from "@/components/ui";
import { denemeBaslat, type DenemeState } from "./actions";

export function DenemeForm() {
  const [state, formAction, pending] = useActionState<DenemeState, FormData>(
    denemeBaslat,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="İşletme adı" htmlFor="firma" required className="sm:col-span-2">
          <Input id="firma" name="firma" required placeholder="Kırıntı Fırın & Kahve" />
        </Field>

        <Field label="Ad soyad" htmlFor="adSoyad" required>
          <Input id="adSoyad" name="adSoyad" required autoComplete="name" />
        </Field>

        <Field label="E-posta" htmlFor="eposta" required>
          <Input id="eposta" name="eposta" type="email" required autoComplete="email" />
        </Field>

        <Field
          label="Cep telefonu"
          htmlFor="telefon"
          required
          hint="Şifre sıfırlama ve doğrulama kodu buraya gider."
        >
          <Input
            id="telefon"
            name="telefon"
            type="tel"
            required
            autoComplete="tel"
            placeholder="05XX XXX XX XX"
          />
        </Field>

        <Field
          label="Kullanıcı adı"
          htmlFor="kullaniciAdi"
          hint="Boş bırakırsanız e-postanızdan türetilir."
        >
          <Input
            id="kullaniciAdi"
            name="kullaniciAdi"
            autoCapitalize="none"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Şifre"
          htmlFor="sifre"
          required
          hint="En az 8 karakter."
          className="sm:col-span-2"
        >
          <Input
            id="sifre"
            name="sifre"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>
      </div>

      <Checkbox
        name="kvkkOnay"
        label="Aydınlatma metnini okudum, bilgilerimin hesabımın açılması ve bana dönüş yapılması amacıyla işlenmesini kabul ediyorum."
        description="Deneme süresi sonunda dilediğiniz paketi seçip devam edebilirsiniz; verilerinizi silmemizi istediğinizde tek e-posta yeter."
      />

      {state.error ? (
        <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-small text-danger-ink">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" block loading={pending} loadingLabel="Hesabınız açılıyor…">
        Ücretsiz denemeyi başlat
      </Button>

      <p className="text-center text-caption text-ink-muted">
        Kredi kartı istemiyoruz. Deneme bitince dilediğiniz paketi seçip devam edebilirsiniz.
      </p>
    </form>
  );
}
