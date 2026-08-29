-- Modül izinleri: iki boolean yerine devredilebilir bir modül kümesi.
--
-- Eski model yalnızca "menu" ve "anket"i tanıyordu; İYS, pazarlama izinleri
-- ve personel operasyonu ise rol kapılarıyla örtük olarak açıktı. Yeni model
-- beşini de aynı listede topluyor ve "kimse sahip olmadığı modülü altındakine
-- veremez" kuralını mümkün kılıyor.
--
-- GERİ DOLDURMA kimsenin erişimini daraltmayacak şekilde yazıldı: herkes bu
-- migration'dan önce neye erişebiliyorsa ona erişmeye devam ediyor.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "moduller" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Hesap sahibi ve platform yöneticisi eskiden bütün modüllere koşulsuz
-- erişiyordu (izinler getSession'da true'ya sabitleniyordu).
UPDATE "users"
SET "moduller" = ARRAY['anket', 'menu', 'iys', 'pazarlama', 'personel']
WHERE "role" IN ('owner', 'superadmin');

-- Bölge müdürü ve işletme sorumlusu: menü/anket kendi bayraklarına bağlıydı,
-- personel operasyonu ise onlara da açıktı. İYS ve pazarlama izinleri
-- requireTenantOwner'ın arkasındaydı — onlara hiç verilmiyor.
UPDATE "users"
SET "moduller" = ARRAY['personel']
  || (CASE WHEN "menuIzni"  THEN ARRAY['menu']  ELSE ARRAY[]::TEXT[] END)
  || (CASE WHEN "anketIzni" THEN ARRAY['anket'] ELSE ARRAY[]::TEXT[] END)
WHERE "role" IN ('bolge', 'manager');

-- Saha personeli (garson) bu ekranların hiçbirini görmüyordu; boş kalıyor.

-- "viewer" (salt okunur) rolü kaldırıldı. Üretimde bu rolde kullanıcı yok
-- (kontrol edildi), yine de olası bir kaydı erişimsiz bırakmamak için
-- işletme sorumlusuna çekiyoruz — satır silinmiyor.
UPDATE "users" SET "role" = 'manager' WHERE "role" = 'viewer';

-- Bir önceki migration'da eklenen geçici varsayılan: mevcut satırlar
-- dolduruldu, bundan sonrasını Prisma @updatedAt yönetiyor.
ALTER TABLE "push_subscriptions" ALTER COLUMN "updatedAt" DROP DEFAULT;
