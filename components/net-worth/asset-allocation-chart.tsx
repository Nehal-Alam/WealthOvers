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

interface AssetAllocationChartProps {
  data: Array<{
    name: string;
    amount: number;
    color: string;
  }>;
}

export function AssetAllocationChart({ data }: AssetAllocationChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={85}
            innerRadius={52}
            paddingAngle={3}
            stroke="var(--surface)"
            strokeWidth={2}
          >
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
              borderRadius: "0.5rem",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
              color: "var(--text-primary)",
              fontSize: "12px",
              padding: "8px 12px",
            }}
            formatter={(val: any) => [
              `₹${parseFloat(val).toLocaleString("en-IN")}`,
              "Valuation",
            ]}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{
              fontSize: "12px",
              paddingTop: "12px",
              color: "var(--text-secondary)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
