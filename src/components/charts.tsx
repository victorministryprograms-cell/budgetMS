"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";

const COLORS = ["#18181b", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8", "#2563eb", "#059669", "#d97706"];

export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <p className="text-xs text-zinc-500">No spending yet.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} label>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip /><Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data }: { data: { month: string; spent: number }[] }) {
  if (data.length === 0) return <p className="text-xs text-zinc-500">No trend data.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip />
        <Line type="monotone" dataKey="spent" stroke="#18181b" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DeptBars({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <p className="text-xs text-zinc-500">No data.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <XAxis dataKey="name" fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip />
        <Bar dataKey="value" fill="#18181b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
