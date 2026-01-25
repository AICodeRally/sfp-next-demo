"use client";

import { Area, AreaChart as RechartsAreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type AreaChartProps = {
  data: number[];
  height?: number;
  stroke?: string;
  fill?: string;
};

export function AreaChart({ data, height = 180, stroke = "#2a6fff", fill = "rgba(42, 111, 255, 0.25)" }: AreaChartProps) {
  if (!data.length) return null;

  const points = data.map((value, index) => ({ index, value }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGradientPrimary" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="index" tick={false} axisLine={false} />
          <YAxis tick={false} axisLine={false} />
          <Tooltip formatter={(value) => (typeof value === "number" ? value.toLocaleString() : value)} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill={fill || "url(#areaGradientPrimary)"}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
