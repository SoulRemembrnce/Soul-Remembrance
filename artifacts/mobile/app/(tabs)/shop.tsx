import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCart } from "@/contexts/CartContext";
import { useColors } from "@/hooks/useColors";
import {
  FSVendorProduct,
  FSVendorProfile,
  isProductFeaturedActive,
  subscribeAllShopProducts,
  subscribeAllVendorProfiles,
} from "@/lib/firestore";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "crystals", label: "Crystals" },
  { key: "bracelets", label: "Bracelets" },
  { key: "sound-healing", label: "Sound Healing" },
  { key: "incense", label: "Incense" },
  { key: "books", label: "Books" },
  { key: "clothing", label: "Clothing" },
  { key: "art", label: "Art & Decor" },
  { key: "other", label: "Other" },
] as const;

const CATEGORY_STYLE: Record<string, { bg: string; icon: string }> = {
  crystals:        { bg: "#EDE8F5", icon: "#6B4FA8" },
  bracelets:       { bg: "#FFF8E0", icon: "#C9A84C" },
  "sound-healing": { bg: "#E8F4FF", icon: "#4A7FA0" },
  incense:         { bg: "#E8F5EE", icon: "#4A8A6B" },
  books:           { bg: "#FFF0E8", icon: "#C97A4C" },
  clothing:        { bg: "#F0E8FF", icon: "#7A4CC9" },
  art:             { bg: "#E8FFF0", icon: "#4CC97A" },
  other:           { bg: "#F5F5F5", icon: "#888" },
};

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  vendorTier,
}: {
  product: FSVendorProduct;
  vendorTier?: "basic" | "verified";
}) {
  const colors = useColors();
  const { addItem, items } = useCart();
  const inCart = items.find((i) => i.id === product.id);
  const style = CATEGORY_STYLE[product.category] ?? CATEGORY_STYLE.other;
  const isVerified = vendorTier === "verified";

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      emoji: product.emoji,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
    });
  };

  return (
    <View style={[pStyles.card, { backgroundColor: "#fff", borderColor: colors.cream }]}>
      {product.imageUrl ? (
        <View style={pStyles.imageArea}>
          <Image source={{ uri: product.imageUrl }} style={pStyles.productImage} resizeMode="cover" />
          {isProductFeaturedActive(product) && (
            <View style={[pStyles.featuredBadge, { backgroundColor: colors.deepIndigo }]}>
              <Text style={pStyles.featuredText}>⭐ Featured</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={[pStyles.emojiArea, { backgroundColor: style.bg }]}>
          <Text style={pStyles.emoji}>{product.emoji}</Text>
          {isProductFeaturedActive(product) && (
            <View style={[pStyles.featuredBadge, { backgroundColor: colors.deepIndigo }]}>
              <Text style={pStyles.featuredText}>⭐ Featured</Text>
            </View>
          )}
        </View>
      )}

      <View style={pStyles.info}>
        <Text style={[pStyles.name, { color: colors.charcoal }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[pStyles.price, { color: colors.warmGold }]}>
          £{product.price.toFixed(2)}
        </Text>
        <View style={pStyles.vendorRow}>
          <Text style={[pStyles.vendorName, { color: colors.sage }]} numberOfLines={1}>
            {product.vendorName}
          </Text>
          {isVerified && (
            <View style={[pStyles.verifiedBadge, { backgroundColor: "#E8F5E9" }]}>
              <Feather name="check-circle" size={9} color="#38a169" />
              <Text style={[pStyles.verifiedText, { color: "#38a169" }]}>Verified</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[pStyles.addBtn, { backgroundColor: inCart ? "#E8F5E9" : colors.deepIndigo }]}
        onPress={handleAdd}
        activeOpacity={0.85}
      >
        {inCart ? (
          <View style={pStyles.addBtnInner}>
            <Feather name="check" size={12} color="#38a169" />
            <Text style={[pStyles.addBtnText, { color: "#38a169" }]}>{inCart.quantity} added</Text>
          </View>
        ) : (
          <View style={pStyles.addBtnInner}>
            <Feather name="plus" size={12} color="#fff" />
            <Text style={[pStyles.addBtnText, { color: "#fff" }]}>Add</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const pStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  imageArea: { width: "100%", position: "relative" },
  productImage: { width: "100%", height: 130 },
  emojiArea: { alignItems: "center", justifyContent: "center", paddingVertical: 22, position: "relative" },
  emoji: { fontSize: 42 },
  featuredBadge: {
    position: "absolute", top: 8, right: 8,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  featuredText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.3 },
  info: { padding: 12, flex: 1 },
  name: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18, marginBottom: 4 },
  price: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  vendorRow: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  vendorName: { fontSize: 10, fontFamily: "Inter_400Regular" },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6,
  },
  verifiedText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  addBtn: { marginHorizontal: 12, marginBottom: 12, borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  addBtnInner: { flexDirection: "row", alignItems: "center", gap: 5 },
  addBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

// ─── Featured strip ───────────────────────────────────────────────────────────

function FeaturedStrip({
  products,
  vendorMap,
}: {
  products: FSVendorProduct[];
  vendorMap: Record<string, FSVendorProfile>;
}) {
  const colors = useColors();
  const { addItem, items } = useCart();
  const featured = useMemo(() => products.filter((p) => isProductFeaturedActive(p)).slice(0, 10), [products]);

  if (featured.length === 0) return null;

  return (
    <View style={fStyles.container}>
      <Text style={[fStyles.heading, { color: colors.charcoal }]}>⭐ Featured</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fStyles.scroll}>
        {featured.map((p) => {
          const inCart = items.find((i) => i.id === p.id);
          const style = CATEGORY_STYLE[p.category] ?? CATEGORY_STYLE.other;
          const vendor = vendorMap[p.vendorId];
          return (
            <View key={p.id} style={[fStyles.card, { backgroundColor: "#fff", borderColor: colors.cream }]}>
              <View style={[fStyles.emojiWrap, { backgroundColor: style.bg }]}>
                <Text style={fStyles.emoji}>{p.emoji}</Text>
              </View>
              <View style={fStyles.info}>
                <Text style={[fStyles.name, { color: colors.charcoal }]} numberOfLines={2}>{p.name}</Text>
                <Text style={[fStyles.price, { color: colors.warmGold }]}>£{p.price.toFixed(2)}</Text>
                {vendor && (
                  <Text style={[fStyles.vendor, { color: colors.sage }]} numberOfLines={1}>
                    {p.vendorName}{vendor.tier === "verified" ? " ✓" : ""}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[fStyles.btn, { backgroundColor: inCart ? "#E8F5E9" : colors.deepIndigo }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  addItem({ id: p.id, name: p.name, price: p.price, category: p.category, emoji: p.emoji, vendorId: p.vendorId, vendorName: p.vendorName });
                }}
                activeOpacity={0.85}
              >
                {inCart
                  ? <Feather name="check" size={14} color="#38a169" />
                  : <Feather name="plus" size={14} color="#fff" />}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const fStyles = StyleSheet.create({
  container: { paddingTop: 16 },
  heading: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 10, paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 16, gap: 10 },
  card: {
    width: 160, borderRadius: 14, borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 5, elevation: 2,
  },
  emojiWrap: { alignItems: "center", paddingVertical: 16 },
  emoji: { fontSize: 36 },
  info: { padding: 10 },
  name: { fontSize: 12, fontFamily: "Inter_600SemiBold", lineHeight: 17, marginBottom: 2 },
  price: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  vendor: { fontSize: 10, fontFamily: "Inter_400Regular" },
  btn: { margin: 10, marginTop: 4, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
});

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyShop({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 40 }}>
      <Text style={{ fontSize: 56, marginBottom: 16 }}>🏪</Text>
      <Text style={{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.charcoal, textAlign: "center", marginBottom: 8 }}>
        No products yet
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.sage, textAlign: "center", lineHeight: 22 }}>
        Vendors are setting up their shops — check back soon for spiritual crystals, bracelets, sound healing tools and more.
      </Text>
    </View>
  );
}

// ─── Main shop screen ─────────────────────────────────────────────────────────

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { totalItems } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [products, setProducts] = useState<FSVendorProduct[]>([]);
  const [vendorProfiles, setVendorProfiles] = useState<FSVendorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    let loaded = { products: false, vendors: false };
    const unsub1 = subscribeAllShopProducts((p) => {
      setProducts(p);
      loaded.products = true;
      if (loaded.vendors) setLoading(false);
    });
    const unsub2 = subscribeAllVendorProfiles((v) => {
      setVendorProfiles(v);
      loaded.vendors = true;
      if (loaded.products) setLoading(false);
    });
    // Fallback: stop loading after 4s even if one subscription is slow
    const timer = setTimeout(() => setLoading(false), 4000);
    return () => { unsub1(); unsub2(); clearTimeout(timer); };
  }, []);

  const vendorMap = useMemo(() => {
    const map: Record<string, FSVendorProfile> = {};
    for (const v of vendorProfiles) map[v.userId] = v;
    return map;
  }, [vendorProfiles]);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  const rows = useMemo(() => {
    const pairs: (FSVendorProduct | null)[][] = [];
    for (let i = 0; i < filtered.length; i += 2) {
      pairs.push([filtered[i], filtered[i + 1] ?? null]);
    }
    return pairs;
  }, [filtered]);

  return (
    <View style={[styles.container, { backgroundColor: colors.softWhite }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.deepIndigo }]}>
        <View>
          <Text style={styles.headerTitle}>Soul Shop</Text>
          <Text style={styles.headerSub}>Crystals, sound healing & more</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/vendor-onboarding" as any);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.sellText}>Sell</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cartBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/shop-cart" as any);
            }}
            activeOpacity={0.8}
          >
            <Feather name="shopping-bag" size={20} color="#fff" />
            {totalItems > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: colors.warmGold }]}>
                <Text style={styles.cartBadgeText}>{totalItems > 9 ? "9+" : totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.warmGold} size="large" />
          <Text style={{ marginTop: 12, color: colors.sage, fontFamily: "Inter_400Regular" }}>
            Loading shop…
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Featured strip */}
          {activeCategory === "all" && (
            <FeaturedStrip products={products} vendorMap={vendorMap} />
          )}

          {/* Category filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catScroll}
            contentContainerStyle={styles.catContent}
          >
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  style={[
                    styles.catPill,
                    { backgroundColor: active ? colors.deepIndigo : colors.cream, borderColor: active ? colors.deepIndigo : colors.blush },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveCategory(cat.key);
                  }}
                >
                  <Text style={[styles.catText, { color: active ? "#fff" : colors.sage }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Product count */}
          {products.length > 0 && (
            <Text style={[styles.countLabel, { color: colors.sage }]}>
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
              {activeCategory !== "all" ? ` in ${CATEGORIES.find((c) => c.key === activeCategory)?.label}` : ""}
            </Text>
          )}

          {/* Product grid or empty state */}
          {filtered.length === 0 ? (
            <EmptyShop colors={colors} />
          ) : (
            <View style={styles.grid}>
              {rows.map((row, i) => (
                <View key={i} style={styles.row}>
                  <View style={styles.col}>
                    <ProductCard
                      product={row[0]!}
                      vendorTier={vendorMap[row[0]!.vendorId]?.tier}
                    />
                  </View>
                  <View style={styles.col}>
                    {row[1] ? (
                      <ProductCard
                        product={row[1]}
                        vendorTier={vendorMap[row[1].vendorId]?.tier}
                      />
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Sell banner */}
          <TouchableOpacity
            style={[styles.sellBanner, { backgroundColor: colors.deepIndigo }]}
            onPress={() => router.push("/vendor-onboarding" as any)}
            activeOpacity={0.88}
          >
            <Text style={styles.sellBannerEmoji}>🏪</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellBannerTitle}>Sell your spiritual products</Text>
              <Text style={styles.sellBannerSub}>List from £1.99 · 3% commission only</Text>
            </View>
            <Feather name="arrow-right" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          {/* Delivery notice */}
          <View style={[styles.deliveryNote, { backgroundColor: colors.cream, borderColor: colors.blush }]}>
            <Feather name="package" size={14} color={colors.deepIndigo} />
            <Text style={[styles.deliveryText, { color: colors.sage }]}>
              UK delivery within 3–5 working days · Free postage on orders over £40
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerBtn: {
    paddingHorizontal: 14, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  sellText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  cartBtn: {
    width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center",
  },
  cartBadge: {
    position: "absolute", top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center",
  },
  cartBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  catScroll: { marginTop: 16 },
  catContent: { paddingHorizontal: 16, gap: 8 },
  catPill: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, borderWidth: 1 },
  catText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  countLabel: { fontSize: 12, fontFamily: "Inter_400Regular", paddingHorizontal: 16, marginTop: 12, marginBottom: 4 },
  grid: { paddingHorizontal: 12, marginTop: 12 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  sellBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    padding: 16, borderRadius: 16,
  },
  sellBannerEmoji: { fontSize: 28 },
  sellBannerTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  sellBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },
  deliveryNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginHorizontal: 16, marginTop: 8, padding: 14, borderRadius: 12, borderWidth: 1,
  },
  deliveryText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
