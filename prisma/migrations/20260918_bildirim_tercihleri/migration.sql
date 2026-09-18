-- Kategori bazlı bildirim tercihleri.
-- Varsayılan AÇIK: kapalı başlatmak "hiç bildirim gitmiyor" demek olurdu,
-- kullanıcı kapatmadığı bir şeyi açmayı düşünmez.
ALTER TABLE "app_users" ADD COLUMN "bildirimFirsat" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "app_users" ADD COLUMN "bildirimFavoriDuyuru" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "app_users" ADD COLUMN "bildirimRozet" BOOLEAN NOT NULL DEFAULT true;
