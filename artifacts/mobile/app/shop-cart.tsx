import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useCart } from "@/contexts/CartContext";
import { useColors } from "@/hooks/useColors";
import { usePaymentSheet } from "@/hooks/usePaymentSheet";
import { saveShopOrder } from "@/lib/firestore";

export default function ShopCartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();
  const { items, updateQty, removeItem, clearCart, totalPrice, totalItems } = useCart();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Shipping address
  const [shipName, setShipName] = useState("");
  const [shipLine1, setShipLine1] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipPostcode, setShipPostcode] = useState("");

  const shippingFree = totalPrice >= 40;
  const shippingCost = shippingFree ? 0 : 3.99;
  const orderTotal = totalPrice + shippingCost;

  const canCheckout =
    items.length > 0 &&
    shipName.trim().length > 0 &&
    shipLine1.trim().length > 0 &&
    shipCity.trim().length > 0 &&
    shipPostcode.trim().length > 0;

  const handleCheckout = async () => {
    if (!canCheckout) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";

      // 1. Create PaymentIntent
      const resp = await fetch(`${apiUrl}/api/shop/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            emoji: i.emoji,
          })),
          total: orderTotal,
          userId: userId ?? "guest",
        }),
      });

      if (!resp.ok) {
        const { error } = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error ?? "Failed to start checkout");
      }

      const { clientSecret, paymentIntentId } = await resp.json();

      // 2. Init Stripe payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Soul Remembrance",
        style: "alwaysDark",
        appearance: {
          colors: {
            primary: "#6B4FA8",
            background: "#2D1B69",
            componentBackground: "#3D2496",
            componentText: "#FFFFFF",
            primaryText: "#FFFFFF",
            secondaryText: "rgba(255,255,255,0.65)",
          },
        },
      });
      if (initError) throw new Error(initError.message);

      // 3. Present payment sheet
      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        if (payError.code === "Canceled") {
          setLoading(false);
          return;
        }
        throw new Error(payError.message);
      }

      // 4. Payment succeeded — save order
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await saveShopOrder({
        userId: userId ?? "guest",
        items: items.map((i) => ({
          productId: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          emoji: i.emoji,
        })),
        total: orderTotal,
        shippingName: shipName.trim(),
        shippingLine1: shipLine1.trim(),
        shippingCity: shipCity.trim(),
        shippingPostcode: shipPostcode.trim(),
        paymentIntentId,
      });

      clearCart();
      setSuccess(true);
    } catch (err: any) {
      Alert.alert("Payment Failed", err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.softWhite }]}>
        <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.deepIndigo }]}>
          <View style={{ width: 36 }} />
          <Text style={styles.headerTitle}>Order Confirmed</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.successBody}>
          <View style={[styles.successCircle, { backgroundColor: "#E8F5E9" }]}>
            <Text style={{ fontSize: 56 }}>🌿</Text>
          </View>
          <Text style={[styles.successTitle, { color: colors.charcoal }]}>Thank you!</Text>
          <Text style={[styles.successSub, { color: colors.sage }]}>
            Your order has been placed. We'll dispatch it within 1–2 working days and send a confirmation to your email.
          </Text>
          <TouchableOpacity
            style={[styles.successBtn, { backgroundColor: colors.deepIndigo }]}
            onPress={() => router.replace("/(tabs)/shop" as any)}
          >
            <Text style={styles.successBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Cart screen ───────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.softWhite }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.deepIndigo }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Your Basket {totalItems > 0 ? `(${totalItems})` : ""}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Empty state */}
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 64 }}>🛍️</Text>
          <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>Your basket is empty</Text>
          <Text style={[styles.emptySub, { color: colors.sage }]}>
            Head back to the shop to add some spiritual treasures.
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.deepIndigo }]}
            onPress={() => router.back()}
          >
            <Text style={styles.emptyBtnText}>Browse the Shop</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cart items */}
          <Text style={[styles.sectionLabel, { color: colors.sage }]}>Items</Text>
          {items.map((item) => (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: "#fff", borderColor: colors.cream }]}>
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors.charcoal }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.itemPrice, { color: colors.warmGold }]}>
                  £{item.price.toFixed(2)}
                </Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={[styles.qtyBtn, { borderColor: colors.blush }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateQty(item.id, item.quantity - 1);
                  }}
                >
                  <Feather name={item.quantity === 1 ? "trash-2" : "minus"} size={13} color={item.quantity === 1 ? "#E53E3E" : colors.charcoal} />
                </TouchableOpacity>
                <Text style={[styles.qtyNum, { color: colors.charcoal }]}>{item.quantity}</Text>
                <TouchableOpacity
                  style={[styles.qtyBtn, { borderColor: colors.blush }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateQty(item.id, item.quantity + 1);
                  }}
                >
                  <Feather name="plus" size={13} color={colors.charcoal} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Order summary */}
          <Text style={[styles.sectionLabel, { color: colors.sage, marginTop: 20 }]}>Order Summary</Text>
          <View style={[styles.summaryCard, { backgroundColor: "#fff", borderColor: colors.cream }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryKey, { color: colors.charcoal }]}>Subtotal</Text>
              <Text style={[styles.summaryVal, { color: colors.charcoal }]}>£{totalPrice.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.cream, marginTop: 8, paddingTop: 8 }]}>
              <Text style={[styles.summaryKey, { color: colors.charcoal }]}>Postage & packing</Text>
              {shippingFree ? (
                <Text style={[styles.summaryVal, { color: "#38a169" }]}>FREE</Text>
              ) : (
                <Text style={[styles.summaryVal, { color: colors.charcoal }]}>£{shippingCost.toFixed(2)}</Text>
              )}
            </View>
            {!shippingFree && (
              <Text style={[styles.freeShipHint, { color: colors.sage }]}>
                Add £{(40 - totalPrice).toFixed(2)} more for free postage
              </Text>
            )}
            <View style={[styles.totalRow, { borderTopColor: colors.blush }]}>
              <Text style={[styles.totalKey, { color: colors.charcoal }]}>Total</Text>
              <Text style={[styles.totalVal, { color: colors.deepIndigo }]}>£{orderTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Shipping address */}
          <Text style={[styles.sectionLabel, { color: colors.sage, marginTop: 20 }]}>Delivery Address</Text>
          <View style={[styles.addressCard, { backgroundColor: "#fff", borderColor: colors.cream }]}>
            {[
              { label: "Full Name", value: shipName, setter: setShipName, placeholder: "Jane Smith" },
              { label: "Address Line 1", value: shipLine1, setter: setShipLine1, placeholder: "12 Rose Lane" },
              { label: "City / Town", value: shipCity, setter: setShipCity, placeholder: "London" },
              { label: "Postcode", value: shipPostcode, setter: setShipPostcode, placeholder: "SW1A 1AA" },
            ].map(({ label, value, setter, placeholder }) => (
              <View key={label} style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.sage }]}>{label}</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.blush, color: colors.charcoal, backgroundColor: colors.cream }]}
                  placeholder={placeholder}
                  placeholderTextColor={colors.sage}
                  value={value}
                  onChangeText={setter}
                  autoCapitalize="words"
                />
              </View>
            ))}
          </View>

          {/* Delivery note */}
          <View style={[styles.deliveryNote, { backgroundColor: colors.cream, borderColor: colors.blush }]}>
            <Feather name="package" size={13} color={colors.deepIndigo} />
            <Text style={[styles.deliveryText, { color: colors.sage }]}>
              UK delivery only · Dispatched within 1–2 working days
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Checkout button */}
      {items.length > 0 && (
        <View style={[styles.checkoutBar, { paddingBottom: bottomPad + 8, backgroundColor: colors.softWhite, borderTopColor: colors.cream }]}>
          <TouchableOpacity
            style={[
              styles.checkoutBtn,
              { backgroundColor: canCheckout ? colors.deepIndigo : colors.blush },
            ]}
            disabled={!canCheckout || loading}
            onPress={handleCheckout}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="lock" size={15} color="#fff" />
                <Text style={styles.checkoutBtnText}>
                  Pay £{orderTotal.toFixed(2)}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {!canCheckout && items.length > 0 && (
            <Text style={[styles.checkoutHint, { color: colors.sage }]}>
              Please fill in your delivery address above
            </Text>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingBottom: 60 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  emptyBtn: { borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  itemEmoji: { fontSize: 32 },
  itemName: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20, marginBottom: 2 },
  itemPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  qtyNum: { fontSize: 15, fontFamily: "Inter_700Bold", minWidth: 20, textAlign: "center" },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryKey: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryVal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  freeShipHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  totalKey: { fontSize: 16, fontFamily: "Inter_700Bold" },
  totalVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  addressCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular" },
  deliveryNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  deliveryText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  checkoutBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
  },
  checkoutBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  checkoutHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 6 },
  successBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingBottom: 60 },
  successCircle: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  successTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 10 },
  successSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24, marginBottom: 32 },
  successBtn: { borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14 },
  successBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
