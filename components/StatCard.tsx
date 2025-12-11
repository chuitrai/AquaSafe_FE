import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface StatData {
  title: string;
  value: string;
  unit?: string;
  change: number;
  trend: string;
  icon: string;
}

interface StatCardProps {
  data: StatData;
}

export const StatCard: React.FC<StatCardProps> = ({ data }) => {
  // Generate mock data based on title to make charts look different
  const chartData = useMemo(() => {
    const points = 15;
    const seed = data.title.length; 
    return Array.from({ length: points }, (_, i) => ({
      value: Math.abs(Math.sin(i + seed) * 50 + 20 + (Math.random() * 20)),
    }));
  }, [data.title]);

  // Contextual color logic
  let trendColor = 'text-success';
  let trendIcon = 'arrow_downward'; // Default valid "good" trend icon for Flood Level
  
  // "Mức độ ngập" (Flood level): Down is Good (Success), Up is Bad (Danger)
  if (data.title.includes('ngập')) {
    if (data.trend === 'up') {
      trendColor = 'text-danger';
      trendIcon = 'arrow_upward';
    } else {
      trendColor = 'text-success';
      trendIcon = 'arrow_downward';
    }
  } 
  // "Dân số" (Population affected): Up is Bad (Danger), Down is Good (Success)
  else if (data.title.includes('Dân số')) {
    if (data.trend === 'up') {
      trendColor = 'text-danger';
      trendIcon = 'arrow_upward';
    } else {
      trendColor = 'text-success';
      trendIcon = 'arrow_downward';
    }
  }
  // "Cứu trợ" (Relief/Food): Up is Good (Success), Down is Bad (Danger)
  else {
    if (data.trend === 'up') {
      trendColor = 'text-success';
      trendIcon = 'arrow_upward';
    } else {
      trendColor = 'text-danger'; // Assuming dropping relief is bad? Or maybe neutral. keeping it simple.
      trendIcon = 'arrow_downward';
    }
  }

  const chartColor = trendColor.includes('success') ? '#38A169' : '#E53E3E';

  return (
    <div className="flex flex-col rounded-xl border border-border-color bg-white p-4 shadow-sm hover:shadow-md transition-all h-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
            <span className="material-symbols-outlined !text-[20px]">{data.icon}</span>
          </div>
          <h3 className="text-sm font-semibold text-text-secondary line-clamp-2" title={data.title}>
            {data.title}
          </h3>
        </div>
      </div>

      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-text-primary">{data.value}</p>
            {data.unit && <span className="text-sm text-text-secondary font-medium">{data.unit}</span>}
          </div>
          <p className={`flex items-center text-xs font-bold ${trendColor} mt-1`}>
            <span className="material-symbols-outlined !text-sm mr-0.5">
              {trendIcon}
            </span>
            <span>{data.change}% so với hôm qua</span>
          </p>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="h-14 w-full mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`color-${data.icon}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={chartColor} 
              strokeWidth={2} 
              fillOpacity={1} 
              fill={`url(#color-${data.icon})`} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};