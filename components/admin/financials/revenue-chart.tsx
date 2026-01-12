"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import recharts to reduce initial bundle size
const LineChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> }
);
const Line = dynamic(() => import("recharts").then((mod) => mod.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((mod) => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });

interface RevenueChartProps {
  data: Array<{
    month: string;
    revenue: number;
    refunds: number;
    netRevenue: number;
  }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((item) => ({
    month: new Date(item.month + "-01").toLocaleDateString("fr-CA", {
      month: "short",
      year: "numeric",
    }),
    "Revenu brut": item.revenue,
    "Remboursements": item.refunds,
    "Revenu net": item.netRevenue,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
        <Legend />
        <Line
          type="monotone"
          dataKey="Revenu brut"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="Remboursements"
          stroke="hsl(var(--destructive))"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="Revenu net"
          stroke="hsl(var(--accent))"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

