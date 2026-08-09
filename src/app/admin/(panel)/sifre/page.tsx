import { redirect } from "next/navigation";

/**
 * Şifre değiştirme artık Profil sekmesinin bir parçası.
 * Eski bağlantılar bozulmasın diye bu yol oraya yönlendiriyor.
 */
export default function PasswordRedirect() {
  redirect("/admin/profil");
}
