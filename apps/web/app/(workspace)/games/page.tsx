import type { Metadata } from "next";
import { BrainGamesHub } from "../../../components/games/brain-games-hub";

export const metadata: Metadata = {
  title: "Brain Games",
};

export default function GamesPage() {
  return <BrainGamesHub />;
}
