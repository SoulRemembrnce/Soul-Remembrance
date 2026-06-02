export function GratitudeList() {
  const items = [
    "Waking up to the sound of birdsong this morning",
    "A long, warm conversation with an old friend",
    "The way sunlight looks through autumn leaves",
    "My body's strength and all it carries me through",
  ];

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: "#FAF5FF",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        maxWidth: 390,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #2D1B69 0%, #3D2496 100%)",
          padding: "52px 20px 24px",
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            marginBottom: 2,
          }}
        >
          <span style={{ color: "#fff", fontSize: 16 }}>←</span>
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 11,
              letterSpacing: 1.2,
              fontWeight: 600,
              margin: 0,
              marginBottom: 4,
            }}
          >
            MY GRATITUDES
          </p>
          <h1
            style={{
              color: "#fff",
              fontSize: 24,
              fontWeight: 700,
              margin: 0,
            }}
          >
            Gratitude List
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: "4px 0 0" }}>
            {items.length} blessings recorded
          </p>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: "7px 14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 2,
          }}
        >
          <span style={{ color: "#fff", fontSize: 13 }}>✦</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Add</span>
        </div>
      </div>

      {/* Daily prompt */}
      <div
        style={{
          margin: "16px 20px 0",
          background: "linear-gradient(135deg, #C9A84C22, #C9A84C08)",
          border: "1px solid #C9A84C30",
          borderRadius: 16,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 24 }}>🌅</span>
        <div>
          <p
            style={{
              color: "#C9A84C",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.8,
              margin: 0,
            }}
          >
            TODAY'S PROMPT
          </p>
          <p style={{ color: "#8A7050", fontSize: 13, margin: "3px 0 0", lineHeight: 1.4 }}>
            What moment from today made you smile?
          </p>
        </div>
      </div>

      {/* Gratitude entries */}
      <div style={{ padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((text, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              borderRadius: 18,
              border: "1px solid #DDD0F0",
              padding: "16px 18px",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              boxShadow: "0 2px 8px rgba(45,27,105,0.05)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "linear-gradient(135deg, #6B4FA808, #2D1B6912)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 18 }}>✨</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#2C2C2C", fontSize: 15, lineHeight: 1.55, margin: 0 }}>{text}</p>
              <p style={{ color: "#8A7050", fontSize: 11, margin: "6px 0 0" }}>
                {["Today", "Yesterday", "2 days ago", "Jun 1"][i]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <div
        style={{
          position: "fixed",
          bottom: 34,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 18,
          background: "linear-gradient(135deg, #2D1B69, #6B4FA8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 20px rgba(45,27,105,0.35)",
          cursor: "pointer",
          fontSize: 26,
          color: "#fff",
        }}
      >
        +
      </div>
    </div>
  );
}
