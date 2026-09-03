"use client";

import type { MouseEvent, ReactNode, TouchEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "../lib/cn";

const YELLOW = "#F4BE37";
const PURPLE = "#8C52FF";
const RED = "#FF4D4D";
const GREEN = "#00C853";
const GRID = "#2E2E2E";
const MUTED = "#959597";

const CHART_LEFT = 36;
const CHART_RIGHT = 390;
const CHART_TOP = 16;
const CHART_BOTTOM = 108;
const VIEW_W = 400;
const VIEW_H = 150;

type BillingPoint = {
  label: string;
  under: number;
  over: number;
  unresolved: number;
};

const BILLING_POINTS: BillingPoint[] = [
  { label: "JUNE (1 - 14)", under: 120, over: 16, unresolved: 16 },
  { label: "JUNE (15 - 21)", under: 98, over: 22, unresolved: 12 },
  { label: "JUNE (22 - 28)", under: 110, over: 18, unresolved: 20 },
  { label: "JULY (29 - 4)", under: 86, over: 28, unresolved: 14 },
  { label: "JULY (5 - 11)", under: 74, over: 32, unresolved: 10 },
  { label: "JULY (12 - 18)", under: 64, over: 36, unresolved: 8 },
];

/** Map chart values (~0-50 scale for y axis display) to SVG y */
function valueToY(value: number, max = 50) {
  const clamped = Math.min(max, Math.max(0, value));
  return CHART_TOP + ((max - clamped) / max) * (CHART_BOTTOM - CHART_TOP);
}

function pointX(index: number, total: number) {
  if (total <= 1) return CHART_LEFT;
  return CHART_LEFT + ((CHART_RIGHT - CHART_LEFT) / (total - 1)) * index;
}

function buildPath(
  points: Array<{ under: number; over: number; unresolved?: number }>,
  key: "under" | "over" | "unresolved",
  scale: number,
) {
  return points
    .map((p, i) => {
      const x = pointX(i, points.length);
      const y = valueToY((p[key] ?? 0) / scale);
      return `${i === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
}

export interface DashboardBillingChartProps {
  className?: string;
}

export function DashboardBillingChart({ className }: DashboardBillingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const yVals = [50, 40, 30, 20, 10, 0];
  const xLabels = ["0-14", "15-21", "22-28", "29-4", "5-11", "12-18"];
  const rowH = (CHART_BOTTOM - CHART_TOP) / 5;
  const scale = 3; // 120 → ~40 on 0-50 axis

  const underPath = useMemo(
    () => buildPath(BILLING_POINTS, "under", scale),
    [],
  );
  const overPath = useMemo(
    () => buildPath(BILLING_POINTS, "over", scale),
    [],
  );
  const unresolvedPath = useMemo(
    () => buildPath(BILLING_POINTS, "unresolved", scale),
    [],
  );
  const unresolvedFill = useMemo(() => {
    const line = buildPath(BILLING_POINTS, "unresolved", scale);
    return `${line} L${CHART_RIGHT} ${CHART_BOTTOM} L${CHART_LEFT} ${CHART_BOTTOM} Z`;
  }, []);

  const active = activeIndex !== null ? BILLING_POINTS[activeIndex] : null;
  const activeX =
    activeIndex !== null ? pointX(activeIndex, BILLING_POINTS.length) : 0;
  const activeY =
    activeIndex !== null
      ? valueToY(BILLING_POINTS[activeIndex]!.over / scale)
      : 0;

  const onMove = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratioX = (clientX - rect.left) / rect.width;
    const svgX = ratioX * VIEW_W;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < BILLING_POINTS.length; i++) {
      const x = pointX(i, BILLING_POINTS.length);
      const dist = Math.abs(x - svgX);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    }
    setActiveIndex(nearest);
  }, []);

  const onMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      onMove(event.clientX);
    },
    [onMove],
  );

  const onTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const touch = event.touches[0];
      if (touch) onMove(touch.clientX);
    },
    [onMove],
  );

  const tooltipLeftPct = Math.min(82, Math.max(18, (activeX / VIEW_W) * 100));
  const tooltipTopPct = (activeY / VIEW_H) * 100;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-[180px] w-full min-w-0 cursor-crosshair touch-pan-y sm:h-[220px]",
        className,
      )}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setActiveIndex(null)}
      onTouchStart={onTouchMove}
      onTouchMove={onTouchMove}
    >
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" aria-hidden>
        {yVals.map((_, i) => {
          const y = CHART_TOP + i * rowH;
          return (
            <line
              key={`h-${i}`}
              x1={CHART_LEFT}
              y1={y}
              x2={CHART_RIGHT}
              y2={y}
              stroke={GRID}
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          );
        })}

        {xLabels.map((_, i) => {
          const x = pointX(i, xLabels.length);
          return (
            <line
              key={`v-${i}`}
              x1={x}
              y1={CHART_TOP}
              x2={x}
              y2={CHART_BOTTOM}
              stroke={GRID}
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          );
        })}

        {yVals.map((val, i) => (
          <text
            key={val}
            x="4"
            y={CHART_TOP + i * rowH + 3}
            fill={MUTED}
            fontSize="9"
            fontFamily="var(--font-sans)"
          >
            {val}
          </text>
        ))}

        {xLabels.map((label, i) => (
          <text
            key={label}
            x={pointX(i, xLabels.length)}
            y="142"
            fill={MUTED}
            fontSize="9"
            fontFamily="var(--font-sans)"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}

        <path d={unresolvedFill} fill="url(#unresolvedFill)" />
        <path
          d={underPath}
          fill="none"
          stroke={YELLOW}
          strokeWidth="2"
          strokeDasharray="5 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={overPath}
          fill="none"
          stroke={PURPLE}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={unresolvedPath}
          fill="none"
          stroke={RED}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {activeIndex !== null ? (
          <>
            <line
              x1={activeX}
              y1={CHART_TOP}
              x2={activeX}
              y2={CHART_BOTTOM}
              stroke="#3E3E3E"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={activeX} cy={activeY} r="8" fill={PURPLE} opacity="0.25" />
            <circle
              cx={activeX}
              cy={activeY}
              r="4.5"
              fill="#1A1A1A"
              stroke={PURPLE}
              strokeWidth="2.5"
            />
          </>
        ) : null}

        <defs>
          <linearGradient id="unresolvedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={RED} stopOpacity="0.28" />
            <stop offset="100%" stopColor={RED} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating tooltip — follows active chart point */}
      {active ? (
        <div
          className="pointer-events-none absolute z-10 min-w-[120px] max-w-[min(160px,70vw)] -translate-x-1/2 -translate-y-[110%] rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-3 py-2.5 shadow-lg"
          style={{
            left: `${tooltipLeftPct}%`,
            top: `${tooltipTopPct}%`,
          }}
        >
          <p className="text-center font-sans text-[9px] font-medium uppercase tracking-[0.02em] text-[#888888]">
            {active.label}
          </p>
          <div className="divider-line-full my-2 w-full" aria-hidden />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="font-sans text-[10px] text-[#E0E0E0]">{active.under}</span>
              <span
                className="font-sans text-[9px] uppercase tracking-[0.02em]"
                style={{ color: YELLOW }}
              >
                Underbilled
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-sans text-[10px] text-[#E0E0E0]">{active.over}</span>
              <span
                className="font-sans text-[9px] uppercase tracking-[0.02em]"
                style={{ color: PURPLE }}
              >
                Overbilled
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-sans text-[10px] text-[#E0E0E0]">
                {active.unresolved}
              </span>
              <span
                className="font-sans text-[9px] uppercase tracking-[0.02em]"
                style={{ color: RED }}
              >
                Unresolved
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export interface DashboardGaugeChartProps {
  value: number;
  label?: string;
  className?: string;
}

export function DashboardGaugeChart({
  value,
  label = "Total",
  className,
}: DashboardGaugeChartProps) {
  return (
    <div className={cn("flex min-w-0 items-center justify-center py-3", className)}>
      <div className="relative flex h-28 w-full max-w-56 items-end justify-center sm:h-36">
        <svg viewBox="0 0 200 110" className="h-full w-full" aria-hidden>
          {/* Purple — left */}
          <path
            d="M18 96 A82 82 0 0 1 58 28"
            fill="none"
            stroke={PURPLE}
            strokeWidth="18"
            strokeLinecap="round"
          />
          {/* Grey — top */}
          <path
            d="M68 24 A82 82 0 0 1 132 24"
            fill="none"
            stroke={MUTED}
            strokeWidth="18"
            strokeLinecap="round"
          />
          {/* Green — right */}
          <path
            d="M142 28 A82 82 0 0 1 182 96"
            fill="none"
            stroke={GREEN}
            strokeWidth="18"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute bottom-1 text-center">
          <p className="font-sans text-[28px] font-[590] leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[40px]">
            {value}
          </p>
          <p className="mt-1 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

export type SparklineTone = "green" | "amber" | "purple";

/** true = vertical bar, false = horizontal dash */
const sparklineSegments: Record<SparklineTone, boolean[]> = {
  green: [false, true, false, false, false, false, true, false, false, false, false, false, false],
  amber: [
    false, false, true, false, false, false, false, true, false, false, false, false, true, false,
    false, true,
  ],
  purple: [
    true, false, false, false, true, false, false, false, true, false, false, false, false, true,
    true, false, false, false, true,
  ],
};

const sparklineColors: Record<SparklineTone, string> = {
  green: GREEN,
  amber: MUTED,
  purple: PURPLE,
};

function DashboardStatusSparkline({
  segments,
  color,
  className,
}: {
  segments: boolean[];
  color: string;
  className?: string;
}) {
  return (
    <div className={cn("flex h-3.5 items-center gap-[3px]", className)}>
      {segments.map((active, index) =>
        active ? (
          <span
            key={index}
            className="h-3.5 w-[3px] shrink-0 rounded-[1px]"
            style={{ backgroundColor: color }}
          />
        ) : (
          <span
            key={index}
            className="flex h-3.5 w-[3px] shrink-0 items-center justify-center"
          >
            <span
              className="h-[2px] w-[3px] rounded-[1px]"
              style={{ backgroundColor: color }}
            />
          </span>
        ),
      )}
    </div>
  );
}

const rowIcons: Record<SparklineTone, ReactNode> = {
  green: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 4h7l3 3v13a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M15 4v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  amber: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  purple: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 5h6l1 2h3v12a2 2 0 01-2 2H7a2 2 0 01-2-2V7h3l1-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export interface DashboardRecordSparklineProps {
  label: string;
  value: string;
  tone?: SparklineTone;
  iconSrc?: string;
  className?: string;
}

export function DashboardRecordSparkline({
  label,
  value,
  tone = "green",
  iconSrc,
  className,
}: DashboardRecordSparklineProps) {
  return (
    <li
      className={cn(
        "flex flex-col gap-2.5 divider-row py-3 md:gap-3 lg:flex-row lg:items-center",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {iconSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconSrc}
            alt=""
            className="h-7 w-7 shrink-0 rounded-md object-cover"
          />
        ) : (
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#2A2A2A] text-[#FDFDFF]">
            {rowIcons[tone]}
          </span>
        )}
        <p className="min-w-0 flex-1 font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
          {label}
        </p>
        <span className="shrink-0 font-sans text-[14px] font-[510] uppercase tabular-nums leading-none tracking-[-0.02em] text-[#FDFDFF] lg:hidden">
          {value}
        </span>
      </div>
      <DashboardStatusSparkline
        segments={sparklineSegments[tone]}
        color={sparklineColors[tone]}
        className="w-full min-w-0 lg:flex-1"
      />
      <span className="hidden w-8 shrink-0 text-right font-sans text-[16px] font-[510] uppercase tabular-nums leading-none tracking-[-0.02em] text-[#FDFDFF] lg:block">
        {value}
      </span>
    </li>
  );
}

export interface DashboardChartLegendItem {
  label: string;
  color: string;
  dashed?: boolean;
}

export function DashboardChartLegend({
  items,
  className,
}: {
  items: DashboardChartLegendItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-4 text-right font-sans text-[9.5px] font-normal uppercase leading-[150%] tracking-[0.02em] text-[#666D80] md:text-[10.6px]",
        className,
      )}
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <i
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              item.dashed && "rounded-[2px] border border-dashed bg-transparent",
            )}
            style={{
              backgroundColor: item.dashed ? "transparent" : item.color,
              borderColor: item.dashed ? item.color : undefined,
            }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/** @deprecated Use DashboardBillingChart */
export function DashboardLineChart({ className }: { className?: string }) {
  return <DashboardBillingChart className={className} />;
}

export interface DashboardMiniBarItem {
  label: string;
  value: number;
  color?: string;
}

export interface DashboardMiniBarListProps {
  items: DashboardMiniBarItem[];
  total?: number;
  className?: string;
}

/** @deprecated Use DashboardRecordSparkline */
export function DashboardMiniBarList({
  items,
  total,
  className,
}: DashboardMiniBarListProps) {
  const max = total ?? items.reduce((sum, item) => sum + item.value, 0);

  return (
    <ul
      className={cn(
        "space-y-2 text-[10px] font-semibold uppercase tracking-[0.06em]",
        className,
      )}
    >
      {items.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex justify-between text-foreground-muted">
            <span>{row.label}</span>
            <span className="text-foreground">{row.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className={cn("h-full", row.color ?? "bg-sky-400")}
              style={{ width: `${max ? (row.value / max) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export type DashboardBarIconName =
  | "clipboard"
  | "truck"
  | "posted"
  | "clock"
  | "eye"
  | "close"
  | "document"
  | "send"
  | "check"
  | "won"
  | "expired";

export interface DashboardHorizontalBarItem {
  label: string;
  value: number;
  /** @deprecated Use tone="critical" */
  highlight?: boolean;
  tone?: "default" | "success" | "critical";
  icon?: DashboardBarIconName;
}

function BarRowIcon({
  name,
  className,
}: {
  name: DashboardBarIconName;
  className?: string;
}) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("h-3.5 w-3.5 shrink-0", className)}
    >
      {name === "clipboard" ? (
        <path
          d="M8 5h8M9 3.5h6v3H9v-3zM7 7h10a1.5 1.5 0 011.5 1.5v11A1.5 1.5 0 0116 21H8a1.5 1.5 0 01-1.5-1.5v-11A1.5 1.5 0 018 7z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ) : null}
      {name === "truck" ? (
        <path
          d="M2 9h11v8H2V9zm11 1.5h3.2l2.8 2.8V17h-6v-4.5zM6 17.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
          fill="currentColor"
        />
      ) : null}
      {name === "posted" || name === "document" ? (
        <path
          d="M8 4h7l3 3v13a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1zM15 4v3h3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ) : null}
      {name === "clock" ? (
        <>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : null}
      {name === "eye" ? (
        <>
          <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        </>
      ) : null}
      {name === "close" || name === "expired" ? (
        <path
          d="M7 7l10 10M17 7L7 17"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      ) : null}
      {name === "send" ? (
        <path
          d="M4 12l16-8-6 16-2.5-6L4 12z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ) : null}
      {name === "check" ? (
        <>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8.5 12l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {name === "won" ? (
        <path
          d="M12 3v2M8 10a4 4 0 118 0c0 2-2 3-2 5h-4c0-2-2-3-2-5zM10 17h4M11 21h2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

function horizontalBarTone(row: DashboardHorizontalBarItem) {
  if (row.tone === "success") return "success";
  if (row.tone === "critical" || row.highlight) return "critical";
  return "default";
}

export interface DashboardHorizontalBarChartProps {
  items: DashboardHorizontalBarItem[];
  maxValue?: number;
  className?: string;
}

export function DashboardHorizontalBarChart({
  items,
  maxValue,
  className,
}: DashboardHorizontalBarChartProps) {
  const max =
    maxValue ?? Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((row) => {
        const tone = horizontalBarTone(row);
        return (
        <li key={row.label} className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex w-[5.25rem] shrink-0 items-center gap-1.5 font-sans text-[10px] font-normal uppercase leading-none tracking-[-0.02em] sm:w-[6.75rem] md:w-[7.25rem] md:text-[11px]",
              tone === "critical" && "text-[#FF4D4D]",
              tone === "success" && "text-[#22C55E]",
              tone === "default" && "text-[#959597]",
            )}
          >
            {row.icon ? (
              <BarRowIcon
                name={row.icon}
                className={cn(
                  tone === "critical" && "text-[#FF4D4D]",
                  tone === "success" && "text-[#22C55E]",
                  tone === "default" && "text-[#959597]",
                )}
              />
            ) : null}
            <span className="truncate">{row.label}</span>
          </span>
          <div className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#2A2A2A]">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                tone === "critical" && "bg-[#FF4D4D]",
                tone === "success" && "bg-[#22C55E]",
                tone === "default" && "bg-[#FDFDFF]",
              )}
              style={{
                width: `${Math.max((row.value / max) * 100, row.value > 0 ? 3 : 0)}%`,
              }}
            />
          </div>
          <span
            className={cn(
              "w-6 shrink-0 text-right font-sans text-[12px] font-[510] uppercase tabular-nums leading-none tracking-[-0.02em] md:text-[14px]",
              tone === "critical" && "text-[#FF4D4D]",
              tone === "success" && "text-[#22C55E]",
              tone === "default" && "text-[#FDFDFF]",
            )}
          >
            {row.value}
          </span>
        </li>
        );
      })}
    </ul>
  );
}

const ORANGE = "#FF9500";

type UnbilledPoint = { label: string; under: number; over: number };

const UNBILLED_POINTS: UnbilledPoint[] = [
  { label: "C09", under: 14, over: 28 },
  { label: "C10", under: 18, over: 36 },
  { label: "C11", under: 10, over: 24 },
  { label: "C12", under: 16, over: 40 },
  { label: "C13", under: 12, over: 32 },
  { label: "C14", under: 15, over: 26 },
];

export interface DashboardUnbilledHoursChartProps {
  className?: string;
}

export function DashboardUnbilledHoursChart({
  className,
}: DashboardUnbilledHoursChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(UNBILLED_POINTS.length - 1);
  const yVals = [50, 40, 30, 20, 10, 0];
  const rowH = (CHART_BOTTOM - CHART_TOP) / 5;
  const scale = 1;

  const underPath = useMemo(
    () => buildPath(UNBILLED_POINTS, "under", scale),
    [],
  );
  const overPath = useMemo(
    () => buildPath(UNBILLED_POINTS, "over", scale),
    [],
  );
  const underFill = useMemo(() => {
    const line = buildPath(UNBILLED_POINTS, "under", scale);
    return `${line} L${CHART_RIGHT} ${CHART_BOTTOM} L${CHART_LEFT} ${CHART_BOTTOM} Z`;
  }, []);

  const active = UNBILLED_POINTS[activeIndex]!;
  const activeX = pointX(activeIndex, UNBILLED_POINTS.length);
  const activeOverY = valueToY(active.over / scale);
  const activeUnderY = valueToY(active.under / scale);

  const onMove = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratioX = (clientX - rect.left) / rect.width;
    const svgX = ratioX * VIEW_W;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < UNBILLED_POINTS.length; i++) {
      const x = pointX(i, UNBILLED_POINTS.length);
      const dist = Math.abs(x - svgX);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    }
    setActiveIndex(nearest);
  }, []);

  const onMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      onMove(event.clientX);
    },
    [onMove],
  );

  const onTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const touch = event.touches[0];
      if (touch) onMove(touch.clientX);
    },
    [onMove],
  );

  const tooltipLeftPct = Math.min(82, Math.max(18, (activeX / VIEW_W) * 100));
  const tooltipTopPct = (activeOverY / VIEW_H) * 100;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-[180px] w-full min-w-0 cursor-crosshair touch-pan-y sm:h-[200px]",
        className,
      )}
      onMouseMove={onMouseMove}
      onTouchStart={onTouchMove}
      onTouchMove={onTouchMove}
    >
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="unbilledUnderFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={RED} stopOpacity="0.5" />
            <stop offset="100%" stopColor={RED} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yVals.map((_, i) => {
          const y = CHART_TOP + i * rowH;
          return (
            <line
              key={`h-${i}`}
              x1={CHART_LEFT}
              y1={y}
              x2={CHART_RIGHT}
              y2={y}
              stroke={GRID}
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          );
        })}

        {yVals.map((val, i) => (
          <text
            key={val}
            x="2"
            y={CHART_TOP + i * rowH + 3}
            fill={MUTED}
            fontSize="8"
            fontFamily="var(--font-sans)"
          >
            {val === 0 ? "00H" : `${val}H`}
          </text>
        ))}

        {UNBILLED_POINTS.map((point, i) => (
          <text
            key={point.label}
            x={pointX(i, UNBILLED_POINTS.length)}
            y="142"
            fill={MUTED}
            fontSize="9"
            fontFamily="var(--font-sans)"
            textAnchor="middle"
          >
            {point.label}
          </text>
        ))}

        <path d={underFill} fill="url(#unbilledUnderFill)" opacity="0.4" />
        <path
          d={underPath}
          fill="none"
          stroke={RED}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={overPath}
          fill="none"
          stroke={ORANGE}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <line
          x1={activeX}
          y1={CHART_TOP}
          x2={activeX}
          y2={CHART_BOTTOM}
          stroke="#3E3E3E"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <circle cx={activeX} cy={activeOverY} r="8" fill={ORANGE} opacity="0.25" />
        <circle
          cx={activeX}
          cy={activeOverY}
          r="4.5"
          fill="#1A1A1A"
          stroke={ORANGE}
          strokeWidth="2.5"
        />
        <circle
          cx={activeX}
          cy={activeUnderY}
          r="3.5"
          fill="#1A1A1A"
          stroke={RED}
          strokeWidth="2"
        />
      </svg>

      <div
        className="pointer-events-none absolute z-10 min-w-[112px] max-w-[min(150px,70vw)] -translate-x-1/2 -translate-y-[110%] rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] px-3 py-2.5 shadow-lg"
        style={{
          left: `${tooltipLeftPct}%`,
          top: `${tooltipTopPct}%`,
        }}
      >
        <p className="text-center font-sans text-[9px] font-medium uppercase tracking-[0.02em] text-[#888888]">
          {active.label}
        </p>
        <div className="divider-line-full my-2 w-full" aria-hidden />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="font-sans text-[10px] tabular-nums text-[#E0E0E0]">
              {active.over}H
            </span>
            <span
              className="font-sans text-[9px] uppercase tracking-[0.02em]"
              style={{ color: ORANGE }}
            >
              Overbilled
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-sans text-[10px] tabular-nums text-[#E0E0E0]">
              {active.under}H
            </span>
            <span
              className="font-sans text-[9px] uppercase tracking-[0.02em]"
              style={{ color: RED }}
            >
              Underbilled
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
