import { StripeProvider } from "@stripe/stripe-react-native";
import React from "react";

export function StripeProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
      merchantIdentifier="merchant.com.soul-remembrance"
    >
      {children as React.ReactElement}
    </StripeProvider>
  );
}
