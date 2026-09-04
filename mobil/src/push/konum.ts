import * as Location from "expo-location";
import { api } from "../api/istemci";

/**
 * Son bilinen konumu sunucuya bildirir — YALNIZCA bölgesel bildirim için.
 *
 * Arka plan takibi YOK. Bu fonksiyon, kullanıcı zaten konum izni vermişse
 * ve zaten haritayı/keşfeti açmışsa çağrılıyor; izin YOKSA izin de
 * İSTEMİYOR (`sessiz` modu). "Bildirim için konumunu paylaş" diye ayrıca
 * izin dilenmek, kullanıcının haritayı açma niyetiyle ilgisi olmayan bir
 * pencere açmak olurdu.
 *
 * Aynı oturumda tekrar tekrar yazmamak için basit bir zaman kapısı var:
 * konum sunucuda yalnızca hedefleme için tutuluyor, dakikada bir
 * güncellemenin hiçbir karşılığı yok (bkz. lib/app-push.ts,
 * KONUM_TAZELIK_SAATI).
 */

const EN_KISA_ARALIK_MS = 30 * 60 * 1000;
let sonGonderim = 0;

export async function konumuBildir(): Promise<void> {
  if (Date.now() - sonGonderim < EN_KISA_ARALIK_MS) return;

  try {
    // İzin YOKSA sessizce çık: bu fonksiyon izin isteme yeri değil.
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return;

    const konum = await Location.getLastKnownPositionAsync();
    if (!konum) return;

    sonGonderim = Date.now();
    await api.post("/api/app/konum", {
      enlem: konum.coords.latitude,
      boylam: konum.coords.longitude,
    });
  } catch {
    // Konum bildirimi tamamen isteğe bağlı bir yan iş; sessizce geçilir.
  }
}
