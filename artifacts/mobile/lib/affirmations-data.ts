export interface Affirmation {
  id: string;
  text: string;
  category: string;
}

export const AFFIRMATION_CATEGORIES = [
  { key: "self-love",   label: "Self-Love",       emoji: "🌸" },
  { key: "abundance",   label: "Abundance",        emoji: "✨" },
  { key: "peace",       label: "Peace & Calm",     emoji: "🌿" },
  { key: "strength",    label: "Strength",         emoji: "🔥" },
  { key: "healing",     label: "Healing",          emoji: "💚" },
  { key: "spiritual",   label: "Spiritual Growth", emoji: "🌙" },
] as const;

export const AFFIRMATIONS: Affirmation[] = [
  // Self-Love
  { id: "sl1", category: "self-love",  text: "I am worthy of love, joy, and all the beauty life offers." },
  { id: "sl2", category: "self-love",  text: "I honour myself with kindness and deep compassion." },
  { id: "sl3", category: "self-love",  text: "My soul is radiant, whole, and perfectly enough." },
  { id: "sl4", category: "self-love",  text: "I release the need for perfection and embrace who I am." },
  { id: "sl5", category: "self-love",  text: "I am deserving of care, rest, and nourishment." },
  { id: "sl6", category: "self-love",  text: "Every part of me is worthy of love — especially my shadows." },

  // Abundance
  { id: "ab1", category: "abundance",  text: "Abundance flows to me naturally and freely." },
  { id: "ab2", category: "abundance",  text: "I am open to receiving all the gifts the universe has for me." },
  { id: "ab3", category: "abundance",  text: "Prosperity and wellbeing are my natural state." },
  { id: "ab4", category: "abundance",  text: "I attract opportunities aligned with my highest good." },
  { id: "ab5", category: "abundance",  text: "The more I give with love, the more I receive in return." },
  { id: "ab6", category: "abundance",  text: "I trust the universe to provide everything I truly need." },

  // Peace
  { id: "pe1", category: "peace",      text: "I breathe in peace and exhale all that no longer serves me." },
  { id: "pe2", category: "peace",      text: "Stillness lives within me, always available, always waiting." },
  { id: "pe3", category: "peace",      text: "I release worry and return to the safety of this moment." },
  { id: "pe4", category: "peace",      text: "My mind is calm, my heart is open, my body is at ease." },
  { id: "pe5", category: "peace",      text: "I choose peace over fear in every moment." },
  { id: "pe6", category: "peace",      text: "I am grounded, centered, and held by the earth beneath me." },

  // Strength
  { id: "st1", category: "strength",   text: "I carry a quiet strength that sees me through every storm." },
  { id: "st2", category: "strength",   text: "I have survived everything that has tried to break me." },
  { id: "st3", category: "strength",   text: "Challenges are sacred invitations to grow and expand." },
  { id: "st4", category: "strength",   text: "I trust my inner wisdom to guide my every step." },
  { id: "st5", category: "strength",   text: "I rise with courage, even when the path is unclear." },
  { id: "st6", category: "strength",   text: "My resilience is a gift — I lean on it freely." },

  // Healing
  { id: "he1", category: "healing",    text: "I give my body, mind, and spirit permission to heal." },
  { id: "he2", category: "healing",    text: "Every breath I take nourishes my cells and soothes my soul." },
  { id: "he3", category: "healing",    text: "I release old wounds with love, making space for wholeness." },
  { id: "he4", category: "healing",    text: "Healing is not linear — I honour every step of my journey." },
  { id: "he5", category: "healing",    text: "I am safe to feel, safe to heal, and safe to transform." },
  { id: "he6", category: "healing",    text: "My healing ripples out and blesses everyone around me." },

  // Spiritual Growth
  { id: "sg1", category: "spiritual",  text: "I am a sacred soul on a beautiful, unfolding journey." },
  { id: "sg2", category: "spiritual",  text: "I trust the divine timing of my life completely." },
  { id: "sg3", category: "spiritual",  text: "I am connected to something greater than myself." },
  { id: "sg4", category: "spiritual",  text: "My intuition is a clear and reliable inner compass." },
  { id: "sg5", category: "spiritual",  text: "I am exactly where I need to be on my spiritual path." },
  { id: "sg6", category: "spiritual",  text: "The universe conspires in my favour in ways I cannot yet see." },
];

export function getDailyAffirmation(offset = 0): Affirmation {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return AFFIRMATIONS[(dayOfYear + offset) % AFFIRMATIONS.length];
}

export function getCategoryMeta(key: string) {
  return AFFIRMATION_CATEGORIES.find(c => c.key === key) ?? { key, label: key, emoji: "✨" };
}
