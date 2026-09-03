import { Redirect } from "expo-router";

/** Kök adres doğrudan Keşfet'e düşüyor — uygulamanın ana ekranı orası. */
export default function Kok() {
  return <Redirect href="/kesfet" />;
}
