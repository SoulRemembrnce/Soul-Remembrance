import React from "react";
import Svg, { Path, Polyline } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
}

export function HouseOutlineIcon({ size = 24, color = "#2D1B69" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Roof */}
      <Polyline
        points="3,11 12,3 21,11"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Walls */}
      <Path
        d="M5 11 L5 20 Q5 21 6 21 L18 21 Q19 21 19 20 L19 11"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Door */}
      <Path
        d="M9.5 21 L9.5 15.5 Q9.5 14.5 10.5 14.5 L13.5 14.5 Q14.5 14.5 14.5 15.5 L14.5 21"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
