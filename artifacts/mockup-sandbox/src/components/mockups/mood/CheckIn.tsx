const MOODS = [
  { emoji: "😄", label: "Joyful", score: 9, color: "#F59E0B" },
  { emoji: "🌟", label: "Inspired", score: 8, color: "#C9A84C" },
  { emoji: "💜", label: "Grateful", score: 8, color: "#8B5CF6" },
  { emoji: "😌", label: "Calm", score: 7, color: "#6B4FA8" },
  { emoji: "🌊", label: "Flowing", score: 6, color: "#3D9BE9" },
  { emoji: "🌿", label: "Grounded", score: 6, color: "#16A34A" },
  { emoji: "🥱", label: "Low Energy", score: 4, color: "#8A7050" },
  { emoji: "😔", label: "Processing", score: 3, color: "#6B7280" },
  { emoji: "😰", label: "Anxious", score: 2, color: "#DC2626" },
  { emoji: "😤", label: "Frustrated", score: 2, color: "#EA580C" },
];

export function CheckIn() {
  const selected = MOODS[3];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#FAF5FF", minHeight: "100vh", maxWidth: 390, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #2D1B69 0%, #3D2496 100%)", padding: "52px 20px 24px", display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
          <span style={{ color: "#fff", fontSize: 16 }}>←</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, letterSpacing: 1.2, fontWeight: 700, margin: "0 0 4px" }}>DAILY CHECK-IN</p>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Mood Tracker</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: "4px 0 0" }}>How are you feeling today?</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "7px 12px", cursor: "pointer", marginBottom: 2 }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>History ›</span>
        </div>
      </div>

      <div style={{ padding: "20px 20px 120px" }}>
        {/* Today's check-in heading */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <p style={{ color: "#8A7050", fontSize: 13, margin: 0 }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <p style={{ color: "#2D1B69", fontSize: 16, fontWeight: 600, margin: "6px 0 0" }}>How is your soul today?</p>
        </div>

        {/* Selected mood big display */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 90, height: 90, borderRadius: 28, background: `${selected.color}15`,
            border: `2px solid ${selected.color}40`, display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 10px", fontSize: 48
          }}>
            {selected.emoji}
          </div>
          <p style={{ color: selected.color, fontSize: 17, fontWeight: 700, margin: 0 }}>{selected.label}</p>
        </div>

        {/* Mood grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 24 }}>
          {MOODS.map((m) => (
            <div key={m.label} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              padding: "10px 4px", borderRadius: 14,
              border: `1.5px solid ${m.label === selected.label ? m.color : "transparent"}`,
              background: m.label === selected.label ? `${m.color}12` : "#F5F0FF",
              cursor: "pointer",
            }}>
              <span style={{ fontSize: 24 }}>{m.emoji}</span>
              <span style={{ fontSize: 9, color: m.label === selected.label ? m.color : "#8A7050", fontWeight: 600 }}>{m.label}</span>
            </div>
          ))}
        </div>

        {/* Note */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: "#8A7050", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, margin: "0 0 8px" }}>ADD A NOTE (optional)</p>
          <div style={{ background: "#fff", border: "1px solid #DDD0F0", borderRadius: 14, padding: 14, minHeight: 80, color: "#8A7050", fontSize: 14 }}>
            What's present for you right now…
          </div>
        </div>

        {/* Save button */}
        <div style={{
          background: "linear-gradient(135deg, #2D1B69, #6B4FA8)", borderRadius: 18,
          padding: 17, textAlign: "center", cursor: "pointer",
          boxShadow: "0 6px 20px rgba(45,27,105,0.3)"
        }}>
          <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>Save today's check-in ✦</span>
        </div>
      </div>
    </div>
  );
}
