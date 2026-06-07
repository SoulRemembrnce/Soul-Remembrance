import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Animated,
  FlatList,
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

// ─── Product catalogue ────────────────────────────────────────────────────────

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "crystals" | "bracelets" | "sound-healing" | "incense";
  emoji: string;
  featured?: boolean;
}

const PRODUCTS: ShopProduct[] = [
  // Crystals
  {
    id: "c1", name: "Amethyst Cluster", category: "crystals", emoji: "🔮", price: 18.99, featured: true,
    description: "A stunning natural amethyst cluster, perfect for calming energy, enhancing intuition and promoting restful sleep.",
  },
  {
    id: "c2", name: "Rose Quartz Palm Stone", category: "crystals", emoji: "🪨", price: 12.99,
    description: "Smooth rose quartz palm stone. Carries the energy of unconditional love and emotional healing.",
  },
  {
    id: "c3", name: "Black Tourmaline", category: "crystals", emoji: "⬛", price: 9.99,
    description: "A powerful protective crystal that creates a shield against negative energies and EMF.",
  },
  {
    id: "c4", name: "Clear Quartz Point", category: "crystals", emoji: "💎", price: 14.99,
    description: "The master healer. Amplifies energy, intention and the properties of surrounding crystals.",
  },
  {
    id: "c5", name: "Selenite Wand", category: "crystals", emoji: "🕯️", price: 11.99,
    description: "A cleansing and charging wand that clears stagnant energy from your space and other crystals.",
  },
  {
    id: "c6", name: "Lapis Lazuli Sphere", category: "crystals", emoji: "🌀", price: 22.99, featured: true,
    description: "Deep blue sphere for wisdom, truth, and spiritual growth. Connected to the third eye chakra.",
  },
  // Bracelets
  {
    id: "b1", name: "Amethyst Bracelet", category: "bracelets", emoji: "📿", price: 16.99, featured: true,
    description: "Natural amethyst bead bracelet to bring peace, clarity and spiritual awareness throughout your day.",
  },
  {
    id: "b2", name: "Tiger Eye Bracelet", category: "bracelets", emoji: "🟤", price: 14.99,
    description: "For courage, confidence and grounded protection. Handstrung natural tiger eye beads.",
  },
  {
    id: "b3", name: "Moonstone Bracelet", category: "bracelets", emoji: "🌙", price: 18.99,
    description: "For new beginnings, intuition and inner strength. Captures the gentle energy of the moon.",
  },
  {
    id: "b4", name: "Obsidian Protection Bracelet", category: "bracelets", emoji: "🖤", price: 13.99,
    description: "Black obsidian for powerful energetic shielding and releasing deeply held emotional blocks.",
  },
  // Sound Healing
  {
    id: "s1", name: "Crystal Singing Bowl 7\"", category: "sound-healing", emoji: "🎶", price: 89.99, featured: true,
    description: "Frosted quartz singing bowl tuned to the heart chakra (F note). Includes mallet and ring cushion.",
  },
  {
    id: "s2", name: "Tibetan Singing Bowl Set", category: "sound-healing", emoji: "🎵", price: 124.99,
    description: "Complete handcrafted set with bowl, embroidered cushion and wooden mallet. Perfect for meditation.",
  },
  {
    id: "s3", name: "Koshi Wind Chime", category: "sound-healing", emoji: "🔔", price: 44.99,
    description: "Handcrafted chime tuned to the four elements. Produces rich, long-lasting harmonic tones.",
  },
  // Incense
  {
    id: "i1", name: "Palo Santo Sticks × 6", category: "incense", emoji: "🪵", price: 8.99, featured: true,
    description: "Sustainably sourced holy wood from Peru. Burns with a warm, grounding and uplifting smoke.",
  },
  {
    id: "i2", name: "White Sage Bundle", category: "incense", emoji: "🌿", price: 9.99,
    description: "Traditional hand-tied smudge bundle for energy clearing, purification and setting intention.",
  },
  {
    id: "i3", name: "Nag Champa Incense 40 Sticks", category: "incense", emoji: "🌸", price: 4.99,
    description: "Classic spiritual incense beloved for meditation and relaxation. Gentle, earthy floral fragrance.",
  },
  {
    id: "i4", name: "Sandalwood Incense Sticks", category: "incense", emoji: "🌾", price: 4.99,
    description: "Warm, grounding sandalwood aroma to deepen your meditation practice and calm the mind.",
  },
];

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "crystals", label: "Crystals" },
  { key: "bracelets", label: "Bracelets" },
  { key: "sound-healing", label: "Sound Healing" },
  { key: "incense", label: "Incense" },
] as const;

