"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "#244B3C", // Forest Green
  "#8BA58C", // Sage
  "#39805B", // Success Green
  "#C77A65", // Terracotta
  "#C39148", // Warm Amber
  "#6366F1", // Indigo
  "#06B6D4", // Cyan
  "#14B8A6", // Teal
];

interface CategoryPieChartProps {
  data: Array<{
    name: string;
    amount: number;
    color?: string;
  }>;
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={85}
            innerRadius={50}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
              borderRadius: "1rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              color: "var(--text-primary)",
              fontSize: "12px",
            }}
            formatter={(val: any) => [
              `₹${parseFloat(val).toLocaleString("en-IN")}`,
              "Spent",
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
