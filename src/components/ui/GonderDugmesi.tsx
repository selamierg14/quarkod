"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";

/**
 * Gönderim sırasında KENDİNİ KİLİTLEYEN submit düğmesi.
 *
 * Neden var: panelde 64 submit düğmesinin 22'si gönderim sırasında devre
 * dışı kalmıyordu — yani çift tık iki istek gönderiyordu. Bir kısmı da
 * YIKICI eylemlerdi ("Rotayı sil", "Kaldır", "Çıkar"); orada çift istek
 * "zaten silinmiş" hatası ya da yanlış kaydın silinmesi demek.
 *
 * Neden bu kadar çok düğmede eksikti: `useActionState` kullanan formlar
 * `pending` değerine sahip ve onlar kilitleniyordu. Ama düz
 * `<form action={sunucuEylemi}>` kullanan formların böyle bir değeri yok
 * ve o formlarda kilitlemenin bir yolu yokmuş gibi görünüyordu.
 *
 * `useFormStatus` tam bunun için: formun İÇİNDEKİ bir bileşenden
 * çağrıldığında o formun gönderim durumunu veriyor. Kritik ayrıntı —
 * formu RENDER EDEN bileşende çalışmıyor, formun ÇOCUĞU olmak zorunda.
 * Bu yüzden ayrı bir bileşen; aynı dosyada inline bir kanca olarak
 * yazılamazdı.
 *
 * `aria-busy` da veriliyor: ekran okuyucu "meşgul" durumunu sessizce
 * geçmesin, kullanıcı ikinci kez basmaya çalışmasın.
 */
export function GonderDugmesi({
  children,
  bekleyenMetin,
  className = "",
  disabled,
  ...rest
}: Omit<ComponentProps<"button">, "type"> & {
  children: ReactNode;
  /**
   * Gönderim sırasında gösterilecek metin. Verilmezse etiket değişmiyor —
   * ikon düğmelerinde metin değiştirmenin anlamı yok, kilit yeterli.
   */
  bekleyenMetin?: ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      // `disabled` dışarıdan da gelebiliyor (ör. form geçersizken); ikisi
      // birleşiyor, biri diğerini ezmiyor.
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={className}
      {...rest}
    >
      {pending && bekleyenMetin ? bekleyenMetin : children}
    </button>
  );
}
