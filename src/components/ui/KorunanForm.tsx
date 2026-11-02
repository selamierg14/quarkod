"use client";

import { startTransition, useEffect, useRef } from "react";
import type { ComponentProps } from "react";

/**
 * Hata dönünce kullanıcının yazdıklarını SİLMEYEN form.
 *
 * React 19'da `<form action={fn}>` eylem bitince kontrolsüz alanları
 * sıfırlıyor — sonuç hata da olsa. QA'nın gördüğü tablo buydu: Duyurular
 * formu "başlık gerekli" hatasından sonra tamamen boşalıyor, kullanıcı
 * yazdığı her şeyi kaybediyordu; düzenleme formları ise eski değerlere
 * dönüyordu.
 *
 * Burada gönderim `onSubmit` ile yapılıyor (React'in form eylemi yolu
 * değil), bu yüzden otomatik sıfırlama hiç tetiklenmiyor. Sıfırlama
 * yalnızca istendiğinde ve yalnızca BAŞARIDAN sonra yapılıyor: yeni kayıt
 * formları (`sifirla`) temizlenip bir sonrakine hazır oluyor, düzenleme
 * formları kaydedilen değerlerde kalıyor.
 *
 * Tarayıcının kendi doğrulaması (required, pattern, maxLength) aynen
 * çalışıyor: `submit` olayı ancak o doğrulama geçince geliyor.
 */
export function KorunanForm({
  action,
  sonuc,
  sifirla = false,
  children,
  ...rest
}: Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  /** useActionState'in döndürdüğü gönderici. */
  action: (formData: FormData) => void;
  /** useActionState'in güncel durumu — yeni bir sonuç geldiğinde değişen nesne. */
  sonuc?: { saved?: unknown; error?: unknown };
  /** Başarıdan sonra alanlar boşaltılsın mı (yeni kayıt formları). */
  sifirla?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (sifirla && sonuc?.saved && !sonuc.error) ref.current?.reset();
  }, [sonuc, sifirla]);

  return (
    <form
      ref={ref}
      {...rest}
      onSubmit={(event) => {
        event.preventDefault();
        // Gönderen düğmenin adı/değeri de FormData'ya girsin (birden çok
        // submit düğmeli formlar için).
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const formData = new FormData(event.currentTarget, submitter);
        startTransition(() => action(formData));
      }}
    >
      {children}
    </form>
  );
}
