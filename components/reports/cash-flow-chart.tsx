"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CashFlowChartProps {
  data: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.12} stroke="currentColor" />
          <XAxis dataKey="month" fontSize={11} tickLine={false} stroke="currentColor" opacity={0.6} />
          <YAxis fontSize={11} tickLine={false} stroke="currentColor" opacity={0.6} />
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
              "",
            ]}
          />
          <Legend />
          <Bar dataKey="income" name="Income" fill="#39805B" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expense" name="Expenses" fill="#C77A65" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
