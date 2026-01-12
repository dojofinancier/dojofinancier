"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import recharts to reduce initial bundle size
const BarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> }
);
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((mod) => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });

interface RevenueByCourseChartProps {
  data: Array<{
    title: string;
    revenue: number;
  }>;
}

export function RevenueByCourseChart({ data }: RevenueByCourseChartProps) {
  const chartData = data
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((item) => ({
      course: item.title.length > 30 ? item.title.substring(0, 30) + "..." : item.title,
      revenue: item.revenue,
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="course" type="category" width={150} />
        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
        <Legend />
        <Bar dataKey="revenue" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
}

