import { describe, expect, it } from "vitest";
import {
  BRAIN_GAME_DISCLAIMER,
  BRAIN_GAMES,
  getBrainGame,
} from "./brain-games";

describe("brain game catalog", () => {
  it("lists five unique drills that stay off the battery", () => {
    const slugs = BRAIN_GAMES.map((game) => game.slug);
    expect(slugs).toEqual([
      "sequence-memory",
      "visual-memory",
      "chimp",
      "number-memory",
      "verbal-memory",
    ]);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(getBrainGame("sequence-memory")?.title).toBe("Sequence Memory");
    expect(BRAIN_GAME_DISCLAIMER).toMatch(/not part of the cognitive battery/i);
  });
});
