import { GetDashboardOutputType } from 'zitejs/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { format, parseISO } from 'date-fns';
import { SENTIMENT_COLORS } from './ui-bits';

type D = GetDashboardOutputType;

export function SentimentPie({ data }: { data: D['sentiment'] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
          {data.map((d) => <Cell key={d.name} fill={SENTIMENT_COLORS[d.name] ?? 'hsl(var(--muted))'} />)}
        </Pie>
        <Tooltip /><Legend iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data }: { data: D['trend'] }) {
  const rows = data.map((d) => ({ ...d, label: format(parseISO(d.week), 'MMM d') }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" fontSize={12} tickLine={false} />
        <YAxis fontSize={12} tickLine={false} allowDecimals={false} />
        <Tooltip /><Legend iconType="circle" />
        {(['positive', 'neutral', 'mixed', 'negative'] as const).map((k) => {
          const c = SENTIMENT_COLORS[k[0].toUpperCase() + k.slice(1)];
          return <Area key={k} type="monotone" dataKey={k} stackId="1" stroke={c} fill={c} fillOpacity={0.55} />;
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryChart({ data }: { data: D['categories'] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" fontSize={12} allowDecimals={false} />
        <YAxis type="category" dataKey="name" fontSize={12} width={130} tickLine={false} />
        <Tooltip /><Legend iconType="circle" />
        <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
        <Bar dataKey="negative" name="Negative/Mixed" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
