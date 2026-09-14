export const BRAIN_GAME_DISCLAIMER =
  "These drills are not part of the cognitive battery. They never contribute to an IQ, percentile, or domain score.";

export type BrainGameSlug =
  | "sequence-memory"
  | "visual-memory"
  | "chimp"
  | "number-memory"
  | "verbal-memory";

export type BrainGame = {
  slug: BrainGameSlug;
  title: string;
  skill: string;
  tagline: string;
  prompt: string;
  about: string[];
  scoreLabel: string;
};

export const BRAIN_GAMES: BrainGame[] = [
  {
    slug: "sequence-memory",
    title: "Sequence Memory",
    skill: "Sequencing",
    tagline: "Repeat a growing chain.",
    prompt:
      "Tiles light up in order. Press them back in the same order. One miss ends the run.",
    about: [
      "A short chain of tiles lights up. After it finishes, you press the same tiles in the same order.",
      "Each clean round adds one more step. The first miss ends the drill. The score is how many rounds you finished.",
    ],
    scoreLabel: "Level",
  },
  {
    slug: "visual-memory",
    title: "Visual Memory",
    skill: "Recall",
    tagline: "Hold a scattered pattern.",
    prompt:
      "Remember which tiles turn light, then tap them. Three misses end the run.",
    about: [
      "A handful of tiles flash. When they go dark, tap every tile that flashed — and only those.",
      "A wrong tap costs a life. Three misses end the drill. The score is the last pattern you completed.",
    ],
    scoreLabel: "Level",
  },
  {
    slug: "chimp",
    title: "Chimp Test",
    skill: "Working memory",
    tagline: "Touch numbers in order.",
    prompt:
      "Press 1 through N in order. After 1, the rest hide. Three misses end the run.",
    about: [
      "Numerals appear in random cells. Touch them from 1 upward. After the first touch, the remaining numerals hide.",
      "A wrong cell costs a life. Three misses end the drill. The score is the longest run of numerals you cleared.",
    ],
    scoreLabel: "Numerals",
  },
  {
    slug: "number-memory",
    title: "Number Memory",
    skill: "Digit span",
    tagline: "Hold a growing integer.",
    prompt: "A number appears briefly. Type it back. One miss ends the run.",
    about: [
      "A number is shown, then taken away. Type the same digits, including any leading zeros.",
      "Each success adds one digit. The first miss ends the drill. The score is the longest number you typed back.",
    ],
    scoreLabel: "Digits",
  },
  {
    slug: "verbal-memory",
    title: "Verbal Memory",
    skill: "Recognition",
    tagline: "Track words you have seen.",
    prompt:
      "Each word is either new or one you already saw. Three misses end the run.",
    about: [
      "Words appear one at a time. Mark each as new, or as one already shown in this run.",
      "A wrong mark costs a life. Three misses end the drill. The score is how many you marked correctly.",
    ],
    scoreLabel: "Score",
  },
];

export function getBrainGame(slug: string): BrainGame | undefined {
  return BRAIN_GAMES.find((game) => game.slug === slug);
}

export type BrainGameStats = {
  best: number;
  last: number;
  plays: number;
};

const STORAGE_KEY = "mindmetric.brain-games.v1";

export function emptyBrainGameStats(): BrainGameStats {
  return { best: 0, last: 0, plays: 0 };
}

function readAllStats(): Record<string, BrainGameStats> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, BrainGameStats>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readBrainGameStats(slug: string): BrainGameStats {
  return readAllStats()[slug] ?? emptyBrainGameStats();
}

export function recordBrainGameScore(
  slug: string,
  score: number,
): BrainGameStats {
  const all = readAllStats();
  const previous = all[slug] ?? emptyBrainGameStats();
  const next: BrainGameStats = {
    best: Math.max(previous.best, score),
    last: score,
    plays: previous.plays + 1,
  };
  all[slug] = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return next;
}
