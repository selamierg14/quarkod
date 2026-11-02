import "server-only";
import { prisma } from "../cekirdek/db";

/**
 * SUNUCU TARAFI JETON İPTALİ.
 *
 * Çıkış eskiden yalnızca istemcideki jeton kopyasını siliyordu. Jeton
 * durumsuz olduğu için sunucu onu süresi dolana kadar kabul etmeye devam
 * ediyordu: çalınmış bir kopya tüketicide 30 gün, panelde 12 saat
 * geçerliydi (canlı doğrulandı — çıkıştan sonra kopya 200 döndü).
 *
 * Satır jetonun kendi bitiş anına kadar tutuluyor; sonrası için jeton
 * zaten geçersiz. Temizlik: api/cron/kvkk-temizle.
 */

export async function jetonIptalEt(jti: string, bitisSn: number): Promise<void> {
  await prisma.iptalEdilenJeton.upsert({
    where: { jti },
    // Aynı jetonla iki kez çıkış (iki sekme, çift dokunuş) hata değil.
    update: {},
    create: { jti, bitis: new Date(bitisSn * 1000) },
  });
}

export async function jetonIptalMi(jti: string): Promise<boolean> {
  const kayit = await prisma.iptalEdilenJeton.findUnique({
    where: { jti },
    select: { jti: true },
  });
  return kayit !== null;
}

/**
 * Jetonu TEK SEFERLİK tüketir: ilk çağıran `true` alır, sonrakiler `false`.
 *
 * Şifre sıfırlama bileti için. `jetonIptalMi` + `jetonIptalEt` ayrı
 * çağrılsaydı, aynı bileti eşzamanlı iki istek ikisi de "iptal edilmemiş"
 * görüp iki kez kullanabilirdi. Birincil anahtar çakışması bunu
 * veritabanında tek bir yazmaya indiriyor.
 */
export async function jetonuTuket(jti: string, bitisSn: number): Promise<boolean> {
  try {
    await prisma.iptalEdilenJeton.create({ data: { jti, bitis: new Date(bitisSn * 1000) } });
    return true;
  } catch {
    return false;
  }
}

/** Süresi dolmuş iptal kayıtlarını siler. */
export async function eskiIptalleriTemizle(): Promise<number> {
  const { count } = await prisma.iptalEdilenJeton.deleteMany({
    where: { bitis: { lt: new Date() } },
  });
  return count;
}
