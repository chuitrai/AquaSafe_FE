import React from 'react';

interface StatData {
  title: string;
  value: string;
  unit?: string;
  icon: string;
}

interface StatCardProps {
  data: StatData;
}

export const StatCard: React.FC<StatCardProps> = ({ data }) => {
  const chartColor = '#38A169';

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
        </div>
      </div>

    </div>
  );
};