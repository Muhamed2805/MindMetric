import type { PowerStimulus } from "@mindmetric/shared";
import { FigureView } from "@mindmetric/ui";

/**
 * Renders whichever stimulus form an item uses. Figure geometry comes from the
 * declarative spec, so the same item looks the same wherever it is shown.
 */
export function StimulusView({
  stimulus,
  idPrefix,
  cellSize,
}: {
  stimulus: PowerStimulus;
  idPrefix: string;
  cellSize: number;
}) {
  if (stimulus.type === "text") {
    return <p className="font-serif text-lg text-ink">{stimulus.text}</p>;
  }
  return (
    <FigureView
      spec={stimulus.figure}
      idPrefix={idPrefix}
      cellSize={cellSize}
    />
  );
}
