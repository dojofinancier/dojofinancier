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

interface EnrollmentChartProps {
  data: Array<{
    courseId: string;
    courseTitle: string;
    count: number;
  }>;
}

export function EnrollmentChart({ data }: EnrollmentChartProps) {
  const chartData = data.map((item) => ({
    course: item.courseTitle.length > 30 ? item.courseTitle.substring(0, 30) + "..." : item.courseTitle,
    inscriptions: item.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="course" angle={-45} textAnchor="end" height={100} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="inscriptions" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
}

