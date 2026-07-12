import { Fragment } from "react";

// Horizontal status stepper. `currentIndex` is the index of the active step;
// earlier steps render as done. Pass -1 to mark none reached.
export function Timeline({
  steps,
  currentIndex,
}: {
  steps: string[];
  currentIndex: number;
}) {
  return (
    <div className="timeline">
      {steps.map((label, i) => (
        <Fragment key={label}>
          {i > 0 && <div className={`tl-bar${i <= currentIndex ? " done" : ""}`} />}
          <div
            className={`tl-step${i < currentIndex ? " done" : i === currentIndex ? " current" : ""}`}
          >
            <div className="tl-dot">{i < currentIndex ? "✓" : i + 1}</div>
            <div className="tl-label">{label}</div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
