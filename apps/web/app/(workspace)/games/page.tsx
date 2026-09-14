import type { Metadata } from "next";
import { BrainGamesHub } from "../../../components/games/brain-games-hub";
import { todaysBrainGame } from "../../../lib/brain-games";

export const metadata: Metadata = {
  title: "Brain Games",
};

export default function GamesPage() {
  return <BrainGamesHub featuredSlug={todaysBrainGame().slug} />;
}
