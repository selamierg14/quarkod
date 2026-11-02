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
import {
  Button,
  GonderDugmesi,
  KorunanForm,
  SifreAlani,
  SilDugmesi,
  buttonClass,
} from "@/components/ui";
import {
  MODULLER,
  MODUL_ACIKLAMALARI,
  type ModulAnahtari,
} from "@/lib/kimlik/moduller";
import { alanOzellikleri } from "@/lib/cekirdek/desenler";
import {
  EN_COK_EK_TELEFON,
  ekTelefonEklenebilirMi,
} from "@/lib/kimlik/telefonlar";

const INPUT =
  "rounded-control border border-line bg-surface px-3 py-2 text-small text-ink outline-none placeholder:text-ink-faint transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100";

type Business = { id: string; name: string };

const ROL_SECENEKLERI: Record<string, string> = {
  manager: "İşletme sorumlusu (tek işletme)",
  bolge: "Bölge müdürü (seçili işletmeler)",
  owner: "Patron (hesabın tamamını yönetir)",
  garson: "Saha personeli (yalnızca kendi vardiyasını/görevlerini görür)",
};

/**
 * Yedek cep numaraları.
 *
 * Doğrulama kodu birincil numaraya gidiyor; buradakiler kullanıcı o
 * numaraya ulaşamadığında (telefon kayıp, hat çekmiyor) giriş ekranından
 * seçebileceği alternatifler. Tek numaraya bağlı kalmak, iki aşamalı
 * doğrulama açıkken hesabı tamamen kilitleyebiliyordu.
 *
 * GARSON rolünde blok hiç ÇİZİLMİYOR — kural lib/kimlik/telefonlar.ts'te
 * ve sunucu tarafı da aynı kaynaktan okuyor. Gizlemek tek başına koruma
 * değil; asıl kontrol sunucuda.
 */
