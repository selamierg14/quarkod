import { BottomNav } from "../components/BottomNav";
import { Header } from "../components/Header";

/**
 * Uygulama içi sayfaların ortak kabuğu: üstte Header, altta BottomNav,
 * ortada telefon genişliğinde sabitlenmiş içerik.
 *
 * Giriş/kayıt ekranları (bkz. ../(auth)/layout.tsx) BUNU kullanmıyor —
 * henüz kimliği olmayan birine "Cüzdan" sekmesi göstermenin bir anlamı
 * yok, üstelik dokunduğunda boş bir ekrana düşerdi.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col">
      <Header />
      <main className="flex-1 px-4 pb-24 pt-3">{children}</main>
      <BottomNav />
    </div>
  );
}
