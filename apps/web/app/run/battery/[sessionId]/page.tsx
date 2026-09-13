import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BatteryRunner } from "../../../../components/battery-runner";
import { apiGet } from "../../../../lib/api.server";
import type { BatterySessionState } from "../../../../lib/battery-types";
import { getServerSession } from "../../../../lib/session";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export const metadata: Metadata = {
  title: "Cognitive battery",
};

export default async function BatteryRunPage({ params }: PageProps) {
  const { sessionId } = await params;

  const session = await getServerSession();
  if (!session) {
    redirect(`/login?from=/run/battery/${sessionId}`);
  }

  let state: BatterySessionState;
  try {
    state = await apiGet<BatterySessionState>(`/battery/sessions/${sessionId}`);
  } catch {
    notFound();
  }

  return <BatteryRunner initial={state} />;
}