const CATEGORY_STYLE: Record<string, { bg: string; icon: string }> = {
  crystals:      { bg: "#EDE8F5", icon: "#6B4FA8" },
  bracelets:     { bg: "#FFF8E0", icon: "#C9A84C" },
  "sound-healing": { bg: "#E8F4FF", icon: "#4A7FA0" },
  incense:       { bg: "#E8F5EE", icon: "#4A8A6B" },
};

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: ShopProduct }) {
  const colors = useColors();
  const { addItem, items } = useCart();
  const inCart = items.find((i) => i.id === product.id);
  const style = CATEGORY_STYLE[product.category];

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      emoji: product.emoji,
    });
  };

  return (
    <View style={[pStyles.card, { backgroundColor: "#fff", borderColor: colors.cream }]}>
      {/* Emoji area */}
      <View style={[pStyles.emojiArea, { backgroundColor: style.bg }]}>
        <Text style={pStyles.emoji}>{product.emoji}</Text>
        {product.featured && (
          <View style={[pStyles.featuredBadge, { backgroundColor: colors.deepIndigo }]}>
            <Text style={pStyles.featuredText}>Featured</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={pStyles.info}>
        <Text style={[pStyles.name, { color: colors.charcoal }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[pStyles.price, { color: colors.warmGold }]}>
          £{product.price.toFixed(2)}
        </Text>
      </View>

      {/* Add button */}
      <TouchableOpacity
        style={[
          pStyles.addBtn,
          { backgroundColor: inCart ? "#E8F5E9" : colors.deepIndigo },
        ]}
        onPress={handleAdd}
        activeOpacity={0.85}
      >
        {inCart ? (
          <View style={pStyles.addBtnInner}>
            <Feather name="check" size={12} color="#38a169" />
            <Text style={[pStyles.addBtnText, { color: "#38a169" }]}>
              {inCart.quantity} added
            </Text>
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
  emojiArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 22,
    position: "relative",
  },
  emoji: { fontSize: 42 },
  featuredBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featuredText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  info: { padding: 12, flex: 1 },
  name: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18, marginBottom: 4 },
  price: { fontSize: 15, fontFamily: "Inter_700Bold" },
  addBtn: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  addBtnInner: { flexDirection: "row", alignItems: "center", gap: 5 },
  addBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

// ─── Featured strip ───────────────────────────────────────────────────────────

function FeaturedStrip() {
  const colors = useColors();
  const { addItem, items } = useCart();
  const featured = useMemo(() => PRODUCTS.filter((p) => p.featured), []);

  return (
    <View style={fStyles.container}>
      <Text style={[fStyles.heading, { color: colors.charcoal }]}>✨ Featured</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fStyles.scroll}>
        {featured.map((p) => {
          const inCart = items.find((i) => i.id === p.id);
          const style = CATEGORY_STYLE[p.category];
          return (
            <View key={p.id} style={[fStyles.card, { backgroundColor: "#fff", borderColor: colors.cream }]}>
              <View style={[fStyles.emojiWrap, { backgroundColor: style.bg }]}>
                <Text style={fStyles.emoji}>{p.emoji}</Text>
              </View>
              <View style={fStyles.info}>
                <Text style={[fStyles.name, { color: colors.charcoal }]} numberOfLines={2}>{p.name}</Text>
                <Text style={[fStyles.price, { color: colors.warmGold }]}>£{p.price.toFixed(2)}</Text>
              </View>
              <TouchableOpacity
                style={[fStyles.btn, { backgroundColor: inCart ? "#E8F5E9" : colors.deepIndigo }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  addItem({ id: p.id, name: p.name, price: p.price, category: p.category, emoji: p.emoji });
                }}
                activeOpacity={0.85}
              >
                {inCart ? (
                  <Feather name="check" size={14} color="#38a169" />
                ) : (
                  <Feather name="plus" size={14} color="#fff" />
                )}
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
    width: 160,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  emojiWrap: { alignItems: "center", paddingVertical: 16 },
  emoji: { fontSize: 36 },
  info: { padding: 10 },
  name: { fontSize: 12, fontFamily: "Inter_600SemiBold", lineHeight: 17, marginBottom: 2 },
  price: { fontSize: 13, fontFamily: "Inter_700Bold" },
  btn: { margin: 10, marginTop: 4, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
});

// ─── Main shop screen ─────────────────────────────────────────────────────────

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { totalItems } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? PRODUCTS
        : PRODUCTS.filter((p) => p.category === activeCategory),
    [activeCategory]
  );

  // Pair products into rows of 2 for the grid
  const rows = useMemo(() => {
    const pairs: (ShopProduct | null)[][] = [];
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Featured strip */}
        {activeCategory === "all" && <FeaturedStrip />}

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
                  {
                    backgroundColor: active ? colors.deepIndigo : colors.cream,
                    borderColor: active ? colors.deepIndigo : colors.blush,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCategory(cat.key);
                }}
              >
                <Text
                  style={[
                    styles.catText,
                    { color: active ? "#fff" : colors.sage },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Product grid */}
        <View style={styles.grid}>
          {rows.map((row, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.col}>
                <ProductCard product={row[0]!} />
              </View>
              <View style={styles.col}>
                {row[1] ? <ProductCard product={row[1]} /> : <View style={{ flex: 1 }} />}
              </View>
            </View>
          ))}
        </View>

        {/* Delivery notice */}
        <View style={[styles.deliveryNote, { backgroundColor: colors.cream, borderColor: colors.blush }]}>
          <Feather name="package" size={14} color={colors.deepIndigo} />
          <Text style={[styles.deliveryText, { color: colors.sage }]}>
            UK delivery within 3–5 working days · Free postage on orders over £40
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  catScroll: { marginTop: 16 },
  catContent: { paddingHorizontal: 16, gap: 8 },
  catPill: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
  },
  catText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  grid: { paddingHorizontal: 12, marginTop: 16 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  deliveryNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  deliveryText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
