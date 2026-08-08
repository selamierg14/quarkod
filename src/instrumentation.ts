/**
 * Sunucu tarafı hata kaydı.
 *
 * Canlıda bir şey patladığında kimsenin haberi olmaması en sinsi arıza türü:
 * müşteri anketi gönderemez, panel boş görünür, kimse fark etmez. Buradaki
 * kanca her sunucu hatasını tek satırlık, aranabilir bir kayda çevirir.
 *
 * Sentry gibi bir servise bağlamak isterseniz: paketi kurun ve aşağıdaki
 * `logError` içinden `Sentry.captureException(error)` çağırın — çağrı noktası
 * hazır, başka yeri değiştirmeye gerek yok.
 */

type ErrorContext = {
  path?: string;
  method?: string;
  routeType?: string;
};

function logError(error: unknown, context: ErrorContext) {
  const time = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(
    `[hata] ${time} ${context.method ?? "-"} ${context.path ?? "-"} (${context.routeType ?? "-"}): ${message}`,
  );
  if (stack) console.error(stack);
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routeType: string },
) {
  logError(error, {
    path: request.path,
    method: request.method,
    routeType: context.routeType,
  });
}

export async function register() {
  // Yakalanmayan hatalar Next'in kancasına düşmez; onları da kayda alalım.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      logError(reason, { path: "unhandledRejection" });
    });
    process.on("uncaughtException", (error) => {
      logError(error, { path: "uncaughtException" });
    });
  }
}
