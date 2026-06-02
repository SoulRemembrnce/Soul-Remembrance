const AFFIRMATIONS = [
  { id: "sl1", category: "self-love",  text: "I am worthy of love, joy, and all the beauty life offers." },
  { id: "pe2", category: "peace",      text: "Stillness lives within me, always available, always waiting." },
  { id: "ab3", category: "abundance",  text: "Prosperity and wellbeing are my natural state." },
  { id: "st1", category: "strength",   text: "I carry a quiet strength that sees me through every storm." },
  { id: "sg2", category: "spiritual",  text: "I trust the divine timing of my life completely." },
];

const CAT_META: Record<string, { label: string; emoji: string; color: string }> = {
  "self-love":  { label: "Self-Love",       emoji: "🌸", color: "#EC4899" },
  "peace":      { label: "Peace & Calm",    emoji: "🌿", color: "#16A34A" },
  "abundance":  { label: "Abundance",       emoji: "✨", color: "#C9A84C" },
  "strength":   { label: "Strength",        emoji: "🔥", color: "#EA580C" },
  "healing":    { label: "Healing",         emoji: "💚", color: "#16A34A" },
  "spiritual":  { label: "Spiritual Growth",emoji: "🌙", color: "#6B4FA8" },
};

const aff = AFFIRMATIONS[0];
const meta = CAT_META[aff.category];

export function Today() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#FAF5FF", minHeight: "100vh", maxWidth: 390, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #2D1B69 0%, #3D2496 100%)", padding: "52px 20px 24px", display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
          <span style={{ color: "#fff", fontSize: 16 }}>←</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, letterSpacing: 1.2, fontWeight: 700, margin: "0 0 4px" }}>DAILY AFFIRMATIONS</p>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Affirmations</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: "4px 0 0" }}>Words that heal and uplift</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #DDD0F0", background: "#fff" }}>
        {["✦  Today", "🔍  Explore", "💜  Mine"].map((t, i) => (
          <div key={t} style={{ flex: 1, textAlign: "center", padding: "14px 0", fontSize: 13, fontWeight: 600,
            color: i === 0 ? "#2D1B69" : "#8A7050",
            borderBottom: i === 0 ? "2px solid #2D1B69" : "none",
            cursor: "pointer" }}>
            {t}
          </div>
        ))}
      </div>

      <div style={{ padding: "24px 20px 100px" }}>
        {/* Date */}
        <p style={{ color: "#8A7050", fontSize: 12, textAlign: "center", margin: "0 0 4px", fontWeight: 600, letterSpacing: 0.5 }}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <p style={{ color: "#2D1B69", fontSize: 14, fontWeight: 700, textAlign: "center", margin: "0 0 20px" }}>Today's Affirmation</p>

        {/* Big card */}
        <div style={{
          background: "linear-gradient(145deg, #2D1B69, #6B4FA8)",
          borderRadius: 24, padding: "36px 28px",
          textAlign: "center", marginBottom: 20,
          boxShadow: "0 12px 40px rgba(45,27,105,0.3)"
        }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>{meta.emoji}</div>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>
            {meta.label.toUpperCase()}
          </p>
          <p style={{ color: "#fff", fontSize: 21, lineHeight: 1.55, fontWeight: 400, margin: "0 0 28px", fontStyle: "italic" }}>
            "{aff.text}"
          </p>
          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
            {[
              { icon: "♡", label: "Favourite" },
              { icon: "⟳", label: "Next" },
              { icon: "⤴", label: "Share" },
            ].map(btn => (
              <div key={btn.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <div style={{ width: 46, height: 46, borderRadius: 15, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff" }}>
                  {btn.icon}
                </div>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>{btn.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
          {AFFIRMATIONS.map((_, i) => (
            <div key={i} style={{ width: i === 0 ? 20 : 6, height: 6, borderRadius: 3, background: i === 0 ? "#2D1B69" : "#DDD0F0" }} />
          ))}
        </div>

        {/* Hold a reflection section */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #DDD0F0", padding: "18px 20px", marginBottom: 16 }}>
          <p style={{ color: "#8A7050", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, margin: "0 0 10px" }}>BREATHE IT IN</p>
          <p style={{ color: "#2C2C2C", fontSize: 14, lineHeight: 1.6, margin: "0 0 14px" }}>
            Say this affirmation aloud three times. Let it land in your body. Notice where you feel it.
          </p>
          <div style={{ background: "#F5F0FF", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "center", cursor: "pointer" }}>
            <span style={{ color: "#6B4FA8", fontSize: 14, fontWeight: 600 }}>🎵 Speak it aloud</span>
          </div>
        </div>

        {/* Quick access categories */}
        <p style={{ color: "#8A7050", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, margin: "0 0 10px 2px" }}>EXPLORE BY THEME</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(CAT_META).map(([k, m]) => (
            <div key={k} style={{ background: `${m.color}12`, border: `1px solid ${m.color}30`, borderRadius: 20, padding: "7px 14px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
              <span style={{ fontSize: 14 }}>{m.emoji}</span>
              <span style={{ color: m.color, fontSize: 12, fontWeight: 600 }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
