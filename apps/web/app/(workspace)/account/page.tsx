import { Button } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "../../../components/sign-out-button";
import { apiGet } from "../../../lib/api.server";
import type { AssessmentSummary } from "../../../lib/assessment-types";
import { getServerSession } from "../../../lib/session";
import { profileBuckets } from "../../../lib/workspace-nav";

export const metadata: Metadata = {
  title: "My Profile",
};

export default async function AccountPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  let assessments: AssessmentSummary[] = [];
  try {
    assessments = await apiGet<AssessmentSummary[]>("/assessments");
  } catch {
    assessments = [];
  }

  const completed = assessments.filter(
    (row) => row.status === "completed" && row.score,
  );
  const inProgress = assessments.filter((row) => row.status === "in_progress");
  const glance = profileBuckets.map((bucket) => {
    const match = completed.find((row) => bucket.slugs.includes(row.slug));
    const percent =
      match?.score && match.score.max > 0
        ? Math.round((match.score.raw / match.score.max) * 100)
        : null;
    return { ...bucket, percent, title: match?.title };
  });
  const filled = glance.filter((row) => row.percent !== null).length;
  const completion = Math.round((filled / glance.length) * 100);
  const cognitive = glance.find((row) => row.id === "cognitive");
  const unfinished = glance.filter((row) => row.percent === null);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          My Profile
        </h1>
        <p className="mt-2 text-sm text-muted">
          {session.user.name} · {session.user.email}
        </p>
      </div>
      <div className="mm-panel px-6 py-5">
        <h2 className="font-serif text-xl font-medium">Overall profile completion</h2>
        <p className="mt-2 font-serif text-4xl font-medium">{completion}%</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-accent px-6 py-6 text-accent-fg">
          <p className="text-[11px] uppercase tracking-widest text-accent-fg/70">
            Latest cognitive score
          </p>
          <p className="mt-3 font-serif text-5xl font-medium">
            {cognitive?.percent === null ? "—" : `${cognitive?.percent}`}
          </p>
          <p className="mt-2 text-sm text-accent-fg/80">
            Percent of items correct on the live cognitive scale. Not a
            standardized IQ.
          </p>
        </div>
        <div className="mm-panel px-6 py-5">
          <h2 className="font-serif text-xl font-medium">Cognitive profile</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {glance
              .filter((row) => row.id !== "personality" && row.id !== "eq")
              .map((row) => (
                <li key={row.id}>
                  <div className="flex justify-between text-sm">
                    <span>{row.label}</span>
                    <span className="text-muted">
                      {row.percent === null ? "—" : `${row.percent}%`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${row.percent ?? 0}%` }}
                    />
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </div>
      {inProgress[0] ? (
        <div className="mm-panel px-6 py-5">
          <h2 className="font-serif text-xl font-medium">Unfinished</h2>
          <p className="mt-2 text-sm text-muted">{inProgress[0].title}</p>
          <Button asChild className="mt-4">
            <Link href={`/run/${inProgress[0].id}`}>Continue</Link>
          </Button>
        </div>
      ) : null}
      {unfinished.length > 0 ? (
        <div className="mm-panel px-6 py-5">
          <h2 className="font-serif text-xl font-medium">Unfinished sections</h2>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-muted">
            {unfinished.map((row) => (
              <li key={row.id}>{row.label} · Not started</li>
            ))}
          </ul>
          <Button asChild variant="secondary" className="mt-4">
            <Link href="/tests">Complete profile</Link>
          </Button>
        </div>
      ) : null}
      <SignOutButton />
    </div>
  );
}
