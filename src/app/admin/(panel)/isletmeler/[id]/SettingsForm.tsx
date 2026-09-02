"use client";

import { useActionState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { BUSINESS_TYPE_LIST, qrCardText } from "@/lib/constants";
import { ImageUpload } from "@/components/ImageUpload";
import { useToast } from "@/components/ui";
import {
  FIYAT_SEGMENTLERI,
  MEKAN_OZELLIKLERI,
  ozellikleriCoz,
} from "@/lib/mekan";
import { updateBusiness, type FormState } from "../actions";

const INPUT =
  "rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong";

// Önceden etiketler `text-caption text-ink-muted` idi: küçük punto +
// orta-açık gri, ekran görüntüsünde "silik" ve "anlaşılmıyor" diye
// şikayet edildi. Alan adları formun asıl bilgisi — açıklama metninden
// (aşağıdaki YARDIM) daha belirgin durmalı, ondan daha soluk değil.
const ETIKET = "text-small font-medium text-ink-soft";
const YARDIM = "text-caption text-ink-faint";

type Business = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  googleReviewUrl: string | null;
  brandColor: string;
  notifyThreshold: number;
  googleRedirect: boolean;
  qrCardText: string | null;
  iysBrandCode: string | null;
  latitude: number | null;
  longitude: number | null;
  priceSegment: string | null;
  mekanOzellikleri: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  instagramUrl: string | null;
  phone: string | null;
  wifiSsid: string | null;
  wifiPassword: string | null;
  announcement: string | null;
  announcementActive: boolean;
  yemeksepetiUrl: string | null;
  getirUrl: string | null;
  trendyolUrl: string | null;
  migrosUrl: string | null;
  biyerlerePlusOrtagi: boolean;
};

/**
 * Katlanır ayar bölümü.
 *
 * Form 20'den fazla alan taşıyor ve hepsi aynı anda açık dururken hangi
 * bilginin nerede olduğu kayboluyordu — "çırılçıplak ortada duran bir
 * bilgi yığını". Yalnızca kimlik bilgileri (ad/tür/adres) her zaman açık;
 * gerisi konu başlığına göre gruplanıp katlanıyor. `ozet` başlığın
 * yanında kısa bir ipucu veriyor ki açmadan da "burada ne var" belli olsun.
 */
function Bolum({
  baslik,
  ozet,
  varsayilanAcik = false,
  children,
}: {
  baslik: string;
  ozet?: string;
  varsayilanAcik?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={varsayilanAcik}
      className="group rounded-control border border-line bg-surface"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-small font-medium text-ink">
        <span className="flex-1">{baslik}</span>
        {ozet ? (
          <span className="hidden text-caption font-normal text-ink-faint sm:inline">
            {ozet}
          </span>
        ) : null}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="flex flex-col gap-3 border-t border-line p-4">{children}</div>
    </details>
  );
}

