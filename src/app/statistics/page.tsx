"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type { Event as CalendarEvent } from "../schedule/types";

type StatsEvent = Omit<CalendarEvent, "start" | "end"> & { start: Date; end: Date };

type LabeledValue = { label: string; value: number };

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function clampToRange(intervalStart: Date, intervalEnd: Date, rangeStart: Date, rangeEnd: Date): [Date, Date] | null {
  const start = new Date(Math.max(intervalStart.getTime(), rangeStart.getTime()));
  const end = new Date(Math.min(intervalEnd.getTime(), rangeEnd.getTime()));
  if (end <= start) return null;
  return [start, end];
}

function hoursBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60));
}

function splitByDayWithinRange(start: Date, end: Date, rangeStart: Date, rangeEnd: Date): Array<{ day: number; hours: number }> {
  const result: Array<{ day: number; hours: number }> = [];
  const clamped = clampToRange(start, end, rangeStart, rangeEnd);
  if (!clamped) return result;
  let [s, e] = clamped;
  let cursor = new Date(s);
  while (cursor < e) {
    const dayEnd = endOfDay(cursor);
    const segmentEnd = new Date(Math.min(dayEnd.getTime(), e.getTime()));
    const hours = hoursBetween(cursor, segmentEnd);
    result.push({ day: cursor.getDay(), hours });
    cursor = new Date(dayEnd.getTime() + 1);
  }
  return result;
}

function splitByHourWithinRange(start: Date, end: Date, rangeStart: Date, rangeEnd: Date): Array<{ hour: number; hours: number }> {
  const result: Array<{ hour: number; hours: number }> = [];
  const clamped = clampToRange(start, end, rangeStart, rangeEnd);
  if (!clamped) return result;
  let [s, e] = clamped;
  let cursor = new Date(s);
  while (cursor < e) {
    const hourEnd = new Date(cursor);
    hourEnd.setMinutes(59, 59, 999);
    const segmentEnd = new Date(Math.min(hourEnd.getTime(), e.getTime()));
    const hours = hoursBetween(cursor, segmentEnd);
    result.push({ hour: cursor.getHours(), hours });
    cursor = new Date(hourEnd.getTime() + 1);
  }
  return result;
}

function formatHours(h: number): string {
  if (h >= 10) return `${Math.round(h)}`;
  if (h >= 1) return `${h.toFixed(1)}`;
  return `${(h * 60) | 0}m`;
}

