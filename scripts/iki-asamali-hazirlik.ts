import "dotenv/config";
import { createScriptClient } from "./prisma-client";
import { Prisma } from "../src/generated/prisma/client";
import { otpTelefonu } from "../src/lib/kimlik/iki-asamali";
import { telefonListesi } from "../src/lib/kimlik/telefonlar";

/**
 * "İki aşamalı doğrulamayı açarsam kim giremez?"
 *
 *   npm run 2fa:hazirlik          → yalnızca RAPOR
 *   npm run 2fa:hazirlik -- --onar → demo hesaplarının numarasını düzeltir
 *
 * NEDEN VAR. `TWO_FACTOR_ENABLED=true` yapmak tek satırlık bir değişiklik
 * ama sonucu veriye bağlı: kodu gönderilemeyen her hesap giriş yapamaz
 * hâle gelir. Bayrağı açıp sonucu kullanıcıların "giremiyorum"
 * bildirimlerinden öğrenmek, bu işin en pahalı yolu.
 *
 * Önceki hâlde bu sorun hiç görünmüyordu çünkü giriş akışı telefonu
 * olmayanı SESSİZCE 2FA'sız içeri alıyordu — yani bayrak açıkken bile
 * hesapların çoğu tek faktörle giriyordu ve kimse fark etmiyordu. Kapı
 * kapalı devreye çevrilince o sessiz boşluk görünür bir kilitlenmeye
 * dönüştü; bu betik de onu önceden görmek için.
 *
 * `--onar` YALNIZCA DEMO hesaplarına dokunuyor (adı `demo.` ile başlayan
 * ya da `.demo` ile biten). Gerçek bir kullanıcıya betikle telefon
 * yazmak yanlış olurdu: o numara kimlik kanıtı olarak kullanılacak, yani
 * doğru sahibine ait olduğunu yalnızca panelden giren bir yönetici
 * teyit edebilir.
 */

/** Demo verisi mi — betiğin yazmasına izin verilen tek küme. */
function demoMu(username: string): boolean {
  return username.startsWith("demo.") || username.endsWith(".demo");
}

/**
 * Demo hesapları için geçerli biçimde, birbirinden farklı numara üretir.
 *
 * Gerçek bir numaraya denk gelmemesi için 555'li aralık kullanılıyor —
 * Türkiye'de operatörlere tahsis edilmemiş bir ön ek.
 */
function demoNumarasi(sira: number): string {
  return `+90555${String(sira).padStart(7, "0")}`;
}

async function main() {
  const onar = process.argv.includes("--onar");
  const prisma = createScriptClient();

  try {
    const kullanicilar = await prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        phone: true,
        telefonlar: { orderBy: { sira: "asc" }, select: { phone: true } },
      },
      orderBy: { username: "asc" },
    });

    // Yedek numarası olan kullanıcı, birincili bozuk olsa bile kod
    // alabiliyor — rapor bunu hesaba katmazsa var olmayan bir kilitlenme
    // bildirip yanlış yönlendirir.
    const sorunlular = kullanicilar
      .map((k) => {
        const hepsi = telefonListesi(
          k.phone,
          k.telefonlar.map((t) => t.phone),
        );
        return { ...k, durum: otpTelefonu(hepsi[0] ?? null).durum };
      })
      .filter((k) => k.durum !== "hazir");

    console.log(`Aktif panel kullanıcısı : ${kullanicilar.length}`);
    console.log(`Kod gönderilebilir      : ${kullanicilar.length - sorunlular.length}`);
    console.log(`GİREMEYECEK             : ${sorunlular.length}\n`);

    if (sorunlular.length === 0) {
      console.log("✓ Herkes iki aşamalı doğrulamadan geçebilir.");
      return;
    }

    const demolar = sorunlular.filter((k) => demoMu(k.username));
    const gercekler = sorunlular.filter((k) => !demoMu(k.username));

    for (const [baslik, liste] of [
      ["DEMO hesapları", demolar],
      ["GERÇEK hesaplar", gercekler],
    ] as const) {
      if (liste.length === 0) continue;
      console.log(`${baslik} (${liste.length}):`);
      for (const k of liste.slice(0, 10)) {
        const sebep =
          k.durum === "telefonYok" ? "telefon yok" : `geçersiz numara: ${k.phone}`;
        console.log(`  · ${k.username} (${k.role}) — ${sebep}`);
      }
      if (liste.length > 10) console.log(`  … ve ${liste.length - 10} tane daha`);
      console.log("");
    }

    if (gercekler.length > 0) {
      console.log(
        "GERÇEK hesaplara bu betik DOKUNMUYOR. Numara kimlik kanıtı olarak\n" +
          "kullanılacağı için doğru sahibine ait olduğunu ancak panelden giren\n" +
          "bir yönetici teyit edebilir: Kullanıcılar → Düzenle.\n",
      );
    }

    if (!onar) {
      if (demolar.length > 0) {
        console.log(`Demo hesaplarını düzeltmek için: npm run 2fa:hazirlik -- --onar`);
      }
      return;
    }

    if (demolar.length === 0) {
      console.log("Düzeltilecek demo hesabı yok.");
      return;
    }

    // Çakışmayı önlemek için kullanımdaki numaralar bir kez okunuyor;
    // döngü içinde sorgu yok.
    const kullanimda = new Set(
      (await prisma.user.findMany({ select: { phone: true } }))
        .map((k) => k.phone)
        .filter((p): p is string => Boolean(p)),
    );

    let sira = 1;
    const atamalar = demolar.map((k) => {
      let numara = demoNumarasi(sira++);
      while (kullanimda.has(numara)) numara = demoNumarasi(sira++);
      kullanimda.add(numara);
      return { id: k.id, numara };
    });

    // TEK SORGU. İlk hâli 50 ayrı `user.update`'i bir `$transaction` dizisine
    // koyuyordu ve uzak veritabanında (Neon) 5 saniyelik etkileşimli
    // transaction sınırını aşıp geri alındı — 50 gidiş dönüş, her biri ~100ms.
    //
    // `UPDATE ... FROM (VALUES ...)` hepsini tek ifadede yapıyor: tek gidiş
    // dönüş, ve tek ifade olduğu için zaten atomik. Değerler `Prisma.sql`
    // ile parametreleniyor, dizeye gömülmüyor.
    const satirlar = atamalar.map((a) => Prisma.sql`(${a.id}, ${a.numara})`);
    await prisma.$executeRaw`
      UPDATE users SET phone = v.phone
      FROM (VALUES ${Prisma.join(satirlar)}) AS v(id, phone)
      WHERE users.id = v.id`;
    console.log(`✓ ${demolar.length} demo hesabının numarası düzeltildi.`);
    console.log(
      "\nNot: kodlar SMS_TEST_PHONE doluyken zaten tek test numarasına gidiyor,\n" +
        "yani bu numaralara gerçek SMS çıkmıyor.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
