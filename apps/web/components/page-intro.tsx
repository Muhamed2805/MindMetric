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
        <p className="text-xs font-medium uppercase tracking-widest text-mark">
          {kicker}
        </p>
      ) : null}
      <h1 className="font-serif text-3xl font-medium tracking-tight md:text-[2.1rem]">
        {title}
      </h1>
      {description ? (
        <p className="max-w-xl text-base leading-7 text-muted">{description}</p>
      ) : null}
    </div>
  );
}
