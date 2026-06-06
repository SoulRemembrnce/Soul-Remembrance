import { Router } from "express";

const router = Router();

// ─── Symbol keyword map ───────────────────────────────────────────────────────

const SYMBOL_KEYWORDS: Record<string, string[]> = {
  Water:      ["water", "ocean", "sea", "river", "lake", "rain", "flood", "wave", "swim", "drown"],
  Fire:       ["fire", "flame", "burn", "burning", "smoke", "ember", "blaze"],
  Flying:     ["fly", "flying", "float", "soar", "wings", "sky", "cloud", "levitat"],
  Falling:    ["fall", "falling", "drop", "plunge", "cliff", "tumble"],
  Chase:      ["chase", "chased", "chasing", "run", "running", "escape", "flee", "pursue"],
  House:      ["house", "home", "room", "door", "window", "corridor", "staircase", "building"],
  Snake:      ["snake", "serpent", "reptile", "slither"],
  Death:      ["death", "dead", "dying", "die", "funeral", "grave", "ghost"],
  Teeth:      ["teeth", "tooth", "dental", "bite"],
  Light:      ["light", "bright", "glow", "shining", "sun", "radiant", "illuminate"],
  Darkness:   ["dark", "darkness", "shadow", "night", "black", "void"],
  Animal:     ["animal", "wolf", "bear", "bird", "lion", "tiger", "horse", "dog", "cat", "creature"],
  People:     ["people", "crowd", "person", "someone", "stranger", "family", "mother", "father"],
  Journey:    ["travel", "journey", "road", "path", "map", "lost", "destination", "walk"],
  Transformation: ["change", "transform", "morph", "shift", "become", "evolve"],
};

const THEME_PATTERNS: Record<string, string[]> = {
  "Transformation & Growth": ["change", "transform", "evolve", "grow", "new", "begin", "start"],
  "Fear & Anxiety":          ["chase", "scared", "fear", "anxious", "threat", "danger", "escape"],
  "Loss & Grief":            ["lost", "miss", "gone", "death", "end", "leave", "left"],
  "Power & Freedom":         ["fly", "soar", "power", "strong", "control", "free", "release"],
  "Connection & Love":       ["love", "together", "hug", "family", "friend", "warmth", "belong"],
  "Shadow Work":             ["dark", "shadow", "hidden", "secret", "unknown", "monster", "fear"],
  "Spiritual Awakening":     ["light", "angel", "divine", "sacred", "universe", "spirit", "soul"],
  "Subconscious Processing": ["confuse", "strange", "weird", "bizarre", "random", "unclear"],
};

function extractSymbols(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(SYMBOL_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => lower.includes(kw)))
    .map(([symbol]) => symbol)
    .slice(0, 6);
}

function extractThemes(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(THEME_PATTERNS)
    .filter(([, keywords]) => keywords.some((kw) => lower.includes(kw)))
    .map(([theme]) => theme)
    .slice(0, 3);
}

function buildFallbackMessage(symbols: string[], themes: string[], moonPhase: string, dreamEmotions: string[], wakingEmotions: string[]): string {
  const parts: string[] = [];
  if (moonPhase === "Full Moon") {
    parts.push("Under the Full Moon your subconscious speaks loudest — this is a time of heightened revelation.");
  } else if (moonPhase === "New Moon") {
    parts.push("The New Moon carries dreams of new beginnings; your inner world is planting seeds.");
  } else if (moonPhase.includes("Waxing")) {
    parts.push("As the moon grows, so does your awareness — this dream reflects expanding energy.");
  } else if (moonPhase.includes("Waning")) {
    parts.push("The waning moon invites release; your dream may be showing what is ready to let go.");
  }
  if (symbols.includes("Water")) {
    parts.push("Water in dreams reflects the flow of emotion and the depths of the unconscious.");
  }
  if (symbols.includes("Flying")) {
    parts.push("Flight signifies a desire for freedom and a transcendence of current limitations.");
  }
  if (symbols.includes("Chase")) {
    parts.push("Being chased often represents avoided feelings or situations that seek your attention.");
  }
  if (symbols.includes("House")) {
    parts.push("The house is the self — each room a facet of your inner landscape.");
  }
  if (dreamEmotions.length > 0 && wakingEmotions.length > 0) {
    if (dreamEmotions[0] !== wakingEmotions[0]) {
      parts.push(`The shift from feeling ${dreamEmotions[0].toLowerCase()} within the dream to ${wakingEmotions[0].toLowerCase()} on waking suggests a transition your psyche is navigating.`);
    }
  }
  if (parts.length === 0) {
    parts.push("This dream carries personal meaning unique to your journey. Sit with its imagery and notice what resonates most deeply.");
  }
  return parts.join(" ");
}

