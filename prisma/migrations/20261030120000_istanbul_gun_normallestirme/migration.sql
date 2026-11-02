-- Gün bazlı tarihleri İstanbul gece yarısına normalleştirir.
--
-- Neden: sunucu Vercel'de UTC'de, geliştirme makinesi İstanbul'da çalışıyordu
-- ve ikisi AYNI veritabanına yazıyordu. "Gün" alanları sunucunun yerel gece
-- yarısıyla yazıldığı için aynı gün iki ayrı anla saklandı (Ekim 2026):
--
--   shift_assignments.date   21:00Z × 214   00:00Z × 67
--   leave_requests.baslangic 21:00Z × 2     00:00Z × 2
--   shift_swap_requests      00:00Z × 4,    shift_notes 00:00Z × 1
--
-- Uygulama artık İstanbul saatiyle çalışıyor (src/instrumentation.ts), yani
-- doğru gösterim önceki günün 21:00Z'si. 00:00Z kayıtları UTC'de çalışan
-- sunucunun "D günü" — İstanbul'daki karşılığı D günü 00:00 = (D-1) 21:00Z,
-- yani 3 saat geri. Türkiye 2016'dan beri yaz saati uygulamıyor; fark sabit.
--
-- Sütunlar `timestamp(3)` (saat dilimsiz, Prisma UTC yazıyor); EXTRACT doğrudan
-- saklanan saati okuyor, oturum saat diliminden etkilenmiyor.
--
-- Tekrar çalıştırmak zararsız: 00:00Z'de gün kaydı kalmayınca hiçbir satır
-- değişmiyor (İstanbul gece yarısı hiçbir zaman 00:00Z olamaz).

BEGIN;

-- 1) Aynı kişi + aynı vardiya + aynı gün İKİ gösterimle varsa (4 çift),
--    UTC gösterimi fazlalık. Silmeden önce ona bağlı değişim talepleri
--    hayatta kalan kayda taşınıyor; yoksa ilişki Cascade olduğu için
--    talepler de silinirdi.
UPDATE "shift_swap_requests" AS s
SET "assignmentId" = b."id"
FROM "shift_assignments" AS a
JOIN "shift_assignments" AS b
  ON b."businessId" = a."businessId"
 AND b."userId" = a."userId"
 AND b."shift" = a."shift"
 AND b."date" = a."date" - INTERVAL '3 hours'
WHERE s."assignmentId" = a."id"
  AND EXTRACT(HOUR FROM a."date") = 0 AND EXTRACT(MINUTE FROM a."date") = 0;

DELETE FROM "shift_assignments" AS a
USING "shift_assignments" AS b
WHERE b."businessId" = a."businessId"
  AND b."userId" = a."userId"
  AND b."shift" = a."shift"
  AND b."date" = a."date" - INTERVAL '3 hours'
  AND EXTRACT(HOUR FROM a."date") = 0 AND EXTRACT(MINUTE FROM a."date") = 0;

-- 2) Kalan UTC gece yarısı kayıtları İstanbul gece yarısına.
UPDATE "shift_assignments" SET "date" = "date" - INTERVAL '3 hours'
WHERE EXTRACT(HOUR FROM "date") = 0 AND EXTRACT(MINUTE FROM "date") = 0;

UPDATE "shift_notes" SET "date" = "date" - INTERVAL '3 hours'
WHERE EXTRACT(HOUR FROM "date") = 0 AND EXTRACT(MINUTE FROM "date") = 0;

-- checklist_completions (itemId, date) tekil: önce çakışacak fazlalığı at.
DELETE FROM "checklist_completions" AS a
USING "checklist_completions" AS b
WHERE b."itemId" = a."itemId"
  AND b."date" = a."date" - INTERVAL '3 hours'
  AND EXTRACT(HOUR FROM a."date") = 0 AND EXTRACT(MINUTE FROM a."date") = 0;

UPDATE "checklist_completions" SET "date" = "date" - INTERVAL '3 hours'
WHERE EXTRACT(HOUR FROM "date") = 0 AND EXTRACT(MINUTE FROM "date") = 0;

UPDATE "leave_requests" SET "baslangic" = "baslangic" - INTERVAL '3 hours'
WHERE EXTRACT(HOUR FROM "baslangic") = 0 AND EXTRACT(MINUTE FROM "baslangic") = 0;

UPDATE "leave_requests" SET "bitis" = "bitis" - INTERVAL '3 hours'
WHERE EXTRACT(HOUR FROM "bitis") = 0 AND EXTRACT(MINUTE FROM "bitis") = 0;

UPDATE "shift_swap_requests" SET "hedefTarih" = "hedefTarih" - INTERVAL '3 hours'
WHERE "hedefTarih" IS NOT NULL
  AND EXTRACT(HOUR FROM "hedefTarih") = 0 AND EXTRACT(MINUTE FROM "hedefTarih") = 0;

COMMIT;
