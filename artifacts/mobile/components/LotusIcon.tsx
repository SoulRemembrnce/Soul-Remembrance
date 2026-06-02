import React from "react";
import { Image, StyleSheet } from "react-native";

interface LotusIconProps {
  size?: number;
  style?: object;
}

export function LotusIcon({ size = 28, style }: LotusIconProps) {
  return (
    <Image
      source={require("../assets/images/adaptive-icon.png")}
      style={[{ width: size, height: size }, styles.img, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  img: {
    opacity: 0.92,
  },
});
