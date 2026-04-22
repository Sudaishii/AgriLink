import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Leaf, RefreshCcw, ShoppingBag, TrendingUp, Wallet } from 'lucide-react';
import { API_BASE_URL } from '../../../api/apiConfig';

const FarmerEarningsPageV2: React.FC = () => {
  const [summary, setSummary] = useState<any>({ total_earnings: 0 });
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userId = localStorage.getItem('agrilink_id');

  const fetchData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('agrilink_token');
      const [earnRes, orderRes] = await Promise.all([
        fetch(`${API_BASE_URL}/purchases/earnings/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/purchases/farmer/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const earnData = await earnRes.json();
      const orderData = await orderRes.json();

      if (!earnRes.ok || !orderRes.ok) {
        throw new Error('Failed to load earnings data.');
      }

      setSummary(earnData.summary || { total_earnings: 0 });
      setCompletedOrders((orderData.orders || []).filter((o: any) => o.req_status === 'Completed'));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load earnings data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const thisMonthTotal = useMemo(() => {
    const now = new Date();
    return completedOrders
      .filter((o) => {
        const d = new Date(o.req_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, o) => sum + Number(o.quantity || 0) * Number(o.p_price || 0), 0);
  }, [completedOrders]);

  const avgOrderValue = useMemo(() => {
    if (!completedOrders.length) return 0;
    const total = completedOrders.reduce((sum, o) => sum + Number(o.quantity || 0) * Number(o.p_price || 0), 0);
    return total / completedOrders.length;
  }, [completedOrders]);

  const monthlyCompletedOrders = useMemo(() => {
    const now = new Date();
    return completedOrders.filter((o) => {
      const d = new Date(o.req_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [completedOrders]);

  const stats = [
    {
      title: 'Total Revenue',
      value: `PHP ${Number(summary.total_earnings || 0).toLocaleString()}`,
      subtitle: 'All-time earnings',
      icon: Wallet,
      tone: 'green',
    },
    {
      title: 'This Month',
      value: `PHP ${thisMonthTotal.toLocaleString()}`,
      subtitle: 'Current month revenue',
      icon: CalendarDays,
      tone: 'amber',
    },
    {
      title: 'Avg Order Value',
      value: `PHP ${Math.round(avgOrderValue).toLocaleString()}`,
      subtitle: 'Per completed order',
      icon: TrendingUp,
      tone: 'green',
    },
    {
      title: 'Completed Orders',
      value: completedOrders.length.toLocaleString(),
      subtitle: `${monthlyCompletedOrders} completed this month`,
      icon: CheckCircle2,
      tone: 'green',
    },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <div className="max-w-[1600px] mx-auto px-4 pt-10 pb-8">
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-white mb-8 shadow-xl border border-emerald-300/30 bg-gradient-to-r from-[#0f2f0f] via-[#1f5c1b] to-[#2f7a24]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_45%)]" />
          <div className="absolute -bottom-8 left-0 w-[60%] h-24 rounded-[100%] bg-[#b9e57a]/20 blur-xl" />
          <div className="absolute -bottom-10 right-0 w-[52%] h-24 rounded-[100%] bg-[#86c640]/20 blur-xl" />
          <div className="relative z-10">
            <p className="text-[11px] uppercase tracking-[0.22em] text-green-100/90 font-semibold mb-2">AgriLink Farmer</p>
            <h1 className="text-3xl md:text-4xl font-black leading-tight">Earnings & Performance</h1>
            <p className="text-white/90 mt-2 max-w-2xl">Track revenue, monitor order outcomes, and review farm sales performance in real time.</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-black text-gray-900">Earnings Overview</h2>
            <p className="text-gray-500 mt-1">Review revenue metrics and completed sales transactions.</p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors w-fit"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md min-h-[170px] ${
                stat.tone === 'amber'
                  ? 'border-amber-200 bg-gradient-to-br from-white via-white to-amber-50'
                  : 'border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50'
              }`}
            >
              <div className="absolute inset-y-0 -right-8 w-1/2 flex items-center justify-end opacity-12 pointer-events-none">
                <Leaf className={`w-36 h-36 ${stat.tone === 'amber' ? 'text-amber-500' : 'text-emerald-600'}`} />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center mb-5 shadow-sm">
                    <stat.icon className={`w-6 h-6 ${stat.tone === 'amber' ? 'text-amber-600' : 'text-emerald-700'}`} />
                  </div>
                  <p className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
                    stat.tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {stat.title}
                  </p>
                </div>
                <div className="mt-4">
                  {loading ? (
                    <div className="h-10 w-24 rounded bg-gray-200 animate-pulse" />
                  ) : (
                    <p className={`text-[32px] md:text-[34px] leading-none font-black tracking-tight ${stat.tone === 'amber' ? 'text-amber-700' : 'text-emerald-800'}`}>
                      {stat.value}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-2 font-bold tracking-wide">{stat.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900">Transaction History</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Recent completed orders</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">{completedOrders.length} Completed</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  <th className="pb-4 px-4">Timeline</th>
                  <th className="pb-4 px-4">Product Details</th>
                  <th className="pb-4 px-4">Buyer Entity</th>
                  <th className="pb-4 px-4">Volume</th>
                  <th className="pb-4 px-4 text-right">Net Revenue</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4 bg-gray-50 rounded-l-2xl border border-gray-100 border-r-0"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                      <td className="py-4 px-4 bg-gray-50 border-y border-gray-100"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                      <td className="py-4 px-4 bg-gray-50 border-y border-gray-100"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                      <td className="py-4 px-4 bg-gray-50 border-y border-gray-100"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                      <td className="py-4 px-4 bg-gray-50 rounded-r-2xl border border-gray-100 border-l-0 text-right"><div className="h-4 bg-gray-200 rounded w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : completedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest bg-gray-50 rounded-2xl">No sales recorded in the system</td>
                  </tr>
                ) : (
                  completedOrders.map((o) => (
                    <tr key={o.req_id} className="group hover:bg-gray-50 transition-all duration-300">
                      <td className="py-5 px-4 rounded-l-2xl border border-gray-100 border-r-0 group-hover:bg-emerald-50/40">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-tighter bg-gray-50 px-2.5 py-1 rounded-lg">{new Date(o.req_date).toLocaleDateString()}</span>
                      </td>
                      <td className="py-5 px-4 border-y border-gray-100 group-hover:bg-emerald-50/40">
                        <p className="text-sm font-black text-gray-900 group-hover:text-emerald-700 transition-colors uppercase italic">{o.p_name}</p>
                      </td>
                      <td className="py-5 px-4 border-y border-gray-100 group-hover:bg-emerald-50/40">
                        <p className="text-sm font-bold text-gray-600">{o.buyer_first} {o.buyer_last}</p>
                      </td>
                      <td className="py-5 px-4 border-y border-gray-100 group-hover:bg-emerald-50/40">
                        <p className="text-sm font-black text-gray-500 italic">{o.quantity} <span className="text-[10px] uppercase font-bold not-italic">{o.p_unit}</span></p>
                      </td>
                      <td className="py-5 px-4 border border-gray-100 border-l-0 rounded-r-2xl text-right group-hover:bg-emerald-50/40">
                        <p className="text-[15px] font-black text-emerald-600">PHP {(Number(o.quantity || 0) * Number(o.p_price || 0)).toLocaleString()}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerEarningsPageV2;
