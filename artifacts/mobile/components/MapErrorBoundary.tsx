import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface Props {
  children: React.ReactNode;
  onFallback: () => void;
}

interface State {
  crashed: boolean;
}

export class MapErrorBoundary extends React.Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  render() {
    if (this.state.crashed) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
          <Feather name="map" size={48} color="#C4B5D0" />
          <Text style={{ fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#2D1B69", textAlign: "center" }}>
            Map unavailable
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#7A6E85", textAlign: "center", lineHeight: 21 }}>
            The interactive map requires a Google Maps API key. Switch to list view to browse practitioners.
          </Text>
          <TouchableOpacity
            onPress={this.props.onFallback}
            style={{ backgroundColor: "#2D1B69", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28 }}
          >
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Switch to List View</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
