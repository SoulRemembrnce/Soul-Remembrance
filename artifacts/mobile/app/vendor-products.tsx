import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  FSVendorProduct,
  FSVendorProfile,
  createVendorProduct,
  deleteVendorProduct,
  isProductFeaturedActive,
  subscribeVendorProducts,
  subscribeVendorProfile,
  updateVendorProduct,
} from "@/lib/firestore";

const CATEGORIES = [
  { id: "crystals", label: "Crystals", emoji: "💎" },
  { id: "bracelets", label: "Bracelets", emoji: "📿" },
  { id: "sound-healing", label: "Sound Healing", emoji: "🎵" },
  { id: "incense", label: "Incense", emoji: "🕯️" },
  { id: "books", label: "Books / Cards", emoji: "📚" },
  { id: "clothing", label: "Clothing", emoji: "👕" },
  { id: "art", label: "Art / Decor", emoji: "🎨" },
  { id: "other", label: "Other", emoji: "✨" },
];

const EMOJI_SUGGESTIONS = ["💎", "📿", "🎵", "🕯️", "📚", "👕", "🎨", "✨", "🌙", "⭐", "🔮", "🌿", "🧘", "💜", "🌸", "🪬", "🌊", "🦋"];

interface ProductForm {
  name: string;
  description: string;
  price: string;
  category: string;
  emoji: string;
  inStock: boolean;
}

const BLANK_FORM: ProductForm = {
  name: "",
  description: "",
  price: "",
  category: "other",
  emoji: "✨",
  inStock: true,
};

