/**
 * Giriş akışının adımları ve kipleri.
 *
 * NEDEN AYRI BİR DOSYA: bunlar doğal olarak `admin/giris/actions.ts`'e
 * aitti ama oraya konamıyor. `"use server"` yazan bir dosya YALNIZCA async
 * fonksiyon dışa aktarabiliyor — sabit bir dizi dışa aktarmak Next'in
 * çalışma zamanı kontrolüne takılıyor:
 *
 *     A "use server" file can only export async functions
 *
 * Ve bu hata derleme zamanında değil, İSTEK ANINDA çıkıyor: `tsc` de
 * `eslint` de birim testleri de sessiz kalıyor, giriş formu ilk
 * gönderimde 500 dönüyor. Yani tam olarak "yerelde görünmeyip üretimde
 * patlayan" sınıfından.
 *
 * Adımların sabit bir kümede olması gerekiyor çünkü ikisi de FORMDAN
 * geliyor; istemci bunlara ne yazarsa yazsın tanınmayan değer varsayılana
 * düşmeli, tip iddiasıyla ("as Step") geçiştirilmemeli.
 */

export const ADIMLAR = ["kimlik", "kod", "yeni-sifre"] as const;
export const KIPLER = ["giris", "sifre"] as const;

export type Step = (typeof ADIMLAR)[number];
export type Kip = (typeof KIPLER)[number];
