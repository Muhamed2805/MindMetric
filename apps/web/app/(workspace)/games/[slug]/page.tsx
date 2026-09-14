import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrainGameSession } from "../../../../components/games/brain-game-session";
import { BRAIN_GAMES, getBrainGame } from "../../../../lib/brain-games";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return BRAIN_GAMES.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = getBrainGame(slug);
  return { title: game?.title ?? "Brain Games" };
}

export default async function BrainGamePage({ params }: PageProps) {
  const { slug } = await params;
  const game = getBrainGame(slug);
  if (!game) {
    notFound();
  }
  return <BrainGameSession game={game} />;
}
