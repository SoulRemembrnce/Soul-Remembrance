import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { usePaymentSheet } from "@/hooks/usePaymentSheet";
import {
  FSVerificationApplication,
  createVerificationApplication,
  subscribeVerificationApplicationByUid,
} from "@/lib/firestore";
import { uploadVerificationDoc } from "@/lib/storage";

export default function VerificationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [verificationApp, setVerificationApp] = useState<FSVerificationApplication | null | "loading">("loading");
  const [certificates, setCertificates] = useState<string[]>([]);
  const [insurance, setInsurance] = useState("");
  const [dbs, setDbs] = useState("");
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    return subscribeVerificationApplicationByUid(userId, (app) => {
      setVerificationApp(app);
    });
  }, [userId]);

  const canSubmit = certificates.length > 0 && insurance.length > 0 && dbs.length > 0;

  const pickImage = async (type: "certificate" | "insurance" | "dbs") => {
    if (!userId) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: type === "certificate",
    });

    if (result.canceled) return;
    setUploadingType(type);

    try {
      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        const url = await uploadVerificationDoc(
          userId,
          asset.uri,
          type,
          type === "certificate" ? certificates.length + i : 0
        );
        if (type === "certificate") {
          setCertificates((prev) => [...prev, url]);
        } else if (type === "insurance") {
          setInsurance(url);
        } else {
          setDbs(url);
        }
      }
    } catch {
      Alert.alert("Upload failed", "Could not upload document. Please try again.");
    } finally {
      setUploadingType(null);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !userId) return;
    setSubmitError(null);
    setSubmitLoading(true);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
      const resp = await fetch(`${apiUrl}/api/payments/create-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 299,
          currency: "gbp",
          description: "Soul Remembrance · Practitioner Verification Fee",
        }),
      });
      if (!resp.ok) throw new Error("Failed to create payment");
      const { clientSecret } = await resp.json();

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

      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        if (payError.code === "Canceled") { setSubmitLoading(false); return; }
        throw new Error(payError.message);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const paymentIntentId = clientSecret.split("_secret_")[0] ?? clientSecret;
      await createVerificationApplication({
        practitionerUid: userId,
        status: "pending",
        documents: { certificates, insurance, dbs },
        paymentIntentId,
      });
    } catch (err: any) {
      setSubmitError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const Header = ({ title }: { title: string }) => (
    <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.deepIndigo }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
        <Feather name="arrow-left" size={22} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  if (verificationApp === "loading") {
    return (
      <View style={[styles.root, { backgroundColor: colors.softWhite }]}>
        <Header title="Verification" />
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.deepIndigo} size="large" />
      </View>
    );
  }

  if (verificationApp?.status === "pending") {
    return (
      <View style={[styles.root, { backgroundColor: colors.softWhite }]}>
        <Header title="Verification" />
        <View style={styles.statusWrap}>
          <View style={[styles.statusIcon, { backgroundColor: `${colors.warmGold}22` }]}>
            <Feather name="clock" size={38} color={colors.warmGold} />
          </View>
          <Text style={[styles.statusTitle, { color: colors.charcoal }]}>Under Review</Text>
          <Text style={[styles.statusBody, { color: colors.sage }]}>
            Your verification documents have been received. Soul Remembrance will review them and respond within 2–5 working days.
          </Text>
          <Text style={[styles.statusDate, { color: colors.sage }]}>
            Submitted{" "}
            {new Date(verificationApp.submittedAt).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </Text>
        </View>
      </View>
    );
  }

  if (verificationApp?.status === "approved") {
    return (
      <View style={[styles.root, { backgroundColor: colors.softWhite }]}>
        <Header title="Verification" />
        <View style={styles.statusWrap}>
          <View style={[styles.statusIcon, { backgroundColor: "#E8F5E9" }]}>
            <Feather name="check-circle" size={38} color="#38a169" />
          </View>
          <Text style={[styles.statusTitle, { color: colors.charcoal }]}>Verified!</Text>
          <Text style={[styles.statusBody, { color: colors.sage }]}>
            Your profile is verified and appears at the top of search listings. A verified badge is shown on your profile.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.softWhite }]}>
      <Header title={verificationApp?.status === "rejected" ? "Reapply for Verification" : "Get Verified"} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {verificationApp?.status === "rejected" && (
          <View style={[styles.rejectionBox, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
            <Feather name="alert-circle" size={15} color="#E53E3E" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rejectionTitle, { color: "#B91C1C" }]}>Previous application not approved</Text>
              {verificationApp.rejectionNote ? (
                <Text style={[styles.rejectionNote, { color: "#7F1D1D" }]}>{verificationApp.rejectionNote}</Text>
              ) : null}
            </View>
          </View>
        )}

        <View style={[styles.infoBanner, { backgroundColor: colors.blush, borderColor: `${colors.deepIndigo}30` }]}>
          <Feather name="shield" size={20} color={colors.deepIndigo} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: colors.deepIndigo }]}>Verification makes a difference</Text>
            <Text style={[styles.infoBannerSub, { color: colors.purpleMid }]}>
              Verified practitioners appear first in all search results and carry a trust badge on their profile.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.charcoal }]}>Required Documents</Text>
        <Text style={[styles.sectionSub, { color: colors.sage }]}>
          Upload clear photos or scans of each document below.
        </Text>

        <DocSection
          label="Training Certificates"
          desc="Qualifications relevant to your practice (up to 5)"
          icon="award"
          images={certificates}
          onAdd={() => pickImage("certificate")}
          onRemove={(i) => setCertificates((prev) => prev.filter((_, idx) => idx !== i))}
          uploading={uploadingType === "certificate"}
          maxImages={5}
          colors={colors}
        />

        <DocSection
          label="Professional Indemnity Insurance"
          desc="Your current insurance certificate"
          icon="umbrella"
          images={insurance ? [insurance] : []}
          onAdd={() => pickImage("insurance")}
          onRemove={() => setInsurance("")}
          uploading={uploadingType === "insurance"}
          maxImages={1}
          colors={colors}
        />

        <DocSection
          label="DBS Certificate"
          desc="Disclosure and Barring Service check"
          icon="user-check"
          images={dbs ? [dbs] : []}
          onAdd={() => pickImage("dbs")}
          onRemove={() => setDbs("")}
          uploading={uploadingType === "dbs"}
          maxImages={1}
          colors={colors}
        />

        <View style={[styles.payCard, { backgroundColor: "#fff", borderColor: colors.cream }]}>
          <View style={styles.payRow}>
            <View>
              <Text style={[styles.payLabel, { color: colors.sage }]}>One-time verification fee</Text>
              <Text style={[styles.payAmount, { color: colors.charcoal }]}>£2.99</Text>
            </View>
            <View style={[styles.payBadge, { backgroundColor: colors.blush }]}>
              <Feather name="lock" size={14} color={colors.deepIndigo} />
              <Text style={[styles.payBadgeText, { color: colors.deepIndigo }]}>Secure</Text>
            </View>
          </View>
          <Text style={[styles.payNote, { color: colors.sage }]}>
            Paid via Stripe. Non-refundable once documents have been reviewed.
          </Text>
        </View>

        {submitError ? (
          <Text style={[styles.errorText, { color: "#E53E3E" }]}>{submitError}</Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: canSubmit ? colors.deepIndigo : colors.blush },
          ]}
          disabled={!canSubmit || submitLoading || uploadingType !== null}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          {submitLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="shield" size={16} color={canSubmit ? "#fff" : colors.sage} />
              <Text style={[styles.submitBtnText, { color: canSubmit ? "#fff" : colors.sage }]}>
                Pay £2.99 & Submit Application
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function DocSection({
  label, desc, icon, images, onAdd, onRemove, uploading, maxImages, colors,
}: {
  label: string;
  desc: string;
  icon: string;
  images: string[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  uploading: boolean;
  maxImages: number;
  colors: ReturnType<typeof useColors>;
}) {
  const complete = images.length > 0;
  const canAdd = images.length < maxImages;

  return (
    <View style={[styles.docCard, { backgroundColor: "#fff", borderColor: colors.cream }]}>
      <View style={styles.docHeader}>
        <View style={[styles.docIconBadge, { backgroundColor: colors.blush }]}>
          <Feather name={icon as any} size={16} color={colors.deepIndigo} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.docLabel, { color: colors.charcoal }]}>{label}</Text>
          <Text style={[styles.docDesc, { color: colors.sage }]}>{desc}</Text>
        </View>
        {complete && <Feather name="check-circle" size={16} color="#38a169" />}
      </View>

      {images.length > 0 && (
        <View style={styles.docThumbRow}>
          {images.map((uri, i) => (
            <View key={i} style={styles.docThumbWrap}>
              <Image source={{ uri }} style={styles.docThumb} contentFit="cover" />
              <TouchableOpacity style={styles.docRemoveBtn} onPress={() => onRemove(i)}>
                <Feather name="x" size={9} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {canAdd && (
        <TouchableOpacity
          style={[styles.addBtn, { borderColor: colors.deepIndigo }]}
          onPress={onAdd}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.deepIndigo} />
          ) : (
            <>
              <Feather name="upload" size={14} color={colors.deepIndigo} />
              <Text style={[styles.addBtnText, { color: colors.deepIndigo }]}>
                {images.length > 0 ? "Add another" : "Upload photo"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff" },

  statusWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, gap: 14,
  },
  statusIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  statusTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  statusBody: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  statusDate: { fontSize: 13, fontFamily: "Inter_400Regular" },

  body: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },

  rejectionBox: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    borderWidth: 1, borderRadius: 10, padding: 14,
  },
  rejectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  rejectionNote: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  infoBanner: {
    flexDirection: "row", gap: 12, alignItems: "flex-start",
    borderWidth: 1, borderRadius: 12, padding: 14,
  },
  infoBannerTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  infoBannerSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6 },

  docCard: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 12 },
  docHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  docIconBadge: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  docLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  docDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  docThumbRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  docThumbWrap: { position: "relative" },
  docThumb: { width: 72, height: 72, borderRadius: 8 },
  docRemoveBtn: {
    position: "absolute", top: -5, right: -5,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#E53E3E",
    alignItems: "center", justifyContent: "center",
  },

  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderWidth: 1, borderStyle: "dashed", borderRadius: 8,
    paddingVertical: 10,
  },
  addBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  payCard: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  payRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  payLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  payAmount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  payBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  payBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  payNote: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 12, paddingVertical: 15,
  },
  submitBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
