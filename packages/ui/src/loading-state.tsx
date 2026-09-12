type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <output className="flex items-center gap-3 py-8 text-muted">
      <span
        className="size-5 animate-spin rounded-full border-2 border-line border-t-accent"
        aria-hidden="true"
      />
      <span className="text-sm">{label}</span>
    </output>
  );
}
