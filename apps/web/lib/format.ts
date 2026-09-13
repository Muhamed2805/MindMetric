export function engineLabel(kind: string) {
  if (kind === "likert-v1") {
    return "Likert scale";
  }
  return kind;
}

export function minutesLabel(itemCount: number) {
  if (itemCount <= 0) {
    return null;
  }
  const minutes = Math.max(1, Math.round(itemCount * 0.4));
  return minutes === 1 ? "About 1 minute" : `About ${minutes} minutes`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function firstName(name: string) {
  const [part] = name.trim().split(/\s+/);
  return part || name;
}
