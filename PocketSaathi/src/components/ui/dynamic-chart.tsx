"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface DynamicChartProps {
  type: "area" | "bar" | "pie";
  data: any[];
  dataKeys: string[]; // for Area/Bar, e.g. ["balance"] or ["income", "expense"]
  colors?: string[]; // hex or theme variable names
  height?: number;
}

export const DynamicChart: React.FC<DynamicChartProps> = ({
  type,
  data,
  dataKeys,
  colors = ["#3b82f6", "#ef4444", "#10b981"],
  height = 300,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center bg-muted/10 rounded-xl animate-pulse"
      >
        <span className="text-muted-foreground text-sm">Loading analytics...</span>
      </div>
    );
  }

  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 rounded-lg border border-border text-xs shadow-xl">
          <p className="font-semibold text-foreground mb-1">{payload[0].payload.name || payload[0].payload.date}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mt-0.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-foreground">
                ₹{entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (type === "area") {
    return (
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.4} />
                <stop offset="95%" stopColor={colors[0]} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
            />
            <Tooltip content={renderTooltip} />
            <Area
              type="monotone"
              dataKey={dataKeys[0]}
              stroke={colors[0]}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#areaColor)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "bar") {
    return (
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="date"
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
            />
            <Tooltip content={renderTooltip} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px" }}
            />
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index] || "#3b82f6"}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "pie") {
    return (
      <div style={{ width: "100%", height }} className="flex flex-col items-center justify-center">
        <ResponsiveContainer width="100%" height={height - 40}>
          <PieChart margin={{ top: 0, bottom: 0 }}>
            <Tooltip content={renderTooltip} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 max-w-full px-4">
          {data.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span>{entry.name} ({Math.round(entry.percentage)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
