"use client";

import { useState } from "react";
import { StarRating } from "@/components/StarRating";
import {
  Button,
  ButtonRow,
  Dialog,
  Field,
  Input,
  Textarea,
  ToastProvider,
  useToast,
} from "@/components/ui";

/** Toast, modal ve yıldız puanlama gibi durumu olan bileşenlerin canlı hâli. */
export function EtkilesimliDemo() {
  return (
    <ToastProvider>
      <Icerik />
    </ToastProvider>
  );
}

function Icerik() {
  const { bildir } = useToast();
  const [acik, setAcik] = useState(false);
  const [puan, setPuan] = useState(0);
  const [kategoriPuan, setKategoriPuan] = useState(4);
  const [eposta, setEposta] = useState("mert@");
  const [yukleniyor, setYukleniyor] = useState(false);

  const epostaHatali = eposta.length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(eposta);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <p className="text-small font-medium text-ink-soft">Bildirim (toast)</p>
        <ButtonRow>
          <Button size="sm" onClick={() => bildir("Ayarlar kaydedildi.")}>
            Başarı
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => bildir("Bağlantı kurulamadı, tekrar deneyin.", "hata")}
          >
            Hata
          </Button>
        </ButtonRow>

        <p className="mt-2 text-small font-medium text-ink-soft">Modal</p>
        <ButtonRow>
          <Button size="sm" variant="destructive" onClick={() => setAcik(true)}>
            Masayı sil
          </Button>
        </ButtonRow>
        <Dialog
          acik={acik}
          onClose={() => setAcik(false)}
          baslik="Masa 12 silinsin mi?"
          aciklama="Bu masaya ait QR kodu çalışmaz hale gelir. Geçmiş geri bildirimler silinmez, kayıtlarda kalır."
          aksiyonlar={
            <>
              <Button size="sm" variant="secondary" onClick={() => setAcik(false)}>
                Vazgeç
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setAcik(false);
                  bildir("Masa 12 silindi.");
                }}
              >
                Evet, sil
              </Button>
            </>
          }
        />

        <p className="mt-2 text-small font-medium text-ink-soft">Yükleme durumu</p>
        <ButtonRow>
          <Button
            size="sm"
            loading={yukleniyor}
            loadingLabel="Kaydediliyor…"
            onClick={() => {
              setYukleniyor(true);
              setTimeout(() => {
                setYukleniyor(false);
                bildir("Menü güncellendi.");
              }, 1400);
            }}
          >
            Kaydet
          </Button>
        </ButtonRow>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-small font-medium text-ink-soft">
          Yıldız puanlama — ok tuşlarıyla da gezilir
        </p>
        <div className="rounded-card bg-sunken p-4 ring-1 ring-line">
          <StarRating name="demo-genel" value={puan} onChange={setPuan} size="lg" />
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="text-body text-ink-soft">Servis hızı</span>
            <StarRating
              name="demo-kategori"
              ariaLabel="Servis hızı puanı"
              value={kategoriPuan}
              onChange={setKategoriPuan}
            />
          </div>
        </div>

        <Field
          label="E-posta"
          htmlFor="demo-eposta"
          required
          hint="Şikayet bildirimleri bu adrese gider."
          error={epostaHatali ? "Geçerli bir e-posta adresi girin." : undefined}
        >
          <Input
            id="demo-eposta"
            value={eposta}
            invalid={epostaHatali}
            onChange={(e) => setEposta(e.target.value)}
          />
        </Field>

        <Field label="Dahili not" htmlFor="demo-not" hint="Yalnızca ekip görür.">
          <Textarea
            id="demo-not"
            rows={3}
            defaultValue="Müşteriyi aradım, hesabından ikram düşüldü."
          />
        </Field>
      </div>
    </div>
  );
}
