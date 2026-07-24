import { useRef, useCallback, useState } from "react";
import type { AutomationLane as Lane, AutomationPoint } from "@/lib/audio-engine";

interface Props {
  label: string;
  lane: Lane;
  duration: number;
  currentTime: number;
  color: string;
  min: number;
  max: number;
  format: (v: number) => string;
  onChange: (lane: Lane) => void;
}

// Timeline height in px
const H = 56;

const AutomationLane = ({
  label,
  lane,
  duration,
  currentTime,
  color,
  min,
  max,
  format,
  onChange,
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const range = max - min;

  const toXY = useCallback(
    (p: AutomationPoint, w: number) => ({
      x: duration > 0 ? (p.t / duration) * w : 0,
      y: H - ((p.v - min) / range) * H,
    }),
    [duration, min, range]
  );

  const fromEvent = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      const svg = svgRef.current;
      if (!svg || duration <= 0) return null;
      const rect = svg.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(H, e.clientY - rect.top));
      const t = (x / rect.width) * duration;
      const v = min + (1 - y / H) * range;
      return { t, v: Math.max(min, Math.min(max, v)) };
    },
    [duration, min, max, range]
  );

  const addPoint = (e: React.PointerEvent) => {
    if (dragIdx !== null) return;
    const pos = fromEvent(e);
    if (!pos) return;
    const points = [...lane.points, pos].sort((a, b) => a.t - b.t);
    onChange({ ...lane, enabled: true, points });
  };

  const startDrag = (e: React.PointerEvent, idx: number) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragIdx(idx);
  };

  const onDrag = (e: React.PointerEvent) => {
    if (dragIdx === null) return;
    const pos = fromEvent(e);
    if (!pos) return;
    const next = [...lane.points];
    next[dragIdx] = pos;
    onChange({ ...lane, points: next });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (dragIdx === null) return;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    // Re-sort after drag
    const sorted = [...lane.points].sort((a, b) => a.t - b.t);
    onChange({ ...lane, points: sorted });
    setDragIdx(null);
  };

  const removePoint = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const next = lane.points.filter((_, i) => i !== idx);
    onChange({ ...lane, points: next });
  };

  const toggle = () => onChange({ ...lane, enabled: !lane.enabled });
  const clear = () => onChange({ ...lane, points: [] });

  // Build polyline (using percentage-based viewBox for responsiveness)
  const W = 1000;
  const pts = [...lane.points].sort((a, b) => a.t - b.t);
  const pathPoints =
    pts.length > 0
      ? pts.map((p) => {
          const { x, y } = toXY(p, W);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
      : [];
  const playX = duration > 0 ? (currentTime / duration) * W : 0;

  return (
    <div className="col-span-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              lane.enabled
                ? "text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            style={lane.enabled ? { backgroundColor: color } : {}}
          >
            {lane.enabled ? "ON" : "OFF"}
          </button>
          <span className="text-muted-foreground">Automação · {label}</span>
        </div>
        {lane.points.length > 0 && (
          <button
            onClick={clear}
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      <div
        className={`relative rounded-md bg-secondary/50 border border-border overflow-hidden ${
          lane.enabled ? "" : "opacity-50"
        }`}
        style={{ height: H }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full cursor-crosshair touch-none"
          onPointerDown={addPoint}
          onPointerMove={onDrag}
          onPointerUp={endDrag}
        >
          {/* Center line for pan */}
          {min < 0 && (
            <line
              x1="0"
              x2={W}
              y1={H / 2}
              y2={H / 2}
              stroke="hsl(var(--border))"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          )}

          {/* Automation curve */}
          {pathPoints.length >= 2 && (
            <polyline
              points={pathPoints.join(" ")}
              fill="none"
              stroke={color}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {pathPoints.length === 1 && (
            <line
              x1="0"
              x2={W}
              y1={toXY(pts[0], W).y}
              y2={toXY(pts[0], W).y}
              stroke={color}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Playhead */}
          {duration > 0 && (
            <line
              x1={playX}
              x2={playX}
              y1="0"
              y2={H}
              stroke="hsl(var(--primary))"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Points */}
          {pts.map((p, i) => {
            const { x, y } = toXY(p, W);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={5}
                fill={color}
                stroke="hsl(var(--background))"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => startDrag(e, i)}
                onContextMenu={(e) => removePoint(e, i)}
              />
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
        <span>Clique para adicionar · arraste para mover · botão direito remove</span>
        {lane.enabled && lane.points.length > 0 && (
          <span>
            atual: {format(
              (() => {
                const l = lane;
                // Reuse valueAt logic inline to avoid extra import
                if (!l.points.length) return 0;
                const s = [...l.points].sort((a, b) => a.t - b.t);
                if (currentTime <= s[0].t) return s[0].v;
                if (currentTime >= s[s.length - 1].t) return s[s.length - 1].v;
                for (let i = 0; i < s.length - 1; i++) {
                  const a = s[i], b = s[i + 1];
                  if (currentTime >= a.t && currentTime <= b.t) {
                    const r = (currentTime - a.t) / (b.t - a.t || 1);
                    return a.v + (b.v - a.v) * r;
                  }
                }
                return 0;
              })()
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default AutomationLane;
