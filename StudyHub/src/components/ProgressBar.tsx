interface ProgressBarProps {
  current: number;
  max: number;
}

export default function ProgressBar({ current, max }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((current / Math.max(1, max)) * 100));

  return (
    <div className="progress-wrap">
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            transition: "width 0.4s ease-in-out",
          }}
        />
      </div>
      <span className="progress-label">{pct}%</span>
    </div>
  );
}
