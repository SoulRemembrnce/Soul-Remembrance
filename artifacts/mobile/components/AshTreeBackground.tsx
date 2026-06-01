import React from "react";
import { Image, StyleSheet } from "react-native";

export function AshTreeBackground() {
  return (
    <Image
      source={require("@/assets/images/ash-tree.png")}
      style={styles.tree}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  tree: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
    width: "95%",
    height: "72%",
    opacity: 0.07,
    zIndex: 0,
    pointerEvents: "none",
  },
});
