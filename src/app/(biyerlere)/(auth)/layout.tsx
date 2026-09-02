/**
 * Giriş/kayıt kabuğu: uygulama kromu (Header, BottomNav) yok — henüz
 * kimliği olmayan birine "Cüzdan" sekmesi anlamsız, üstelik boş bir
 * ekrana düşerdi. Tek sütun, dikey ortalanmış, telefon genişliğinde.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      {children}
    </div>
  );
}
