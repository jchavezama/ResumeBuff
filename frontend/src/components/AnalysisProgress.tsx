import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

const STEPS = [
  "Reading your resume…",
  "Analyzing the job description…",
  "Matching your skills to what they're looking for…",
  "Auditing which bullets are already strong…",
  "Checking for real skill gaps…",
  "Finalizing your ATS score…",
];

// The bar eases toward this value while we wait, then jumps to 100% on `done`.
const WAITING_CEILING = 90;

interface AnalysisProgressProps {
  /** Set to true the moment the backend responds so the bar can finish. */
  done?: boolean;
}

export default function AnalysisProgress({ done = false }: AnalysisProgressProps) {
  const [progress, setProgress] = useState(4);

  useEffect(() => {
    if (done) {
      setProgress(100);
      return;
    }
    // Each tick covers a slice of the remaining distance, so the bar moves
    // quickly at first and slows down, but never looks frozen or "finished".
    const t = setInterval(() => {
      setProgress((p) => p + (WAITING_CEILING - p) * 0.04);
    }, 200);
    return () => clearInterval(t);
  }, [done]);

  const stepIndex = Math.min(
    Math.floor(progress / (WAITING_CEILING / STEPS.length)),
    STEPS.length - 1
  );
  const message = done ? "All done! Loading your results…" : STEPS[stepIndex];

  return (
    <div className="flex flex-col items-center gap-3 py-4" aria-live="polite">
      {done ? (
        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
      ) : (
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      )}
      <p className="text-sm font-medium">{message}</p>
      <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all duration-300 ease-out ${
            done ? "bg-emerald-600" : "bg-primary"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