function extractDomain(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export default function StatisticsPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/auth/login");
    },
  });

  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return startOfDay(d);
  });
  const [endDate, setEndDate] = useState<Date>(() => endOfDay(new Date()));
  const [events, setEvents] = useState<StatsEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    // Build CSV for current events in selected range
    const escapeCsv = (value: string) => {
      const v = value ?? "";
      if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
      return v;
    };

    const rows: string[] = [];
    rows.push([
      "Title",
      "Start",
      "End",
      "DurationHours",
      "DayOfWeek",
      "Date",
      "StartTime",
      "EndTime",
      "FirstLink",
      "AllLinks"
    ].join(","));

    for (const ev of events) {
      const start = new Date(ev.start);
      const end = new Date(ev.end);
      const durationHours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dateStr = start.toISOString().slice(0, 10);
      const time = (d: Date) => d.toTimeString().slice(0, 8);
      const firstLink = Array.isArray(ev.links) && ev.links.length > 0 ? ev.links[0] : "";
      const allLinks = Array.isArray(ev.links) ? ev.links.join(" ") : "";

      rows.push([
        escapeCsv(ev.title || "Untitled"),
        escapeCsv(start.toISOString()),
        escapeCsv(end.toISOString()),
        String(durationHours.toFixed(2)),
        dayNames[start.getDay()],
        dateStr,
        time(start),
        time(end),
        escapeCsv(firstLink),
        escapeCsv(allLinks)
      ].join(","));
    }

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const startName = startOfDay(startDate).toISOString().slice(0, 10);
    const endName = endOfDay(endDate).toISOString().slice(0, 10);
    a.href = url;
    a.download = `schedule-export_${startName}_to_${endName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    const controller = new AbortController();
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `/api/events?start=${encodeURIComponent(startOfDay(startDate).toISOString())}&end=${encodeURIComponent(endOfDay(endDate).toISOString())}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch events");
        const data = await res.json();
        const parsed: StatsEvent[] = (data || []).map((e: any) => ({
          id: String(e.id),
          title: e.title || "Untitled",
          start: new Date(e.start),
          end: new Date(e.end),
          links: Array.isArray(e.links) ? e.links : undefined,
        }));
        setEvents(parsed);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Error loading events");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
    return () => controller.abort();
  }, [status, startDate, endDate]);

  const rangeStart = useMemo(() => startOfDay(startDate), [startDate]);
  const rangeEnd = useMemo(() => endOfDay(endDate), [endDate]);

  const stats = useMemo(() => {
    if (events.length === 0) {
      return {
        totalHours: 0,
        eventCount: 0,
        avgHoursPerDay: 0,
        busiestDayLabel: "—",
        titles: [] as LabeledValue[],
        domains: [] as LabeledValue[],
        days: new Array(7).fill(0) as number[],
        hours: new Array(24).fill(0) as number[],
      };
    }

    const dayTotals = new Array(7).fill(0) as number[];
    const hourTotals = new Array(24).fill(0) as number[];
    const byTitle = new Map<string, { label: string; value: number }>();
    const byDomain = new Map<string, number>();

    let totalHours = 0;

    for (const ev of events) {
      const clamped = clampToRange(ev.start, ev.end, rangeStart, rangeEnd);
      if (!clamped) continue;
      const [s, e] = clamped;
      const duration = hoursBetween(s, e);
      if (duration <= 0) continue;
      totalHours += duration;

      // Title aggregation (case-insensitive key, preserve display label)
      const t = (ev.title || "Untitled").trim();
      const titleKey = t.toLowerCase();
      const existingTitle = byTitle.get(titleKey);
      if (existingTitle) {
        existingTitle.value += duration;
      } else {
        byTitle.set(titleKey, { label: t, value: duration });
      }

      // Domain aggregation (first link domain if present)
      if (Array.isArray(ev.links) && ev.links.length > 0) {
        const d = extractDomain(ev.links[0]);
        if (d) byDomain.set(d, (byDomain.get(d) || 0) + duration);
      }

      // Day-of-week split
      for (const seg of splitByDayWithinRange(ev.start, ev.end, rangeStart, rangeEnd)) {
        dayTotals[seg.day] += seg.hours;
      }

      // Hour-of-day split
      for (const seg of splitByHourWithinRange(ev.start, ev.end, rangeStart, rangeEnd)) {
        hourTotals[seg.hour] += seg.hours;
      }
    }

    const titles: LabeledValue[] = Array.from(byTitle.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const domains: LabeledValue[] = Array.from(byDomain.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Average hours per day across selected range
    const daysInRange = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)));
    const avgHoursPerDay = totalHours / daysInRange;

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let busiestDayIndex = 0;
    for (let i = 1; i < 7; i++) {
      if (dayTotals[i] > dayTotals[busiestDayIndex]) busiestDayIndex = i;
    }
    const busiestDayLabel = dayTotals[busiestDayIndex] > 0 ? dayNames[busiestDayIndex] : "—";

    return {
      totalHours,
      eventCount: events.length,
      avgHoursPerDay,
      busiestDayLabel,
      titles,
      domains,
      days: dayTotals,
      hours: hourTotals,
    };
  }, [events, rangeStart, rangeEnd]);

  const totalForTitles = useMemo(() => stats.titles.reduce((s, d) => s + d.value, 0), [stats.titles]);
  const totalForDomains = useMemo(() => stats.domains.reduce((s, d) => s + d.value, 0), [stats.domains]);
  const maxDay = useMemo(() => Math.max(1, ...stats.days), [stats.days]);
  const maxHour = useMemo(() => Math.max(1, ...stats.hours), [stats.hours]);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="h-screen overflow-y-auto md:overflow-hidden w-full bg-white dark:bg-dark-background dark:text-dark-textPrimary pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col items-center justify-center gap-1 mb-3 md:mb-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-dark-textPrimary text-center">Schedule Statistics</h1>
          <p className="text-xs md:text-sm italic text-gray-600 dark:text-dark-textSecondary text-center">Track your Time</p>
        </div>

        {/* Controls */}
        <div className="mb-3 md:mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-dark-paper border border-gray-200 dark:border-dark-divider rounded-lg px-3 py-2">
            <label className="text-xs text-gray-600 dark:text-dark-textSecondary">Start</label>
            <input
              type="date"
              className="flex-1 bg-transparent outline-none text-sm"
              value={startOfDay(startDate).toISOString().slice(0, 10)}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setStartDate(startOfDay(d));
              }}
            />
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-dark-paper border border-gray-200 dark:border-dark-divider rounded-lg px-3 py-2">
            <label className="text-xs text-gray-600 dark:text-dark-textSecondary">End</label>
            <input
              type="date"
              className="flex-1 bg-transparent outline-none text-sm"
              value={startOfDay(endDate).toISOString().slice(0, 10)}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setEndDate(endOfDay(d));
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 bg-white dark:bg-dark-paper border border-gray-200 dark:border-dark-divider rounded-lg px-3 py-2">
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                className="px-2.5 py-1 rounded-md border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition"
                onClick={() => setStartDate(startOfDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)))}
                title="Last 7 days"
              >
                Last 7d
              </button>
              <button
                className="px-2.5 py-1 rounded-md border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition"
                onClick={() => setStartDate(startOfDay(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)))}
                title="Last 30 days"
              >
                Last 30d
              </button>
              <button
                className="px-2.5 py-1 rounded-md border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition"
                onClick={() => setStartDate(startOfDay(new Date(new Date().getFullYear(), 0, 1)))}
                title="Year to date"
              >
                YTD
              </button>
              <button
                className="px-2.5 py-1 rounded-md border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition"
                onClick={() => setEndDate(endOfDay(new Date()))}
                title="Set End to Today"
              >
                Today
              </button>
            </div>
            <button
              className="text-xs md:text-sm px-3 py-1.5 rounded-md border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 transition"
              onClick={handleExport}
              title="Export events to CSV"
            >
              Export
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-3 mb-3 md:mb-4">
          <SummaryCard title="Total Hours" value={`${formatHours(stats.totalHours)}h`} subtext="In selected range" />
          <SummaryCard title="Events" value={`${stats.eventCount}`} subtext="Count of events" />
          <SummaryCard title="Avg / Day" value={`${stats.avgHoursPerDay.toFixed(1)}h`} subtext="Average hours" />
          <SummaryCard title="Busiest Day" value={stats.busiestDayLabel} subtext="By total time" />
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-500">{error}</div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          <div className="lg:col-span-2">
            <Card title="Top Titles">
              {stats.titles.length === 0 ? (
                <EmptyState />
              ) : (
                <HorizontalBarChart data={stats.titles} total={totalForTitles} />
              )}
            </Card>
          </div>

          <Card title="Time by Weekday">
            <ColumnChart labels={dayLabels} values={stats.days} maxValue={maxDay} />
          </Card>
          <Card title="Time by Hour">
            <ColumnChart labels={Array.from({ length: 24 }, (_, i) => `${i}`)} values={stats.hours} maxValue={maxHour} dense />
          </Card>
        </div>

        {loading && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
            <div className="rounded-full bg-white/70 dark:bg-dark-paper/70 p-3 shadow-sm">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-600 dark:text-dark-textSecondary" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard(props: { title: string; value: string; subtext?: string }) {
  const { title, value, subtext } = props;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-dark-divider bg-white dark:bg-dark-paper p-4">
      <div className="text-xs text-gray-600 dark:text-dark-textSecondary mb-1">{title}</div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {subtext ? (
        <div className="mt-1 text-xs text-gray-500 dark:text-dark-textDisabled">{subtext}</div>
      ) : null}
    </div>
  );
}