export function SettingsForm({
  business,
  isOwner,
  iysAcik,
  kesfetAcik,
}: {
  business: Business;
  isOwner: boolean;
  /** İYS hizmeti modülü kapalıysa marka kodu alanı hiç gösterilmiyor. */
  iysAcik: boolean;
  /** Keşfet modülü kapalıysa konum/özellik bölümü hiç gösterilmiyor. */
  kesfetAcik: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateBusiness,
    {},
  );
  const defaultCardText = qrCardText(business.type);

  /**
   * Bu form ekrana sığmayacak kadar uzun ve iki ayrı yerden gönderiliyor:
   * tepedeki "Görselleri kaydet" ve en alttaki "Kaydet". Sonucu yalnızca
   * düğmenin yanında göstermek, diğer uçtan gönderen kişiyi sonucu
   * göremeden bırakıyordu. Kısa bildirim her iki durumda da görünür.
   */
  const { bildir } = useToast();
  const sonDurum = useRef(state);
  useEffect(() => {
    if (sonDurum.current === state) return;
    sonDurum.current = state;
    if (state.error) bildir(state.error, "hata");
    else if (state.saved) bildir("İşletme ayarları kaydedildi.");
  }, [state, bildir]);

  const seciliOzellikler = ozellikleriCoz(business.mekanOzellikleri);
  const ozellikSayisi = seciliOzellikler.length;

  const sosyalOzet = [
    business.instagramUrl ? "Instagram" : null,
    business.phone ? "Telefon" : null,
    business.wifiSsid ? "Wi-Fi" : null,
    [business.yemeksepetiUrl, business.getirUrl, business.trendyolUrl, business.migrosUrl].some(
      Boolean,
    )
      ? "sipariş linki"
      : null,
  ].filter(Boolean);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={business.id} />

      {/* Kimlik: her zaman açık. Formun geri kalanı katlanabilir ama bu üçü
          (özellikle ad) neredeyse her ziyarette dokunulan alanlar. */}
      <div className="grid gap-3 rounded-control border border-line bg-surface p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={ETIKET}>İşletme adı</span>
          <input name="name" defaultValue={business.name} required className={INPUT} />
        </label>

        {isOwner ? (
          <label className="flex flex-col gap-1">
            <span className={ETIKET}>Tür</span>
            <select name="type" defaultValue={business.type} className={INPUT}>
              {BUSINESS_TYPE_LIST.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={ETIKET}>Adres</span>
          <input name="address" defaultValue={business.address ?? ""} className={INPUT} />
        </label>
      </div>

      <Bolum baslik="Görseller ve marka rengi" ozet={business.logoUrl ? "Logo yüklü" : "Logo yok"}>
        {/* Anket ekranında görünen görseller. Marka rengiyle birlikte müşterinin
            doğru yere geldiğini anlamasını sağlar. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUpload
            name="logoUrl"
            kind="logo"
            label="Logo"
            hint="Kare görünür. PNG/JPEG/WebP, kendiliğinden küçültülür."
            initial={business.logoUrl}
            brandColor={business.brandColor}
          />
          <ImageUpload
            name="coverUrl"
            kind="cover"
            label="Kapak fotoğrafı (isteğe bağlı)"
            hint="Anket ekranının tepesinde geniş görünür. Kafenin bir fotoğrafı olabilir."
            initial={business.coverUrl}
            brandColor={business.brandColor}
          />
        </div>

        <label className="flex flex-col gap-1">
          <span className={ETIKET}>Marka rengi</span>
          <input
            name="brandColor"
            type="color"
            defaultValue={business.brandColor}
            className="h-9 w-20 rounded-chip border border-line bg-surface p-1"
          />
        </label>

        {/* Form uzun; görselleri seçen kişi en alttaki kaydet düğmesine
            kadar kaydırmak istemeyebilir. Aynı formu buradan da gönderir. */}
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-control bg-accent-600 px-4 py-2.5 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
          >
            {pending ? "Kaydediliyor..." : "Görselleri kaydet"}
          </button>
          <span className={YARDIM}>Aşağıdaki ayarlarla birlikte kaydedilir.</span>
        </div>
      </Bolum>

      <Bolum
        baslik="Bildirim ve Google"
        ozet={`${business.notifyThreshold} ve altı · ${business.googleRedirect ? "Google açık" : "Google kapalı"}`}
      >
        <label className="flex flex-col gap-1">
          <span className={ETIKET}>Bildirim eşiği (bu puan ve altında haber ver)</span>
          <select
            name="notifyThreshold"
            defaultValue={String(business.notifyThreshold)}
            className={`${INPUT} w-40`}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value} ve altı
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={ETIKET}>Google yorum linki</span>
          <input
            name="googleReviewUrl"
            type="url"
            placeholder="https://search.google.com/local/writereview?placeid=..."
            defaultValue={business.googleReviewUrl ?? ""}
            className={INPUT}
          />
        </label>

        <label className="flex items-start gap-3 rounded-chip bg-canvas p-3">
          <input
            type="checkbox"
            name="googleRedirect"
            defaultChecked={business.googleRedirect}
            className="mt-0.5 h-4 w-4"
          />
          <span className="text-small">
            <span className="font-medium text-ink">
              5 yıldızda Google&apos;a yönlendir
            </span>
            <span className={`mt-0.5 block ${YARDIM}`}>
              Kapatırsanız herkes aynı nötr teşekkür ekranını görür; Google linki
              gösterilmez. Yorum filtreleme (review-gating) politikası nedeniyle
              ileride bu varyanta geçmek isterseniz kod değişikliği gerekmez.
            </span>
          </span>
        </label>
      </Bolum>

      <Bolum baslik="QR kartındaki çağrı metni">
        <label className="flex flex-col gap-1">
          <span className={ETIKET}>
            Masadaki kartta karekodun üstünde yazan cümle
          </span>
          <input
            name="qrCardText"
            defaultValue={business.qrCardText ?? ""}
            placeholder={defaultCardText}
            maxLength={80}
            className={INPUT}
          />
          <span className={YARDIM}>
            Boş bırakırsanız varsayılan kullanılır. Kısa, karşılığı belli ve süre
            veren cümleler daha çok okutulur.
          </span>
        </label>
      </Bolum>

      {/* Menüde gizlemek yetmez ama burada zaten hiç göstermiyoruz —
          modül kapalıyken alan formda yok, sunucu da (updateBusiness)
          gönderilse bile bu değeri yok sayıyor. */}
      {iysAcik ? (
        <Bolum baslik="İYS" ozet={business.iysBrandCode ?? "kod girilmedi"}>
          <label className="flex flex-col gap-1">
            <span className={ETIKET}>İYS marka kodu</span>
            <input
              name="iysBrandCode"
              defaultValue={business.iysBrandCode ?? ""}
              placeholder="ör. 654321"
              className={`${INPUT} w-40`}
            />
            <span className={YARDIM}>
              İYS&apos;de bu işletmenin bağlı olduğu marka kodu.
            </span>
          </label>
        </Bolum>
      ) : null}

      {/* Keşfet alanlarının tüketicisi panel değil, Biyerlere mobil
          uygulaması: haritadaki pin ve filtre çubuğu buradan besleniyor.
          Modül kapalıysa işletme keşfette hiç listelenmiyor, o yüzden
          bölüm de gösterilmiyor. */}
      {kesfetAcik ? (
        <Bolum
          baslik="Konum ve mekan özellikleri"
          ozet={
            business.latitude !== null && business.longitude !== null
              ? `haritada · ${ozellikSayisi} özellik`
              : "konum girilmedi"
          }
          varsayilanAcik={business.latitude === null}
        >
          <div className="rounded-control bg-canvas px-3 py-2.5">
            <p className={YARDIM}>
              Bu bilgiler <strong>Biyerlere</strong> uygulamasında görünür:
              koordinat haritadaki pini, özellikler ise &quot;priz var mı,
              bahçesi var mı&quot; filtrelerini besler. Boş bırakırsanız
              işletme keşfet ekranında listelenmez.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className={ETIKET}>Enlem (latitude)</span>
              <input
                name="latitude"
                inputMode="decimal"
                defaultValue={business.latitude ?? ""}
                placeholder="ör. 40.8715146"
                className={INPUT}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={ETIKET}>Boylam (longitude)</span>
              <input
                name="longitude"
                inputMode="decimal"
                defaultValue={business.longitude ?? ""}
                placeholder="ör. 29.2329381"
                className={INPUT}
              />
            </label>
          </div>
          <span className={YARDIM}>
            Bu sayıları elle bulmanız gerekmiyor: yukarıdaki{" "}
            <strong>Google yorum linki</strong> bir Google Haritalar adresiyse
            koordinat kaydederken oradan otomatik alınır. Elle girdiğiniz
            değer her zaman önceliklidir.
          </span>

          <label className="flex flex-col gap-1 border-t border-line pt-3">
            <span className={ETIKET}>Bütçe segmenti</span>
            <select
              name="priceSegment"
              defaultValue={business.priceSegment ?? ""}
              className={`${INPUT} w-52`}
            >
              <option value="">Belirtilmedi</option>
              {Object.entries(FIYAT_SEGMENTLERI).map(([deger, etiket]) => (
                <option key={deger} value={deger}>
                  {etiket}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex flex-col gap-2 border-t border-line pt-3">
            <legend className={ETIKET}>Mekan özellikleri</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MEKAN_OZELLIKLERI).map(([deger, etiket]) => (
                <label
                  key={deger}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-caption has-checked:border-accent-600 has-checked:bg-accent-50 has-checked:text-accent-700"
                >
                  <input
                    type="checkbox"
                    name="mekanOzellikleri"
                    value={deger}
                    defaultChecked={seciliOzellikler.includes(deger as never)}
                    className="sr-only"
                  />
                  {etiket}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-2.5 border-t border-line pt-3">
            <input
              type="checkbox"
              name="biyerlerePlusOrtagi"
              defaultChecked={business.biyerlerePlusOrtagi}
              className="mt-0.5 shrink-0"
            />
            <span>
              <span className={ETIKET}>Biyerlere Plus ortağıyım</span>
              <span className={`block ${YARDIM}`}>
                Açarsanız Plus üyeleri günde bir kez işletmenizden ücretsiz kahve talep
                edebilir (kupon olarak düşer). Plus aboneliği ayrı yönetiliyor,
                bu yalnızca SİZİN katılıp katılmadığınız.
              </span>
            </span>
          </label>
        </Bolum>
      ) : null}

      <Bolum
        baslik="Sosyal ve sipariş linkleri"
        ozet={sosyalOzet.length > 0 ? sosyalOzet.join(", ") : "hiçbiri dolu değil"}
      >
        <label className="flex flex-col gap-1">
          <span className={ETIKET}>Instagram linki</span>
          <input
            name="instagramUrl"
            type="url"
            placeholder="https://instagram.com/kafeniz"
            defaultValue={business.instagramUrl ?? ""}
            className={INPUT}
          />
          <span className={YARDIM}>
            Doldurulursa QR karşılama ekranında Instagram simgesi görünür.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className={ETIKET}>Telefon (WhatsApp)</span>
          <input
            name="phone"
            type="tel"
            placeholder="+905XXXXXXXXX"
            defaultValue={business.phone ?? ""}
            className={INPUT}
          />
          <span className={YARDIM}>
            Doldurulursa Biyerlere&apos;deki mekan profilinizde &quot;Ara&quot; ve
            &quot;WhatsApp&apos;ta yaz&quot; düğmeleri görünür — ikisi de aynı numarayı kullanır.
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={ETIKET}>Wi-Fi ağ adı (SSID)</span>
            <input
              name="wifiSsid"
              defaultValue={business.wifiSsid ?? ""}
              className={INPUT}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={ETIKET}>Wi-Fi şifresi</span>
            <input
              name="wifiPassword"
              defaultValue={business.wifiPassword ?? ""}
              className={INPUT}
            />
          </label>
        </div>
        <span className={YARDIM}>
          İkisi de doluysa QR ekranında müşteri kopyalayabileceği bir Wi-Fi
          butonu görünür.
        </span>

        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <span className={ETIKET}>Online sipariş linkleri</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="yemeksepetiUrl"
              type="url"
              placeholder="Yemeksepeti sayfa linki"
              defaultValue={business.yemeksepetiUrl ?? ""}
              className={INPUT}
            />
            <input
              name="getirUrl"
              type="url"
              placeholder="Getir sayfa linki"
              defaultValue={business.getirUrl ?? ""}
              className={INPUT}
            />
            <input
              name="trendyolUrl"
              type="url"
              placeholder="Trendyol Yemek linki"
              defaultValue={business.trendyolUrl ?? ""}
              className={INPUT}
            />
            <input
              name="migrosUrl"
              type="url"
              placeholder="Migros Yemek linki"
              defaultValue={business.migrosUrl ?? ""}
              className={INPUT}
            />
          </div>
          <span className={YARDIM}>
            Doldurduğunuz platformlar QR karşılama ekranında sipariş butonu
            olarak görünür. Boş bıraktıklarınız gösterilmez.
          </span>
        </div>
      </Bolum>

      <Bolum
        baslik="Duyuru"
        ozet={business.announcementActive ? "yayında" : "kapalı"}
      >
        <label className="flex flex-col gap-1">
          <span className={ETIKET}>QR menünün tepesinde görünen duyuru</span>
          <input
            name="announcement"
            defaultValue={business.announcement ?? ""}
            placeholder="Hafta sonu canlı müzik var!"
            maxLength={120}
            className={INPUT}
          />
          <span className={YARDIM}>
            Kampanya bitince metni silmenize gerek yok; aşağıdaki kutuyu
            kapatıp sonra geri açabilirsiniz.
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-chip bg-canvas p-3">
          <input
            type="checkbox"
            name="announcementActive"
            defaultChecked={business.announcementActive}
            className="mt-0.5 h-4 w-4"
          />
          <span className="text-small">
            <span className="font-medium text-ink">Duyuruyu menüde göster</span>
            <span className={`mt-0.5 block ${YARDIM}`}>
              Kapalıyken müşteri şeridi görmez.
            </span>
          </span>
        </label>
      </Bolum>

      {state.error ? (
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink">
          Kaydedildi.
        </p>
      ) : null}

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
