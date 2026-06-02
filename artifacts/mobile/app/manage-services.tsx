import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import {
  FSService,
  FSWaitlistEntry,
  addService,
  deleteService,
  subscribeServices,
  subscribeWaitlistByService,
  updateService,
} from "@/lib/firestore";

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "75 min", value: 75 },
  { label: "90 min", value: 90 },
  { label: "2 hours", value: 120 },
];

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes === 60) return "1 hour";
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

type ServiceFormData = {
  name: string;
  description: string;
  durationMinutes: number;
  price: string;
  online: boolean;
  isRetreat: boolean;
  capacity: string;
};

const EMPTY_FORM: ServiceFormData = {
  name: "",
  description: "",
  durationMinutes: 60,
  price: "",
  online: true,
  isRetreat: false,
  capacity: "",
};

export default function ManageServicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { numericId, practitionerName } = useLocalSearchParams<{
    numericId: string;
    practitionerName: string;
  }>();

  const numId = Number(numericId);
  const [services, setServices] = useState<FSService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!numId) return;
    setLoading(true);
    return subscribeServices(numId, (svcs) => {
      setServices(svcs);
      setLoading(false);
    });
  }, [numId]);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [modal, setModal] = useState<{
    visible: boolean;
    editing: FSService | null;
    form: ServiceFormData;
    saving: boolean;
  }>({ visible: false, editing: null, form: EMPTY_FORM, saving: false });

  const nameRef = useRef<TextInput>(null);
  const [waitlistEntries, setWaitlistEntries] = useState<FSWaitlistEntry[]>([]);

  useEffect(() => {
    if (!modal.visible || !modal.editing?.isRetreat || !modal.editing?.id) {
      setWaitlistEntries([]);
      return;
    }
    return subscribeWaitlistByService(modal.editing.id, setWaitlistEntries);
  }, [modal.visible, modal.editing?.id, modal.editing?.isRetreat]);

  function openAdd() {
    setModal({ visible: true, editing: null, form: EMPTY_FORM, saving: false });
    setTimeout(() => nameRef.current?.focus(), 120);
  }

  function openEdit(svc: FSService) {
    setModal({
      visible: true,
      editing: svc,
      form: {
        name: svc.name,
        description: svc.description,
        durationMinutes: svc.durationMinutes,
        price: String(svc.price),
        online: svc.online,
        isRetreat: svc.isRetreat ?? false,
      capacity: svc.capacity != null ? String(svc.capacity) : "",
      },
      saving: false,
    });
    setTimeout(() => nameRef.current?.focus(), 120);
  }

  function closeModal() {
    setModal((m) => ({ ...m, visible: false }));
  }

  function updateForm(patch: Partial<ServiceFormData>) {
    setModal((m) => ({ ...m, form: { ...m.form, ...patch } }));
  }

  async function handleSave() {
    const { form, editing } = modal;
    const parsedPrice = parseFloat(form.price);
    if (!form.name.trim()) {
      Alert.alert("Name required", "Please enter a service name.");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert("Invalid price", "Please enter a valid price.");
      return;
    }
    const parsedCapacity = form.isRetreat && form.capacity.trim()
      ? parseInt(form.capacity.trim(), 10) : undefined;
    if (parsedCapacity !== undefined && (isNaN(parsedCapacity) || parsedCapacity < 1)) {
      Alert.alert("Invalid capacity", "Please enter a valid number of spots (e.g. 20).");
      return;
    }
    setModal((m) => ({ ...m, saving: true }));
    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      durationMinutes: form.durationMinutes,
      price: parsedPrice,
      online: form.online,
      isRetreat: form.isRetreat,
      ...(parsedCapacity ? { capacity: parsedCapacity } : {}),
    };
    try {
      if (editing) {
        await updateService(editing.id, data);
      } else {
        await addService(numId, data);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
    } catch {
      setModal((m) => ({ ...m, saving: false }));
      Alert.alert("Error", "Could not save service. Please try again.");
    }
  }

  function handleDelete(svc: FSService) {
    Alert.alert(
      "Delete service?",
      `Remove "${svc.name}" from your offerings? Existing bookings won't be affected.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteService(svc.id).catch(console.warn);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.headerTitle}>Manage Services</Text>
          {practitionerName ? (
            <Text style={styles.headerSub}>{practitionerName}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={openAdd}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
        {loading ? (
          <ActivityIndicator color={colors.deepIndigo} style={{ marginTop: 40 }} />
        ) : services.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.blush }]}>
            <Feather name="briefcase" size={36} color={colors.blush} />
            <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>
              No services yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.sage }]}>
              Add the sessions you offer — clients will choose from these when booking.
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: colors.deepIndigo }]}
              onPress={openAdd}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.emptyAddBtnText}>Add your first service</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.listHint, { color: colors.sage }]}>
              {services.length} service{services.length !== 1 ? "s" : ""} · tap to edit, hold to delete
            </Text>
            {services.map((svc) => (
              <TouchableOpacity
                key={svc.id}
                style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.blush }]}
                onPress={() => openEdit(svc)}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  handleDelete(svc);
                }}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceName, { color: colors.charcoal }]}>{svc.name}</Text>
                  {svc.description ? (
                    <Text style={[styles.serviceDesc, { color: colors.sage }]} numberOfLines={2}>
                      {svc.description}
                    </Text>
                  ) : null}
                  <View style={styles.serviceTagRow}>
                    <View style={[styles.serviceTag, { backgroundColor: `${colors.deepIndigo}14` }]}>
                      <Feather name="clock" size={10} color={colors.deepIndigo} />
                      <Text style={[styles.serviceTagText, { color: colors.deepIndigo }]}>
                        {durationLabel(svc.durationMinutes)}
                      </Text>
                    </View>
                    <View style={[styles.serviceTag, { backgroundColor: svc.online ? `${colors.deepIndigo}14` : `${colors.warmGold}18` }]}>
                      <Feather
                        name={svc.online ? "video" : "map-pin"}
                        size={10}
                        color={svc.online ? colors.deepIndigo : colors.warmGold}
                      />
                      <Text style={[styles.serviceTagText, { color: svc.online ? colors.deepIndigo : colors.warmGold }]}>
                        {svc.online ? "Online" : "In-person"}
                      </Text>
                    </View>
                    {svc.isRetreat && (
                      <View style={[styles.serviceTag, { backgroundColor: `${colors.warmGold}18` }]}>
                        <Feather name="users" size={10} color={colors.warmGold} />
                        <Text style={[styles.serviceTagText, { color: colors.warmGold }]}>Retreat</Text>
                      </View>
                    )}
                    {svc.isRetreat && svc.capacity != null && (
                      <View style={[styles.serviceTag, { backgroundColor: `${colors.deepIndigo}12` }]}>
                        <Feather name="users" size={10} color={colors.deepIndigo} />
                        <Text style={[styles.serviceTagText, { color: colors.deepIndigo }]}>
                          {svc.bookedCount ?? 0}/{svc.capacity} spots
                        </Text>
                      </View>
                    )}
                    {svc.isRetreat && (svc.waitlistCount ?? 0) > 0 && (
                      <View style={[styles.serviceTag, { backgroundColor: "#E53E3E14" }]}>
                        <Feather name="clock" size={10} color="#C53030" />
                        <Text style={[styles.serviceTagText, { color: "#C53030" }]}>
                          {svc.waitlistCount} waitlisted
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.servicePriceCol}>
                  <Text style={[styles.servicePrice, { color: colors.deepIndigo }]}>
                    £{svc.price % 1 === 0 ? svc.price : svc.price.toFixed(2)}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(svc)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={14} color="#E53E3E" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal
        visible={modal.visible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
        onShow={() => setTimeout(() => nameRef.current?.focus(), 100)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modal.editing ? "Edit service" : "Add service"}
              </Text>
              <TouchableOpacity onPress={closeModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={20} color="#7B5EA7" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Service name *</Text>
              <TextInput
                ref={nameRef}
                style={styles.textInput}
                value={modal.form.name}
                onChangeText={(t) => updateForm({ name: t })}
                placeholder="e.g. Reiki healing"
                placeholderTextColor="#B0A8C8"
                returnKeyType="next"
              />

              <Text style={styles.fieldLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={modal.form.description}
                onChangeText={(t) => updateForm({ description: t })}
                placeholder="Brief overview of what's included…"
                placeholderTextColor="#B0A8C8"
                multiline
                numberOfLines={3}
                returnKeyType="done"
              />

              <Text style={styles.fieldLabel}>Duration</Text>
              <View style={styles.durationRow}>
                {DURATIONS.map((d) => {
                  const active = modal.form.durationMinutes === d.value;
                  return (
                    <TouchableOpacity
                      key={d.value}
                      style={[
                        styles.durationChip,
                        active
                          ? { backgroundColor: "#2D1B69", borderColor: "#2D1B69" }
                          : { backgroundColor: "#FAF5FF", borderColor: "#DDD0F0" },
                      ]}
                      onPress={() => {
                        updateForm({ durationMinutes: d.value });
                        Haptics.selectionAsync();
                      }}
                    >
                      <Text style={[styles.durationChipText, { color: active ? "#fff" : "#2D1B69" }]}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Price (£) *</Text>
              <TextInput
                style={styles.textInput}
                value={modal.form.price}
                onChangeText={(t) => updateForm({ price: t.replace(/[^0-9.]/g, "") })}
                placeholder="e.g. 60"
                placeholderTextColor="#B0A8C8"
                keyboardType="decimal-pad"
                returnKeyType="done"
              />

              <Text style={styles.fieldLabel}>Format</Text>
              <View style={styles.formatToggle}>
                {[
                  { label: "Online", value: true, icon: "video" as const },
                  { label: "In-person", value: false, icon: "map-pin" as const },
                ].map((opt) => {
                  const active = modal.form.online === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      style={[
                        styles.formatOption,
                        active
                          ? { backgroundColor: "#2D1B69", borderColor: "#2D1B69" }
                          : { backgroundColor: "#FAF5FF", borderColor: "#DDD0F0" },
                      ]}
                      onPress={() => {
                        updateForm({ online: opt.value });
                        Haptics.selectionAsync();
                      }}
                    >
                      <Feather name={opt.icon} size={14} color={active ? "#fff" : "#7B5EA7"} />
                      <Text style={[styles.formatOptionText, { color: active ? "#fff" : "#7B5EA7" }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Type</Text>
              <TouchableOpacity
                style={[
                  styles.retreatToggle,
                  modal.form.isRetreat
                    ? { backgroundColor: "#C9A84C18", borderColor: "#C9A84C" }
                    : { backgroundColor: "#FAF5FF", borderColor: "#DDD0F0" },
                ]}
                onPress={() => {
                  updateForm({ isRetreat: !modal.form.isRetreat });
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.8}
              >
                <Feather name="users" size={15} color={modal.form.isRetreat ? "#C9A84C" : "#B0A8C8"} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.retreatToggleTitle, { color: modal.form.isRetreat ? "#C9A84C" : "#7B5EA7" }]}>
                    Retreat / Group Session
                  </Text>
                  <Text style={styles.retreatToggleSub}>
                    Creates a shared group chat for everyone who books
                  </Text>
                </View>
                <View style={[styles.retreatCheck, { backgroundColor: modal.form.isRetreat ? "#C9A84C" : "#DDD0F0" }]}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              </TouchableOpacity>

              {modal.form.isRetreat && (
                <>
                  <Text style={styles.fieldLabel}>Max Attendees (optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={modal.form.capacity}
                    onChangeText={(t) => updateForm({ capacity: t.replace(/[^0-9]/g, "") })}
                    placeholder="e.g. 20  —  leave blank for unlimited"
                    placeholderTextColor="#B0A8C8"
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, { opacity: modal.saving ? 0.6 : 1 }]}
                onPress={handleSave}
                disabled={modal.saving}
                activeOpacity={0.85}
              >
                {modal.saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {modal.editing ? "Save changes" : "Add service"}
                  </Text>
                )}
              </TouchableOpacity>
              {modal.editing?.isRetreat && waitlistEntries.length > 0 && (
                <View style={styles.waitlistSection}>
                  <View style={styles.waitlistSectionHeader}>
                    <Feather name="clock" size={13} color="#C9A84C" />
                    <Text style={styles.waitlistSectionTitle}>
                      Waitlist ({waitlistEntries.length})
                    </Text>
                  </View>
                  {waitlistEntries.map((entry) => (
                    <View key={entry.id} style={styles.waitlistRow}>
                      <View style={styles.waitlistAvatar}>
                        <Text style={styles.waitlistInitials}>{entry.userInitials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.waitlistName}>{entry.userName}</Text>
                        <Text style={styles.waitlistEmail}>{entry.userEmail}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyAddBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  listHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  serviceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  serviceName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
    lineHeight: 18,
  },
  serviceTagRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  serviceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  serviceTagText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  servicePriceCol: {
    alignItems: "flex-end",
    gap: 10,
  },
  servicePrice: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  deleteBtn: {
    padding: 4,
  },
  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30,15,60,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#2D1B69",
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#7B5EA7",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#DDD0F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#2D1B69",
    marginBottom: 18,
    backgroundColor: "#FAF5FF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  durationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  durationChip: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  durationChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  formatToggle: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  formatOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
  },
  formatOptionText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  retreatToggle: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 20,
  },
  retreatToggleTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  retreatToggleSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#B0A8C8",
    marginTop: 2,
  },
  retreatCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    backgroundColor: "#2D1B69",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  waitlistSection: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD0F0",
    overflow: "hidden",
  },
  waitlistSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 11,
    backgroundColor: "#C9A84C10",
  },
  waitlistSectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#C9A84C",
  },
  waitlistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderTopWidth: 1,
    borderTopColor: "#DDD0F0",
  },
  waitlistAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DDD0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  waitlistInitials: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#2D1B69",
  },
  waitlistName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#2C2C2C",
  },
  waitlistEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#8A7050",
    marginTop: 1,
  },
});