// ─── POST /api/ai/analyze-dream ──────────────────────────────────────────────

router.post("/api/ai/analyze-dream", async (req, res) => {
  const { dream, dreamEmotions = [], wakingEmotions = [], moonPhase = "" } = req.body as {
    dream: string;
    dreamEmotions: string[];
    wakingEmotions: string[];
    moonPhase: string;
  };

  if (!dream || typeof dream !== "string") {
    res.status(400).json({ error: "dream text is required" });
    return;
  }

  const aiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const aiApiKey  = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (aiBaseUrl && aiApiKey) {
    try {
      const prompt = [
        `You are a compassionate spiritual dream analyst with deep knowledge of Jungian psychology, symbolism, and moon cycle wisdom.`,
        `Analyse this dream journal entry and respond in JSON only.`,
        ``,
        `Moon phase when dreamed: ${moonPhase}`,
        `Emotions felt INSIDE the dream: ${dreamEmotions.join(", ") || "unspecified"}`,
        `Emotions felt ON WAKING: ${wakingEmotions.join(", ") || "unspecified"}`,
        `Dream: ${dream}`,
        ``,
        `Respond with this exact JSON structure:`,
        `{`,
        `  "symbols": ["up to 6 key symbols/archetypes found in the dream"],`,
        `  "themes": ["2-3 overarching psychological or spiritual themes"],`,
        `  "message": "A warm, insightful 2-3 sentence reflection weaving together the moon phase, dream emotions, waking emotions, symbols and themes. Speak directly to the dreamer."`,
        `}`,
      ].join("\n");

      const response = await fetch(`${aiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-5.4",
          max_completion_tokens: 512,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json() as any;
        const content = data.choices?.[0]?.message?.content ?? "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          res.json({
            symbols: parsed.symbols ?? [],
            themes: parsed.themes ?? [],
            message: parsed.message ?? "",
            analyzedAt: new Date().toISOString(),
          });
          return;
        }
      }
    } catch {
      // fall through to rule-based
    }
  }

  // Rule-based fallback
  const symbols = extractSymbols(dream);
  const themes  = extractThemes(dream);
  const message = buildFallbackMessage(symbols, themes, moonPhase, dreamEmotions, wakingEmotions);
  res.json({ symbols, themes, message, analyzedAt: new Date().toISOString() });
});

// ─── POST /api/ai/monthly-dream-insights ─────────────────────────────────────

router.post("/api/ai/monthly-dream-insights", async (req, res) => {
  const { month, entries = [] } = req.body as {
    month: string;
    entries: Array<{
      date: string;
      moonPhase: string;
      dreamEmotions: string[];
      wakingEmotions: string[];
      description: string;
      symbols: string[];
      themes: string[];
    }>;
  };

  if (!entries.length) {
    res.status(400).json({ error: "entries required" });
    return;
  }

  // Aggregate for context
  const allDreamEmotions: Record<string, number> = {};
  const allWakingEmotions: Record<string, number> = {};
  const allSymbols: Record<string, number> = {};
  const allThemes: Record<string, number> = {};
  const moonPhases: Record<string, number> = {};

  entries.forEach((e) => {
    e.dreamEmotions.forEach((em) => { allDreamEmotions[em] = (allDreamEmotions[em] ?? 0) + 1; });
    e.wakingEmotions.forEach((em) => { allWakingEmotions[em] = (allWakingEmotions[em] ?? 0) + 1; });
    e.symbols.forEach((s) => { allSymbols[s] = (allSymbols[s] ?? 0) + 1; });
    e.themes.forEach((t) => { allThemes[t] = (allThemes[t] ?? 0) + 1; });
    moonPhases[e.moonPhase] = (moonPhases[e.moonPhase] ?? 0) + 1;
  });

  const topDreamEm   = Object.entries(allDreamEmotions).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const topWakingEm  = Object.entries(allWakingEmotions).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const topSymbols   = Object.entries(allSymbols).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
  const topThemes    = Object.entries(allThemes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const dominantMoon = Object.entries(moonPhases).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  const aiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const aiApiKey  = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (aiBaseUrl && aiApiKey) {
    try {
      const summaries = entries.map((e, i) =>
        `Dream ${i + 1} (${e.date}, ${e.moonPhase}): ${e.description.slice(0, 200)}…`
      ).join("\n");

      const prompt = [
        `You are a compassionate spiritual dream analyst. A user has shared ${entries.length} dream entries from ${month}.`,
        ``,
        `Summary of patterns:`,
        `- Most frequent in-dream emotions: ${topDreamEm.join(", ")}`,
        `- Most frequent waking emotions: ${topWakingEm.join(", ")}`,
        `- Recurring symbols: ${topSymbols.join(", ")}`,
        `- Recurring themes: ${topThemes.join(", ")}`,
        `- Most dreams occurred under: ${dominantMoon}`,
        ``,
        `Dream summaries:`,
        summaries,
        ``,
        `Write a warm, insightful 3-4 sentence monthly reflection for this dreamer. Weave together the emotional patterns, recurring symbols, moon cycle influence, and the shift between dream emotions and waking emotions. Speak directly to them. Do not use bullet points.`,
      ].join("\n");

      const response = await fetch(`${aiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-5.4",
          max_completion_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json() as any;
        const insight = data.choices?.[0]?.message?.content ?? "";
        if (insight) {
          res.json({ insight, recurringSymbols: topSymbols, emotionalPatterns: { dream: topDreamEm, waking: topWakingEm }, dominantMoonPhase: dominantMoon });
          return;
        }
      }
    } catch {
      // fall through to rule-based
    }
  }

  // Rule-based monthly reflection
  const lines: string[] = [];
  lines.push(`This month your dreams painted a vivid inner landscape across ${entries.length} recorded nights.`);
  if (topDreamEm.length > 0) {
    lines.push(`Inside your dreams you most often felt ${topDreamEm.join(", ").toLowerCase()}, while waking you carried ${(topWakingEm[0] ?? "varied emotions").toLowerCase()} — a meaningful conversation between your sleeping and waking self.`);
  }
  if (topSymbols.length > 0) {
    lines.push(`The symbols of ${topSymbols.slice(0, 3).join(", ").toLowerCase()} returned repeatedly, suggesting your subconscious is working through something significant in these areas.`);
  }
  if (dominantMoon) {
    lines.push(`Most of your dreams arose under the ${dominantMoon}, a phase associated with ${dominantMoon.includes("Full") ? "heightened emotion and revelation" : dominantMoon.includes("New") ? "beginnings and planting seeds" : "transition and inner movement"}.`);
  }

  res.json({
    insight: lines.join(" "),
    recurringSymbols: topSymbols,
    emotionalPatterns: { dream: topDreamEm, waking: topWakingEm },
    dominantMoonPhase: dominantMoon,
  });
});

export default router;
