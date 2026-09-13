export function engineLabel(kind: string) {
  if (kind === "likert-v1") {
    return "Likert scale";
  }
  if (kind === "mcq-timed-v1") {
    return "Timed multiple choice";
  }
  return kind;
}

const DOMAIN_LABELS: Record<string, string> = {
  gf: "Fluid reasoning",
  gs: "Processing speed",
  rq: "Numerical reasoning",
  gv: "Spatial reasoning",
  gwm: "Working memory",
};

export function domainLabel(domain: string) {
  return DOMAIN_LABELS[domain] ?? domain;
}

/** Countdown face, so a section clock reads the way a clock reads. */
export function clockLabel(remainingMs: number) {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function minutesFromMs(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export function minutesLabel(itemCount: number) {
  if (itemCount <= 0) {
    return null;
  }
  const minutes = Math.max(1, Math.round(itemCount * 0.4));
  return minutes === 1 ? "About 1 minute" : `About ${minutes} minutes`;
}

export function durationLabel(
  estimatedSeconds: number | undefined,
  itemCount: number,
) {
  if (estimatedSeconds && estimatedSeconds > 0) {
    const minutes = Math.max(1, Math.round(estimatedSeconds / 60));
    return minutes === 1 ? "About 1 minute" : `About ${minutes} minutes`;
  }
  return minutesLabel(itemCount);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function firstName(name: string) {
  const [part] = name.trim().split(/\s+/);
  return part || name;
}
