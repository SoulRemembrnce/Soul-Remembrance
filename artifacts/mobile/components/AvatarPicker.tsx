import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { uploadAvatar } from "@/lib/storage";

interface Props {
  userId: string;
  photoURL?: string | null;
  initials: string;
  avatarColor?: [string, string];
  size?: number;
  role: "client" | "practitioner";
  onPhotoChange: (url: string) => void;
}

export function AvatarPicker({
  userId,
  photoURL,
  initials,
  avatarColor = ["#2D1B69", "#7B5EA7"],
  size = 88,
  role,
  onPhotoChange,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const radius = Math.round(size * 0.3);

  const pickAndUpload = async (source: "camera" | "library") => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === "camera") {
        if (Platform.OS !== "web") {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission needed", "Camera access is required to take a photo.");
            return;
          }
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (result.canceled) return;
      setUploading(true);
      const url = await uploadAvatar(userId, result.assets[0].uri, role);
      onPhotoChange(url);
    } catch {
      Alert.alert("Upload failed", "Could not upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handlePress = () => {
    if (Platform.OS === "web") {
      pickAndUpload("library");
      return;
    }
    Alert.alert("Profile Photo", "Choose a photo", [
      { text: "Take Photo", onPress: () => pickAndUpload("camera") },
      { text: "Choose from Library", onPress: () => pickAndUpload("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <Pressable onPress={handlePress} style={[styles.wrap, { width: size, height: size }]}>
      {photoURL ? (
        <Image
          source={{ uri: photoURL }}
          style={[styles.photo, { width: size, height: size, borderRadius: radius }]}
          contentFit="cover"
        />
      ) : (
        <LinearGradient
          colors={avatarColor}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { width: size, height: size, borderRadius: radius }]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.3 }]}>{initials}</Text>
        </LinearGradient>
      )}

      {uploading ? (
        <View style={[styles.loadingOverlay, { borderRadius: radius }]}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      ) : (
        <View style={[styles.cameraBadge, { borderRadius: 10 }]}>
          <Feather name="camera" size={11} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
  },
  photo: {
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
  },
  gradient: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
  },
  initials: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    backgroundColor: "rgba(45,27,105,0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
});
