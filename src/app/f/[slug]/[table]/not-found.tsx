/**
 * Geçersiz QR ekranı.
 *
 * Gerçek hayatta olur: etiket yıpranır, masa numarası değişir, biri eski bir
 * fotoğraftaki kodu okutur. Müşteriye siyah zeminde İngilizce "404" göstermek
 * hem işletmeyi kötü gösterir hem de kişiyi ne yapacağını bilmez bırakır.
 * Bu yüzden sakin bir dil ve tek bir net yönlendirme: personele söyleyin.
 */
export default function SurveyNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-sm text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-2xl text-slate-500"
          aria-hidden="true"
        >
          ?
        </div>

        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
          Bu karekod artık geçerli değil
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          Kod yıpranmış ya da masa düzeni değişmiş olabilir. Görüşünüzü yine de
          almak isteriz — personelimize söylerseniz size güncel karekodu
          gösterirler.
        </p>

        <p className="mt-8 text-xs text-slate-400">
          Zaman ayırdığınız için teşekkür ederiz.
        </p>
      </div>
    </main>
  );
}
