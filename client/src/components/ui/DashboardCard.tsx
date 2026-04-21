import React from 'react';
import type { DashboardCardProps } from '../../types';

const DashboardCard: React.FC<DashboardCardProps> = ({ icon: Icon, title, value, subtitle, color, trend }) => {
  return (
    <div className="group relative bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow border border-slate-200/70">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-600">{title}</p>
          <h3 className="mt-1 text-2xl font-extrabold text-slate-900 truncate">{value}</h3>

          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}

          {trend && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-600">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span>{trend}</span>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 shrink-0"
          style={{ backgroundColor: `${color}12`, color }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