export default function VendorProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();

  const [vendorProfile, setVendorProfile] = useState<FSVendorProfile | null>(null);
  const [products, setProducts] = useState<FSVendorProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FSVendorProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const unsubProfile = subscribeVendorProfile(userId, (p) => {
      setVendorProfile(p);
      setLoading(false);
    });
    const unsubProducts = subscribeVendorProducts(userId, setProducts);
    return () => { unsubProfile(); unsubProducts(); };
  }, [userId]);

  const openAdd = useCallback(() => {
    setEditingProduct(null);
    setForm(BLANK_FORM);
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((product: FSVendorProduct) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: product.category,
      emoji: product.emoji,
      inStock: product.inStock,
    });
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!userId || !vendorProfile) return;
    const trimName = form.name.trim();
    const trimDesc = form.description.trim();
    const priceNum = parseFloat(form.price);

    if (!trimName) { Alert.alert("Missing field", "Please enter a product name."); return; }
    if (isNaN(priceNum) || priceNum <= 0) { Alert.alert("Invalid price", "Please enter a valid price."); return; }

    setSaving(true);
    try {
      if (editingProduct) {
        await updateVendorProduct(editingProduct.id, {
          name: trimName,
          description: trimDesc,
          price: priceNum,
          category: form.category,
          emoji: form.emoji,
          inStock: form.inStock,
        });
      } else {
        await createVendorProduct({
          vendorId: userId,
          vendorName: vendorProfile.businessName,
          name: trimName,
          description: trimDesc,
          price: priceNum,
          category: form.category,
          emoji: form.emoji,
          inStock: form.inStock,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
    } catch {
      Alert.alert("Error", "Could not save product. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [userId, vendorProfile, form, editingProduct]);

  const handleDelete = useCallback((product: FSVendorProduct) => {
    Alert.alert(
      "Delete Product",
      `Remove "${product.name}" from your shop?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVendorProduct(product.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {
              Alert.alert("Error", "Could not delete product.");
            }
          },
        },
      ]
    );
  }, []);

  const handleToggleStock = useCallback(async (product: FSVendorProduct) => {
    try {
      await updateVendorProduct(product.id, { inStock: !product.inStock });
    } catch {
      Alert.alert("Error", "Could not update stock status.");
    }
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: insets.top + 12,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.warmGold}20`,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.charcoal },
    headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.sage },
    addBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.warmGold,
      alignItems: "center",
      justifyContent: "center",
    },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
    emptyEmoji: { fontSize: 52, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.charcoal, textAlign: "center", marginBottom: 8 },
    emptyBody: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.sage, textAlign: "center", lineHeight: 20 },
    emptyBtn: {
      marginTop: 20,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.warmGold,
    },
    emptyBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
    list: { padding: 16, gap: 12 },
    productCard: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.warmGold}20`,
    },
    productTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
    productEmoji: { fontSize: 32 },
    productInfo: { flex: 1 },
    productName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.charcoal, marginBottom: 2 },
    productDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.sage, lineHeight: 18 },
    productBottom: { flexDirection: "row", alignItems: "center", gap: 10 },
    productPrice: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.deepIndigo, flex: 1 },
    categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: `${colors.deepIndigo}12` },
    categoryBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.deepIndigo },
    stockRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
    stockLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
    actionRow: { flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: `${colors.blush}` },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
    actionBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
    modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.background, maxHeight: "92%" },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.warmGold}20`,
    },
    modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.charcoal },
    modalContent: { padding: 20 },
    fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.charcoal, marginBottom: 7, letterSpacing: 0.4 },
    fieldInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      backgroundColor: colors.card,
      marginBottom: 16,
    },
    fieldTextArea: { height: 80, textAlignVertical: "top" },
    emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    emojiBtn: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
    emojiBtnText: { fontSize: 20 },
    catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5 },
    catChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    switchLabel: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.charcoal },
    saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginBottom: insets.bottom + 16 },
    saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  }), [colors, insets]);

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.warmGold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={colors.charcoal} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>My Products</Text>
            {vendorProfile && (
              <Text style={styles.headerSub}>{vendorProfile.businessName} · {products.length} product{products.length !== 1 ? "s" : ""}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {products.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏪</Text>
          <Text style={styles.emptyTitle}>No products yet</Text>
          <Text style={styles.emptyBody}>
            Add your first product and it will appear in the Soul Shop for customers to purchase.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openAdd} activeOpacity={0.85}>
            <Text style={styles.emptyBtnText}>+ Add First Product</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productTop}>
                <Text style={styles.productEmoji}>{product.emoji}</Text>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {!!product.description && (
                    <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
                  )}
                </View>
              </View>

              <View style={styles.productBottom}>
                <Text style={styles.productPrice}>£{product.price.toFixed(2)}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {CATEGORIES.find((c) => c.id === product.category)?.label ?? product.category}
                  </Text>
                </View>
                {isProductFeaturedActive(product) && (
                  <View style={[styles.categoryBadge, { backgroundColor: `${colors.warmGold}20` }]}>
                    <Text style={[styles.categoryBadgeText, { color: colors.warmGold }]}>⭐ Featured</Text>
                  </View>
                )}
              </View>

              <View style={styles.stockRow}>
                <Feather
                  name={product.inStock ? "check-circle" : "x-circle"}
                  size={14}
                  color={product.inStock ? "#38a169" : "#E53E3E"}
                />
                <Text style={[styles.stockLabel, { color: product.inStock ? "#38a169" : "#E53E3E" }]}>
                  {product.inStock ? "In stock" : "Out of stock"}
                </Text>
                <Switch
                  value={product.inStock}
                  onValueChange={() => handleToggleStock(product)}
                  trackColor={{ false: "#E2E8F0", true: `${colors.deepIndigo}40` }}
                  thumbColor={product.inStock ? colors.deepIndigo : "#CBD5E0"}
                />
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: `${colors.deepIndigo}30`, backgroundColor: `${colors.deepIndigo}06` }]}
                  onPress={() => openEdit(product)}
                  activeOpacity={0.8}
                >
                  <Feather name="edit-2" size={14} color={colors.deepIndigo} />
                  <Text style={[styles.actionBtnText, { color: colors.deepIndigo }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: "#FCA5A5", backgroundColor: "#FFF5F5" }]}
                  onPress={() => handleDelete(product)}
                  activeOpacity={0.8}
                >
                  <Feather name="trash-2" size={14} color="#E53E3E" />
                  <Text style={[styles.actionBtnText, { color: "#E53E3E" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? "Edit Product" : "New Product"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <Feather name="x" size={22} color={colors.charcoal} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>EMOJI</Text>
              <View style={styles.emojiRow}>
                {EMOJI_SUGGESTIONS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[
                      styles.emojiBtn,
                      { borderColor: form.emoji === e ? colors.deepIndigo : `${colors.warmGold}25`, backgroundColor: form.emoji === e ? `${colors.deepIndigo}12` : colors.card }
                    ]}
                    onPress={() => { Haptics.selectionAsync(); setForm((f) => ({ ...f, emoji: e })); }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.emojiBtnText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>PRODUCT NAME *</Text>
              <TextInput
                style={[styles.fieldInput, { borderColor: `${colors.warmGold}30`, color: colors.charcoal }]}
                placeholder="e.g. Rose Quartz Tower"
                placeholderTextColor={colors.sage}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                returnKeyType="next"
              />

              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldTextArea, { borderColor: `${colors.warmGold}30`, color: colors.charcoal }]}
                placeholder="Describe this product…"
                placeholderTextColor={colors.sage}
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                multiline
                maxLength={300}
              />

              <Text style={styles.fieldLabel}>PRICE (£) *</Text>
              <TextInput
                style={[styles.fieldInput, { borderColor: `${colors.warmGold}30`, color: colors.charcoal }]}
                placeholder="e.g. 14.99"
                placeholderTextColor={colors.sage}
                value={form.price}
                onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />

              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <View style={styles.catRow}>
                {CATEGORIES.map((cat) => {
                  const selected = form.category === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catChip,
                        { borderColor: selected ? colors.deepIndigo : `${colors.warmGold}25`, backgroundColor: selected ? `${colors.deepIndigo}12` : colors.card }
                      ]}
                      onPress={() => { Haptics.selectionAsync(); setForm((f) => ({ ...f, category: cat.id })); }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.catChipText, { color: selected ? colors.deepIndigo : colors.charcoal }]}>
                        {cat.emoji} {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>In stock</Text>
                <Switch
                  value={form.inStock}
                  onValueChange={(v) => setForm((f) => ({ ...f, inStock: v }))}
                  trackColor={{ false: "#E2E8F0", true: `${colors.deepIndigo}40` }}
                  thumbColor={form.inStock ? colors.deepIndigo : "#CBD5E0"}
                />
              </View>

              {editingProduct && isProductFeaturedActive(editingProduct) && (
                <View style={[styles.switchRow, { backgroundColor: `${colors.warmGold}15`, borderRadius: 8, paddingHorizontal: 12 }]}>
                  <Text style={[styles.switchLabel, { color: colors.warmGold, fontFamily: "Inter_600SemiBold" }]}>⭐ Featured until {new Date(editingProduct.featuredUntil!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: saving ? `${colors.deepIndigo}60` : colors.deepIndigo }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingProduct ? "Save Changes" : "Add Product"}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
