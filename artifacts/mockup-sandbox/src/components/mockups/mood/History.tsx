const MOODS_MAP: Record<string, { emoji: string; color: string; score: number }> = {
  Joyful:     { emoji: "😄", color: "#F59E0B", score: 9 },
  Inspired:   { emoji: "🌟", color: "#C9A84C", score: 8 },
  Grateful:   { emoji: "💜", color: "#8B5CF6", score: 8 },
  Calm:       { emoji: "😌", color: "#6B4FA8", score: 7 },
  Flowing:    { emoji: "🌊", color: "#3D9BE9", score: 6 },
  Grounded:   { emoji: "🌿", color: "#16A34A", score: 6 },
  "Low Energy":{ emoji: "🥱", color: "#8A7050", score: 4 },
  Processing: { emoji: "😔", color: "#6B7280", score: 3 },
};

const DATA = [
  { date: "May 26", mood: "Processing", score: 3 },
  { date: "May 27", mood: "Low Energy", score: 4 },
  { date: "May 28", mood: "Calm", score: 7 },
  { date: "May 29", mood: "Calm", score: 7 },
  { date: "May 30", mood: "Grateful", score: 8 },
  { date: "May 31", mood: "Inspired", score: 8 },
  { date: "Jun 1",  mood: "Joyful", score: 9 },
  { date: "Jun 2",  mood: "Calm", score: 7 },
];

const CHART_W = 350, CHART_H = 120, PAD_X = 20, PAD_Y = 10;

function moodPath(): string {
  const xs = DATA.map((_, i) => PAD_X + (i / (DATA.length - 1)) * (CHART_W - PAD_X * 2));
  const ys = DATA.map(d => CHART_H - PAD_Y - ((d.score - 1) / 9) * (CHART_H - PAD_Y * 2));

  // Smooth curve using cubic bezier
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const cpx = (xs[i] + xs[i + 1]) / 2;
    d += ` C ${cpx} ${ys[i]}, ${cpx} ${ys[i + 1]}, ${xs[i + 1]} ${ys[i + 1]}`;
  }
  const area = d + ` L ${xs[xs.length - 1]} ${CHART_H} L ${xs[0]} ${CHART_H} Z`;
  return area;
}

function linePath(): string {
  const xs = DATA.map((_, i) => PAD_X + (i / (DATA.length - 1)) * (CHART_W - PAD_X * 2));
  const ys = DATA.map(d => CHART_H - PAD_Y - ((d.score - 1) / 9) * (CHART_H - PAD_Y * 2));
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const cpx = (xs[i] + xs[i + 1]) / 2;
    d += ` C ${cpx} ${ys[i]}, ${cpx} ${ys[i + 1]}, ${xs[i + 1]} ${ys[i + 1]}`;
  }
  return d;
}

const avgScore = Math.round(DATA.reduce((s, d) => s + d.score, 0) / DATA.length * 10) / 10;
const bestStreak = 3;

export function History() {
  const xs = DATA.map((_, i) => PAD_X + (i / (DATA.length - 1)) * (CHART_W - PAD_X * 2));
  const ys = DATA.map(d => CHART_H - PAD_Y - ((d.score - 1) / 9) * (CHART_H - PAD_Y * 2));

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#FAF5FF", minHeight: "100vh", maxWidth: 390, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #2D1B69 0%, #3D2496 100%)", padding: "52px 20px 24px", display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
          <span style={{ color: "#fff", fontSize: 16 }}>←</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, letterSpacing: 1.2, fontWeight: 700, margin: "0 0 4px" }}>EMOTIONAL PATTERNS</p>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Mood History</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: "4px 0 0" }}>8 check-ins recorded</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "7px 12px", cursor: "pointer", marginBottom: 2 }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>+ Check in</span>
        </div>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        {/* Stats row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Avg Mood", value: `${avgScore}/10`, emoji: "📊" },
            { label: "Best Streak", value: `${bestStreak} days`, emoji: "🔥" },
            { label: "Total Check-ins", value: DATA.length, emoji: "✅" },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: "#fff", borderRadius: 14, border: "1px solid #DDD0F0", padding: "12px 10px", textAlign: "center" }}>
              <p style={{ fontSize: 18, margin: "0 0 4px" }}>{s.emoji}</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#2D1B69", margin: "0 0 2px" }}>{s.value}</p>
              <p style={{ fontSize: 10, color: "#8A7050", margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #DDD0F0", padding: "16px 12px 8px", marginBottom: 16 }}>
          <p style={{ color: "#8A7050", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, margin: "0 0 12px 8px" }}>LAST 8 DAYS</p>
          <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ display: "block", margin: "0 auto", overflow: "visible" }}>
            <defs>
              <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6B4FA8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#6B4FA8" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[3, 5, 7, 9].map(v => {
              const y = CHART_H - PAD_Y - ((v - 1) / 9) * (CHART_H - PAD_Y * 2);
              return <line key={v} x1={PAD_X} y1={y} x2={CHART_W - PAD_X} y2={y} stroke="#DDD0F0" strokeWidth={0.8} strokeDasharray="4,4" />;
            })}
            {/* Area fill */}
            <path d={moodPath()} fill="url(#moodGrad)" />
            {/* Line */}
            <path d={linePath()} fill="none" stroke="#6B4FA8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {/* Dots with emoji */}
            {DATA.map((d, i) => {
              const m = MOODS_MAP[d.mood] || MOODS_MAP["Calm"];
              return (
                <g key={i}>
                  <circle cx={xs[i]} cy={ys[i]} r={5} fill={m.color} stroke="#fff" strokeWidth={2} />
                  {i === DATA.length - 1 && (
                    <text x={xs[i]} y={ys[i] - 12} textAnchor="middle" fontSize={14}>{m.emoji}</text>
                  )}
                </g>
              );
            })}
          </svg>
          {/* X labels */}
          <div style={{ display: "flex", justifyContent: "space-between", paddingInline: `${PAD_X}px`, marginTop: 6 }}>
            {DATA.filter((_, i) => i === 0 || i === DATA.length - 1 || i % 3 === 0).map((d, i) => (
              <span key={i} style={{ color: "#8A7050", fontSize: 9, fontWeight: 600 }}>{d.date}</span>
            ))}
          </div>
        </div>

        {/* Recent entries */}
        <p style={{ color: "#8A7050", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, margin: "0 0 10px 4px" }}>RECENT CHECK-INS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...DATA].reverse().slice(0, 5).map((d, i) => {
            const m = MOODS_MAP[d.mood] || MOODS_MAP["Calm"];
            return (
              <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid #DDD0F0", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: `${m.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {m.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: "#2C2C2C", fontSize: 14, fontWeight: 600, margin: 0 }}>{d.mood}</p>
                  <p style={{ color: "#8A7050", fontSize: 11, margin: "3px 0 0" }}>{d.date}</p>
                </div>
                <div style={{ background: `${m.color}18`, borderRadius: 8, padding: "4px 8px" }}>
                  <span style={{ color: m.color, fontSize: 12, fontWeight: 700 }}>{d.score}/10</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
