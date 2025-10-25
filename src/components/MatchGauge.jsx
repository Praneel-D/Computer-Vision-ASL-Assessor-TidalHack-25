import React from "react";

export default function MatchGauge({ value, status }) {
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  const color = pct >= 80 ? "#16a34a" : pct >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="match-gauge">
      <div className="gauge" style={{ borderColor: color }}>
        <div className="value" style={{ color }}>
          {isNaN(pct) ? "--" : `${pct}%`}
        </div>
      </div>
      <div className="status muted">{status}</div>
    </div>
  );
}
