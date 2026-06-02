import React from "react";
import { Image, StyleSheet } from "react-native";

interface LotusIconProps {
  size?: number;
  style?: object;
}

export function LotusIcon({ size = 28, style }: LotusIconProps) {
  return (
    <Image
      source={require("../assets/images/icon.png")}
      style={[{ width: size, height: size, borderRadius: size * 0.22 }, styles.img, style]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  img: {
    opacity: 0.95,
  },
});
