const FAVS = [
  { text: "I am worthy of love, joy, and all the beauty life offers.", category: "self-love", emoji: "🌸", color: "#EC4899" },
  { text: "I trust the divine timing of my life completely.", category: "spiritual", emoji: "🌙", color: "#6B4FA8" },
  { text: "I carry a quiet strength that sees me through every storm.", category: "strength", emoji: "🔥", color: "#EA580C" },
];

const CUSTOM = [
  { text: "I am becoming the person I was always meant to be.", createdAt: "Today" },
];

export function Mine() {
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
        </div>
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "7px 14px", cursor: "pointer" }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>+ Add</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #DDD0F0", background: "#fff" }}>
        {["✦  Today", "🔍  Explore", "💜  Mine"].map((t, i) => (
          <div key={t} style={{ flex: 1, textAlign: "center", padding: "14px 0", fontSize: 13, fontWeight: 600,
            color: i === 2 ? "#2D1B69" : "#8A7050",
            borderBottom: i === 2 ? "2px solid #2D1B69" : "none",
            cursor: "pointer" }}>
            {t}
          </div>
        ))}
      </div>

      <div style={{ padding: "20px 20px 100px" }}>
        {/* Favourites */}
        <p style={{ color: "#8A7050", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, margin: "0 0 12px 2px" }}>
          FAVOURITES ({FAVS.length})
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {FAVS.map((f, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 18, border: "1px solid #DDD0F0", padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {f.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#2C2C2C", fontSize: 14, lineHeight: 1.55, fontStyle: "italic", margin: "0 0 6px" }}>"{f.text}"</p>
                <span style={{ color: f.color, fontSize: 10, fontWeight: 700, background: `${f.color}12`, borderRadius: 6, padding: "2px 8px" }}>
                  {f.emoji} {f.category}
                </span>
              </div>
              <span style={{ color: "#EC4899", fontSize: 20, cursor: "pointer" }}>♥</span>
            </div>
          ))}
        </div>

        {/* Custom */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ color: "#8A7050", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, margin: 0 }}>MY AFFIRMATIONS ({CUSTOM.length})</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {CUSTOM.map((c, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 18, border: "1px solid #DDD0F0", padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                💜
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#2C2C2C", fontSize: 14, lineHeight: 1.55, fontStyle: "italic", margin: "0 0 4px" }}>"{c.text}"</p>
                <p style={{ color: "#8A7050", fontSize: 11, margin: 0 }}>Added {c.createdAt}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Add your own button */}
        <div style={{
          background: "linear-gradient(135deg, #2D1B69, #6B4FA8)", borderRadius: 18,
          padding: 17, textAlign: "center", cursor: "pointer",
          boxShadow: "0 6px 20px rgba(45,27,105,0.3)"
        }}>
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>✦  Write your own affirmation</span>
        </div>
      </div>
    </div>
  );
}
