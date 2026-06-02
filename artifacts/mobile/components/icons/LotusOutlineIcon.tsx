import React from "react";
import Svg, { Path } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
}

export function LotusOutlineIcon({ size = 24, color = "#2D1B69" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Center tall petal */}
      <Path
        d="M12 20 C10.5 15 10.5 8 12 3 C13.5 8 13.5 15 12 20 Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Inner left petal */}
      <Path
        d="M12 20 C10 17 7 14 6 10 C8.5 9 11 13.5 12 20 Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Inner right petal */}
      <Path
        d="M12 20 C14 17 17 14 18 10 C15.5 9 13 13.5 12 20 Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Outer left petal */}
      <Path
        d="M12 20 C9 18 4.5 17 3 13.5 C5 10.5 9.5 14.5 12 20 Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Outer right petal */}
      <Path
        d="M12 20 C15 18 19.5 17 21 13.5 C19 10.5 14.5 14.5 12 20 Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Water / base line */}
      <Path
        d="M4 21.5 Q8 22.5 12 21.5 Q16 20.5 20 21.5"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
