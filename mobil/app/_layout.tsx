import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { renkler } from "../src/tasarim";
import { useOturum } from "../src/store/oturum";

// Fontlar yüklenmeden açılış ekranı kapanmasın: aksi hâlde arayüz bir
// kare sistem fontuyla çizilip sonra Inter'e atlıyor ve metinler
// gözle görülür şekilde kayıyor.
void SplashScreen.preventAutoHideAsync();

export default function KokLayout() {
  const [fontlarHazir] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const hazirla = useOturum((s) => s.hazirla);
  const oturumDurumu = useOturum((s) => s.durum);

  useEffect(() => {
    void hazirla();
  }, [hazirla]);

  useEffect(() => {
    // İkisi de bitmeden açılmıyor: font hazır ama oturum bilinmiyorsa
    // kullanıcı bir an giriş ekranını görüp ana ekrana atlıyordu.
    if (fontlarHazir && oturumDurumu !== "yukleniyor") {
      void SplashScreen.hideAsync();
    }
  }, [fontlarHazir, oturumDurumu]);

  if (!fontlarHazir) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: renkler.zemin }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: renkler.zemin }}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: renkler.zemin },
              // Yeni ekranlar sağdan kayarak gelsin (iOS'un kendi hissi),
              // Android'de de aynı olsun ki iki platform aynı uygulama
              // gibi dursun.
              animation: "slide_from_right",
            }}
          />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
