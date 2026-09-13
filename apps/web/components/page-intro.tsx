export function PageIntro({
  kicker,
  title,
  description,
}: {
  kicker?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {kicker ? (
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {kicker}
        </p>
      ) : null}
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="max-w-xl text-base leading-7 text-muted">{description}</p>
      ) : null}
    </div>
  );
}