function YedekTelefonlar({ rol, mevcut = [] }: { rol: string; mevcut?: string[] }) {
  if (!ekTelefonEklenebilirMi(rol)) return null;

  // Var olanlar + bir boş satır: kullanıcı "ekle" düğmesi aramadan
  // doğrudan yazabilsin.
  const satirlar = [...mevcut, ""].slice(0, EN_COK_EK_TELEFON);

  return (
    <fieldset className="flex flex-col gap-1 sm:col-span-2">
      <legend className="text-caption text-ink-muted">
        Yedek cep numaraları (isteğe bağlı)
      </legend>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        {satirlar.map((numara, i) => (
          <input
            key={i}
            name="ekTelefonlar"
            {...alanOzellikleri("telefon", { zorunlu: false })}
            defaultValue={numara}
            placeholder="05XX XXX XX XX"
            className={INPUT}
          />
        ))}
      </div>
      <span className="text-caption text-ink-faint">
        Doğrulama kodu birincil numaraya gider; kullanıcı giriş ekranından
        buradaki numaralardan birini de seçebilir. En fazla {EN_COK_EK_TELEFON}.
      </span>
    </fieldset>
  );
}

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
  verilebilirModuller = [],
  hesaplar = [],
}: {
  businesses: Business[];
  /** Ekleyen kişinin açmaya yetkili olduğu roller — sunucuda da doğrulanır. */
  roller: string[];
  hint?: ReactNode;
  /** Formu açan kişinin KENDİ sahip olduğu modüller — fazlasını veremez. */
  verilebilirModuller?: ModulAnahtari[];
  /**
   * Yalnızca hesap seçmemiş platform yöneticisi için dolu: kullanıcının
   * hangi müşteriye açılacağı formda seçiliyor. Boşken kullanıcı, içinde
   * bulunulan hesaba açılır.
   */
  hesaplar?: { id: string; name: string }[];
}) {
  const [role, setRole] = useState(roller[0] ?? "manager");
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    createUser,
    {},
  );

  return (
    <KorunanForm action={formAction} sonuc={state} sifirla className="flex flex-col gap-3">
      {hint ? <div className="text-small text-ink-muted">{hint}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Platform yöneticisi bir hesaba "girmeden" de kullanıcı
            açabilmeli: menüdeki Kullanıcılar > Ekle bağlantısı oraya
            gidiyor ve önceden burada "önce bir hesaba geçin" hatasıyla
            duvara toslanıyordu. */}
        {hesaplar.length > 0 ? (
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-caption text-ink-muted">
              Hangi hesaba açılacak
            </span>
            <select name="hedefHesapId" required className={INPUT}>
              <option value="">Hesap seçin</option>
              {hesaplar.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Ad soyad</span>
          <input name="name" {...alanOzellikleri("kisiAdi")} className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">E-posta</span>
          <input name="email" {...alanOzellikleri("eposta")} className={INPUT} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">
            Kullanıcı adı (girişte bu kullanılır)
          </span>
          <input
            name="username"
            {...alanOzellikleri("kullaniciAdi", { zorunlu: false })}
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
          <input
            name="phone"
            {...alanOzellikleri("telefon")}
            placeholder="05XX XXX XX XX"
            className={INPUT}
          />
        </label>

        {/* Tek seçenekli liste bir karar değil, bir engel (QA): sorumlu
            yalnızca "garson" açabiliyor, tek işletmeli hesapta da "Seçin"
            zorunluydu. Tek seçenek sabit metin olarak gösteriliyor. */}
        {roller.length === 1 ? (
          <div className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">Rol</span>
            <input type="hidden" name="role" value={roller[0]} />
            <span className="rounded-chip border border-line bg-canvas px-3 py-2 text-small text-ink-soft">
              {ROL_SECENEKLERI[roller[0]] ?? roller[0]}
            </span>
          </div>
        ) : (
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
        )}

        {isletmeGerekir(role) ? (
          businesses.length === 1 ? (
            <div className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">İşletme</span>
              <input type="hidden" name="businessId" value={businesses[0].id} />
              <span className="rounded-chip border border-line bg-canvas px-3 py-2 text-small text-ink-soft">
                {businesses[0].name}
              </span>
            </div>
          ) : (
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
          )
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

        <YedekTelefonlar rol={role} />

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Başlangıç şifresi</span>
          <SifreAlani className={INPUT} />
        </label>
      </div>

      {/* Düzenleme formundakiyle aynı bölüm: kullanıcıyı açarken izin
          veremeyip sonra ikinci bir ekrandan dönmek gereksiz bir adımdı.
          Garson bu ekranlara hiç girmiyor, ona gösterilmiyor. */}
      {verilebilirModuller.length > 0 && role !== "garson" ? (
        <fieldset className="flex flex-col gap-2 rounded-chip border border-line bg-canvas p-3">
          <legend className="px-1 text-caption font-medium tracking-wide text-ink-muted uppercase">
            Modül izinleri
          </legend>
          {/* İşaretsiz kutular gönderilmez, yani "hiç modül seçilmedi" ile
              "bu blok hiç çizilmedi" sunucuda AYNI görünüyor. Bu gizli alan
              ikisini ayırıyor: yoksa sunucu modüllere hiç dokunmuyor. */}
          <input type="hidden" name="modullerGonderildi" value="1" />
          {verilebilirModuller.map((modul) => (
            <label key={modul} className="flex items-start gap-2 text-small text-ink-soft">
              <input
                type="checkbox"
                name="moduller"
                value={modul}
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
        className={buttonClass({ size: "md", className: "self-start" })}
      >
        {pending ? "Ekleniyor..." : "Kullanıcı ekle"}
      </button>
    </KorunanForm>
  );
}

export type EditableUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string | null;
  /** Yedek cep numaraları — birincil `phone` alanında. */
  ekTelefonlar: string[];
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
  // Patronun ROLÜ değiştirilemez (sahiplik aboneliği taşır, platform
  // tarafının işidir) — ama bu, MODÜLLERİNİN de değiştirilemeyeceği
  // anlamına gelmiyor. İki ayrı konu; aynı bayrağa bağlanmışlardı.
  const rolSabit = user.role === "owner";

  return (
    <KorunanForm action={formAction} sonuc={state} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={user.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Ad soyad</span>
          <input
            name="name"
            {...alanOzellikleri("kisiAdi")}
            defaultValue={user.name}
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">E-posta</span>
          <input
            name="email"
            {...alanOzellikleri("eposta")}
            defaultValue={user.email}
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">
            Kullanıcı adı (girişte bu kullanılır)
          </span>
          <input
            name="username"
            {...alanOzellikleri("kullaniciAdi", { zorunlu: false })}
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
            {...alanOzellikleri("telefon")}
            defaultValue={user.phone ?? ""}
            placeholder="05XX XXX XX XX"
            className={INPUT}
          />
        </label>

        {/* Sahipliği korunan kullanıcıda formdan gelen rol yok sayılıyor
            (sunucuda etkinRol), o yüzden blok da gerçek role göre. */}
        <YedekTelefonlar
          rol={rolSabit ? user.role : role}
          mevcut={user.ekTelefonlar}
        />

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
      {/* Modül bloğu patronda da GÖRÜNÜR.
          Önceden koşulda `!rolSabit` vardı ve iki ayrı kural birbirine
          karışmıştı: patronun rolü sabit diye modül izinleri de gizleniyordu.
          Bunun iki sonucu vardı ve ikincisi sessiz bir veri kaybıydı:

            1. Patrona hiçbir modül verilemiyordu — üstelik modül dağıtımı
               kendi kümesinin alt kümesiyle sınırlı olduğu için (bkz.
               verilebilirModuller) patronda olmayan bir modül ekibine de
               hiç verilemiyordu. "Rezervasyon izinlerde görünmüyor"
               şikayetinin kaynağı buydu.
            2. Patronun telefonunu düzeltmek için formu kaydetmek, gönderilen
               boş `moduller` listesi yüzünden TÜM modüllerini siliyordu
               (updateUser, modulDagitabilirMi dalı). */}
      {verilebilirModuller.length > 0 && role !== "garson" ? (
        <fieldset className="flex flex-col gap-2 rounded-chip border border-line bg-canvas p-3">
          <legend className="px-1 text-caption font-medium tracking-wide text-ink-muted uppercase">
            Modül izinleri
          </legend>
          {/* İşaretsiz kutular gönderilmez, yani "hiç modül seçilmedi" ile
              "bu blok hiç çizilmedi" sunucuda AYNI görünüyor. Bu gizli alan
              ikisini ayırıyor: yoksa sunucu modüllere hiç dokunmuyor. */}
          <input type="hidden" name="modullerGonderildi" value="1" />
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
        className={buttonClass({ size: "md", className: "self-start" })}
      >
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </KorunanForm>
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
    <KorunanForm action={formAction} sonuc={state} sifirla className="flex flex-col items-end gap-1">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex gap-1">
        <SifreAlani
          placeholder="yeni şifre"
          className="w-36 rounded-chip border border-line px-2 py-1 text-caption outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        />
        <button
          type="submit"
          disabled={pending}
          className={buttonClass({ size: "sm" })}
        >
          Kaydet
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={buttonClass({ variant: "ghost", size: "sm" })}
        >
          ✕
        </button>
      </div>
      {state.error ? (
        <span className="text-caption text-danger" role="alert">{state.error}</span>
      ) : null}
      {state.saved ? (
        <span className="text-caption text-success" role="status">{state.saved}</span>
      ) : null}
    </KorunanForm>
  );
}

export function ToggleUserButton({
  userId,
  active,
  ad,
  disabled,
}: {
  userId: string;
  active: boolean;
  /** Onay metninde kimin pasifleştirileceği yazsın. */
  ad: string;
  disabled: boolean;
}) {
  if (disabled) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="px-2"
        disabled
        title="Kendi hesabınızı kapatamazsınız"
      >
        <UserX className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">Pasifleştir</span>
      </Button>
    );
  }

  return (
    <form action={toggleUser}>
      <input type="hidden" name="userId" value={userId} />
      {active ? (
        // Pasifleştirme girişi kesen bir işlem: ilk tık yalnızca soruyor,
        // ikinci tık uyguluyor (UI incelemesi: riskli işlem onaysızdı).
        // Geri alınabilir — aynı satırda "Aktifleştir" olarak döner.
        <SilDugmesi
          title="Pasifleştir — panele giremez, kaydı silinmez"
          className={buttonClass({ variant: "secondary", size: "sm", className: "px-2 text-danger-ink" })}
          onayClassName="bg-danger! text-white! ring-danger! px-2.5"
          onayMetni={`${ad.split(" ")[0]} pasifleşsin mi?`}
        >
          <UserX className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Pasifleştir</span>
        </SilDugmesi>
      ) : (
        <GonderDugmesi
          title="Aktifleştir"
          className={buttonClass({ variant: "secondary", size: "sm", className: "px-2" })}
        >
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Aktifleştir</span>
        </GonderDugmesi>
      )}
    </form>
  );
}

function Feedback({ state }: { state: UserFormState }) {
  if (state.error) {
    return (
      <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.saved) {
    return (
      <p className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink" role="status">
        {state.saved}
      </p>
    );
  }
  return null;
}
