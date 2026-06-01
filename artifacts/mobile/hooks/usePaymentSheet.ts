// Web stub — Stripe React Native is native-only.
// On web, payments go through the API directly (future: Stripe.js).
export function usePaymentSheet() {
  const initPaymentSheet = async (_options: any) => ({
    error: undefined as any,
  });
  const presentPaymentSheet = async () => ({
    error: { code: "WebUnsupported", message: "Native payments not available on web" } as any,
  });
  return { initPaymentSheet, presentPaymentSheet };
}
