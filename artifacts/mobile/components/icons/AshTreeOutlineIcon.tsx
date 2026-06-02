import React from "react";
import Svg, { Line, Path } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
}

export function AshTreeOutlineIcon({ size = 24, color = "#2D1B69" }: Props) {
  const s = { stroke: color, strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Trunk */}
      <Line x1="12" y1="22" x2="12" y2="15" {...s} />

      {/* Main left branch */}
      <Path d="M12 16 C10 14.5 8 12 6 9" {...s} />
      {/* Main right branch */}
      <Path d="M12 16 C14 14.5 16 12 18 9" {...s} />
      {/* Centre branch */}
      <Path d="M12 15 C11.5 13 11.5 10 12 7" {...s} />

      {/* Left sub-branches */}
      <Path d="M8.5 12.5 C7 11 5.5 9.5 4 8" {...s} />
      <Path d="M6.5 10 C5.5 9 4.5 7.5 4 6" {...s} />

      {/* Right sub-branches */}
      <Path d="M15.5 12.5 C17 11 18.5 9.5 20 8" {...s} />
      <Path d="M17.5 10 C18.5 9 19.5 7.5 20 6" {...s} />

      {/* Top twigs from centre */}
      <Path d="M12 7 C11 6 10 5 9 4" {...s} />
      <Path d="M12 7 C12 6 12 5 12 3.5" {...s} />
      <Path d="M12 7 C13 6 14 5 15 4" {...s} />

      {/* Top left cluster */}
      <Path d="M6.5 10 C5.5 8.5 5 7 4.5 5.5" {...s} />

      {/* Top right cluster */}
      <Path d="M17.5 10 C18.5 8.5 19 7 19.5 5.5" {...s} />
    </Svg>
  );
}
