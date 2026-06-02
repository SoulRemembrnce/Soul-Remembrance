const IMAGES = [
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80", caption: "Peace in the mountains" },
  { url: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=400&q=80", caption: "Abundance flows to me" },
  { url: "https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=400&q=80", caption: "" },
  { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80", caption: "Living in harmony" },
  { url: "https://images.unsplash.com/photo-1474540412665-1cdae210ae6b?w=400&q=80", caption: "My dream home" },
];

export function VisionBoard() {
  const left = IMAGES.filter((_, i) => i % 2 === 0);
  const right = IMAGES.filter((_, i) => i % 2 === 1);

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: "#FAF5FF",
        minHeight: "100vh",
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
            MANIFESTING
          </p>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}>
            Vision Board
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: "4px 0 0" }}>
            {IMAGES.length} intentions set
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
          <span style={{ color: "#fff", fontSize: 13 }}>📸</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Add</span>
        </div>
      </div>

      {/* Affirmation strip */}
      <div
        style={{
          margin: "16px 20px 0",
          background: "linear-gradient(90deg, #6B4FA815, #2D1B6910)",
          border: "1px solid #6B4FA825",
          borderRadius: 14,
          padding: "12px 16px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#6B4FA8", fontSize: 13, fontWeight: 600, margin: 0, fontStyle: "italic" }}>
          "I am worthy of everything I am calling in" ✦
        </p>
      </div>

      {/* Masonry grid */}
      <div style={{ padding: "16px 16px 120px", display: "flex", gap: 10 }}>
        {/* Left column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {left.map((img, i) => (
            <div
              key={i}
              style={{
                borderRadius: 16,
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 4px 12px rgba(45,27,105,0.12)",
              }}
            >
              <img
                src={img.url}
                alt=""
                style={{ width: "100%", display: "block", height: i === 0 ? 160 : 130, objectFit: "cover" }}
              />
              {img.caption && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(transparent, rgba(45,27,105,0.75))",
                    padding: "20px 10px 8px",
                  }}
                >
                  <p style={{ color: "#fff", fontSize: 11, fontWeight: 600, margin: 0 }}>{img.caption}</p>
                </div>
              )}
            </div>
          ))}
          {/* Add tile */}
          <div
            style={{
              borderRadius: 16,
              border: "2px dashed #DDD0F0",
              height: 100,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 22, color: "#6B4FA8" }}>+</span>
            <span style={{ fontSize: 11, color: "#8A7050", fontWeight: 600 }}>Add photo</span>
          </div>
        </div>

        {/* Right column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {right.map((img, i) => (
            <div
              key={i}
              style={{
                borderRadius: 16,
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 4px 12px rgba(45,27,105,0.12)",
              }}
            >
              <img
                src={img.url}
                alt=""
                style={{ width: "100%", display: "block", height: i === 0 ? 140 : 155, objectFit: "cover" }}
              />
              {img.caption && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(transparent, rgba(45,27,105,0.75))",
                    padding: "20px 10px 8px",
                  }}
                >
                  <p style={{ color: "#fff", fontSize: 11, fontWeight: 600, margin: 0 }}>{img.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
