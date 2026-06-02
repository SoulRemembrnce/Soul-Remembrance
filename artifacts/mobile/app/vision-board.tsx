import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { useColors } from "@/hooks/useColors";
import {
  addVisionBoardItem,
  deleteVisionBoardItem,
  FSVisionBoardItem,
  subscribeVisionBoardItems,
} from "@/lib/firestore";
import { uploadVisionBoardImage } from "@/lib/storage";

const SCREEN_WIDTH = Dimensions.get("window").width;
const COL_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function VisionBoardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, isAnonymous } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [items, setItems] = useState<FSVisionBoardItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!userId || isAnonymous) return;
    return subscribeVisionBoardItems(userId, setItems);
  }, [userId, isAnonymous]);

  const pickImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo access in settings to add to your vision board.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setPendingUri(result.assets[0].uri);
        setCaption("");
        setShowModal(true);
      }
    } catch {
      Alert.alert("Error", "Could not open photo library. Please try again.");
    }
  }, []);

  const handleSave = async () => {
    if (!pendingUri || !userId) return;
    setUploading(true);
    try {
      const tempId = `${Date.now()}`;
      const imageUrl = await uploadVisionBoardImage(userId, pendingUri, tempId);
      await addVisionBoardItem(userId, { imageUrl, caption: caption.trim() });
      setShowModal(false);
      setPendingUri(null);
      setCaption("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      console.error("[VisionBoard] Save error:", err);
      const code = (err as { code?: string })?.code;
      if (code === "permission-denied") {
        Alert.alert("Permission Denied", "Please update your Firestore security rules in the Firebase Console to allow writes to users/{uid}/visionBoard.");
      } else {
        Alert.alert("Error", "Could not save your photo. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (item: FSVisionBoardItem) => {
    if (!userId) return;
    Alert.alert("Remove from vision board?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => deleteVisionBoardItem(userId, item.id).catch(console.warn),
      },
    ]);
  };

  const leftItems = items.filter((_, i) => i % 2 === 0);
  const rightItems = items.filter((_, i) => i % 2 === 1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>MANIFESTING</Text>
          <Text style={styles.headerTitle}>Vision Board</Text>
          <Text style={styles.headerSub}>
            {items.length} {items.length === 1 ? "intention" : "intentions"} set
          </Text>
        </View>
        {!isAnonymous && (
          <TouchableOpacity style={styles.addBtn} onPress={pickImage} activeOpacity={0.85}>
            <Feather name="camera" size={13} color="#fff" />
            <Text style={styles.addBtnText}>Add photo</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {isAnonymous ? (
        <View style={styles.centreWrap}>
          <Text style={styles.bigEmoji}>🌟</Text>
          <Text style={[styles.centreTitle, { color: colors.charcoal }]}>Sign in to create your board</Text>
          <Text style={[styles.centreBody, { color: colors.sage }]}>
            Your vision board is private and saved to your account. Sign in to start manifesting.
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.deepIndigo }]}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>Sign in to your account</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Affirmation strip */}
          <View style={[styles.affirmation, { backgroundColor: `${colors.purpleMid}10`, borderColor: `${colors.purpleMid}20` }]}>
            <Text style={[styles.affirmationText, { color: colors.purpleMid }]}>
              "I am worthy of everything I am calling in" ✦
            </Text>
          </View>

          {items.length === 0 ? (
            <View style={styles.centreWrap}>
              <Text style={styles.bigEmoji}>🌟</Text>
              <Text style={[styles.centreTitle, { color: colors.charcoal }]}>Create your vision board</Text>
              <Text style={[styles.centreBody, { color: colors.sage }]}>
                Add photos that represent your dreams, goals, and intentions. See them every day and watch them manifest.
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.deepIndigo }]}
                onPress={pickImage}
                activeOpacity={0.85}
              >
                <Feather name="camera" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.emptyBtnText}>Add your first photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.masonryRow}>
              {/* Left column */}
              <View style={styles.masonryCol}>
                {leftItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.photoCard}
                    onLongPress={() => handleDelete(item)}
                    activeOpacity={0.9}
                  >
                    <Image source={{ uri: item.imageUrl }} style={styles.photo} resizeMode="cover" />
                    {item.caption !== "" && (
                      <LinearGradient
                        colors={["transparent", "rgba(45,27,105,0.75)"]}
                        style={styles.captionOverlay}
                      >
                        <Text style={styles.captionText} numberOfLines={2}>{item.caption}</Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                ))}
                {/* Add tile (only in left col) */}
                <TouchableOpacity
                  style={[styles.addTile, { borderColor: colors.blush }]}
                  onPress={pickImage}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={22} color={colors.purpleMid} />
                  <Text style={[styles.addTileText, { color: colors.sage }]}>Add photo</Text>
                </TouchableOpacity>
              </View>

              {/* Right column */}
              <View style={styles.masonryCol}>
                {rightItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.photoCard}
                    onLongPress={() => handleDelete(item)}
                    activeOpacity={0.9}
                  >
                    <Image source={{ uri: item.imageUrl }} style={styles.photo} resizeMode="cover" />
                    {item.caption !== "" && (
                      <LinearGradient
                        colors={["transparent", "rgba(45,27,105,0.75)"]}
                        style={styles.captionOverlay}
                      >
                        <Text style={styles.captionText} numberOfLines={2}>{item.caption}</Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {items.length > 0 && (
            <Text style={[styles.holdHint, { color: colors.sage }]}>Hold a photo to remove it</Text>
          )}
        </ScrollView>
      )}

      {!isAnonymous && items.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.deepIndigo }]}
          onPress={pickImage}
          activeOpacity={0.9}
        >
          <Feather name="camera" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add photo modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { if (!uploading) setShowModal(false); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: colors.softWhite }}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.blush, paddingTop: insets.top + 16 }]}>
            <TouchableOpacity
              onPress={() => { if (!uploading) setShowModal(false); }}
              style={styles.closeBtn}
              disabled={uploading}
            >
              <Feather name="x" size={20} color={colors.sage} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.charcoal }]}>Add to Vision Board</Text>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.deepIndigo, opacity: uploading ? 0.5 : 1 }]}
              onPress={handleSave}
              disabled={uploading}
            >
              <Text style={styles.saveBtnText}>{uploading ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {pendingUri && (
              <Image
                source={{ uri: pendingUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}
            <Text style={[styles.captionLabel, { color: colors.sage }]}>CAPTION (optional)</Text>
            <TextInput
              style={[styles.captionInput, { color: colors.charcoal, borderColor: colors.blush, backgroundColor: colors.card }]}
              placeholder="Add an intention or affirmation…"
              placeholderTextColor={colors.sage}
              value={caption}
              onChangeText={setCaption}
              maxLength={120}
            />
            <Text style={[styles.charCount, { color: colors.blush }]}>{caption.length}/120</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  headerLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 4 },
  headerTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 4,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  centreWrap: { alignItems: "center", paddingTop: 48, paddingHorizontal: 20 },
  bigEmoji: { fontSize: 64, marginBottom: 20 },
  centreTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 10 },
  centreBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, maxWidth: 300 },
  emptyBtn: { marginTop: 28, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14, flexDirection: "row", alignItems: "center" },
  emptyBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  affirmation: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  affirmationText: { fontSize: 13, fontFamily: "Inter_500Medium", fontStyle: "italic", textAlign: "center" },
  masonryRow: { flexDirection: "row", gap: 10 },
  masonryCol: { flex: 1, gap: 10 },
  photoCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#EEE",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  photo: { width: COL_WIDTH, height: COL_WIDTH * 1.25 },
  captionOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 24,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  captionText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold", lineHeight: 15 },
  addTile: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addTileText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  holdHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 16 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  modalTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  saveBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  previewImage: { width: "100%", height: 260, borderRadius: 20, marginBottom: 20 },
  captionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 8 },
  captionInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 6 },
});