function Card(props: { title: string; children: any }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-dark-divider bg-white dark:bg-dark-paper p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-textPrimary">{props.title}</h2>
      </div>
      {props.children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-24 flex items-center justify-center text-sm text-gray-500 dark:text-dark-textSecondary">
      No data available in this range
    </div>
  );
}

function HorizontalBarChart(props: { data: LabeledValue[]; total: number }) {
  const { data, total } = props;
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const pct = total > 0 ? d.value / total : 0;
        return (
          <div key={d.label} className="">
            <div className="flex justify-between text-xs mb-1">
              <span className="truncate pr-2 text-gray-700 dark:text-dark-textPrimary">{d.label}</span>
              <span className="text-gray-500 dark:text-dark-textSecondary">{formatHours(d.value)}h</span>
            </div>
            <div className="h-2.5 w-full rounded-md bg-gray-100 dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${Math.max(2, Math.round(pct * 100))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ColumnChart(props: { labels: string[]; values: number[]; maxValue: number; dense?: boolean }) {
  const { labels, values, maxValue, dense } = props;
  return (
    <div className="w-full">
      <div className="h-36 md:h-44 flex items-end gap-1.5">
        {values.map((v, i) => {
          const hPct = maxValue > 0 ? (v / maxValue) * 100 : 0;
          return (
            <div key={i} className="flex-1 h-full flex flex-col items-center" title={`${formatHours(v)}h`}>
              <div className="w-full h-full rounded-md bg-gray-100 dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider relative group">
                <div
                  className="w-full bg-blue-500 absolute bottom-0 left-0 right-0"
                  style={{ height: `${Math.max(2, Math.round(hPct))}%` }}
                />
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition text-[10px] md:text-xs bg-gray-800 text-white px-1.5 py-0.5 rounded shadow-sm pointer-events-none">
                  {formatHours(v)}h
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
        {labels.map((l, i) => (
          <div key={i} className={`text-[10px] md:text-xs text-center text-gray-500 dark:text-dark-textSecondary ${dense ? "" : "truncate"}`}>{l}</div>
        ))}
      </div>
    </div>
  );
}


