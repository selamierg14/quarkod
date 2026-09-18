-- Apple / Google ile giriş.
-- Bağ e-postayla değil sağlayıcının kalıcı `sub` değeriyle kuruluyor:
-- e-posta değişebiliyor ve doğrulanmamış bir adresle eşleştirme,
-- başkasının hesabını devralmanın en kolay yolu olurdu.
ALTER TABLE "app_users" ADD COLUMN "googleSub" TEXT;
ALTER TABLE "app_users" ADD COLUMN "appleSub" TEXT;
CREATE UNIQUE INDEX "app_users_googleSub_key" ON "app_users"("googleSub");
CREATE UNIQUE INDEX "app_users_appleSub_key" ON "app_users"("appleSub");

-- Kullanıcının bildiği bir şifresi var mı. Sosyal girişle açılan hesapta
-- false: "mevcut şifreni gir" diyen işlemler onun yerine sağlayıcıdan
-- taze bir kimlik jetonu ister.
ALTER TABLE "app_users" ADD COLUMN "sifreBelirlendi" BOOLEAN NOT NULL DEFAULT true;
