import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, Coins, DollarSign, RefreshCcw, ShoppingBag, TrendingUp, Wallet } from 'lucide-react';
import { API_BASE_URL } from '../../../api/apiConfig';
import agriFarmImage from '../../../assets/agriculture-farm-land-countryside-aerial-view-green-5120x2880-3985.jpg';
import farmlandImage from '../../../assets/farmland.jpg';
import grainImage from '../../../assets/grain.jpg';
import lettuceImage from '../../../assets/lettuce.jpg';

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
      if (!earnRes.ok || !orderRes.ok) throw new Error('Failed to load earnings data.');
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

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="relative overflow-hidden bg-[#0d1a07] rounded-3xl p-8 md:p-10 text-white mb-8 shadow-2xl border border-white/10 group">
          <img src={agriFarmImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 transition-transform duration-[10s] group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d1a07] via-[#0d1a07]/60 to-transparent" />
          <div className="relative z-10 py-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#d4ff8a] animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.25em] text-green-50/90 font-black">Finance Center</p>
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tighter drop-shadow-2xl">
              Earnings & <span className="text-[#d4ff8a]">Performance</span>
            </h1>
            <p className="text-green-50/80 mt-4 max-w-xl text-sm md:text-base font-medium leading-relaxed">
              Track your farm's growth, monitor revenue trends, and review your successful marketplace transactions.
            </p>
          </div>
        </div>

        <div className="mb-5 flex justify-end">
          <button
            onClick={fetchData}
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Total Earnings', value: `₱${Number(summary.total_earnings || 0).toLocaleString()}`, icon: Wallet, img: agriFarmImage, ring: 'ring-green-500/20', sub: 'All-time revenue' },
                { label: 'This Month', value: `₱${thisMonthTotal.toLocaleString()}`, icon: CalendarDays, img: grainImage, ring: 'ring-amber-500/20', sub: 'Monthly performance' },
                { label: 'Avg Order Value', value: `₱${Math.round(avgOrderValue).toLocaleString()}`, icon: TrendingUp, img: lettuceImage, ring: 'ring-emerald-500/20', sub: 'Successful sales' },
              ].map((stat) => (
                <div key={stat.label} className={`relative overflow-hidden rounded-[2rem] bg-[#0f240f] border border-white/10 p-6 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] ring-1 ${stat.ring} group ${loading ? 'animate-pulse' : ''}`}>
                  <div className="absolute inset-0 z-0 opacity-20 transition-transform duration-700 group-hover:scale-125">
                    <img src={stat.img} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 transition-transform group-hover:rotate-12">
                      <stat.icon className="w-6 h-6 text-[#d4ff8a]" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-[0.15em] text-green-50/60 mb-1">{stat.label}</p>
                    {loading ? (
                      <div className="h-8 bg-white/10 rounded w-1/2" />
                    ) : (
                      <p className="text-3xl font-black tracking-tight drop-shadow-md">{stat.value}</p>
                    )}
                    <p className="text-[10px] text-green-50/40 mt-3 font-bold uppercase tracking-widest">{stat.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl shadow-black/[0.03] overflow-hidden p-2">
              <div className="px-6 py-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Transaction History</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Recent successful sales</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">{completedOrders.length} Completed</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto rounded-3xl">
                <table className="w-full text-left border-separate border-spacing-y-2 px-4">
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
                          <td className="py-4 px-4 bg-gray-50/50 rounded-l-2xl border-y border-l border-white shadow-sm">
                            <div className="h-4 bg-gray-200 rounded w-24" />
                          </td>
                          <td className="py-4 px-4 bg-gray-50/50 border-y border-white shadow-sm">
                            <div className="h-4 bg-gray-200 rounded w-32" />
                          </td>
                          <td className="py-4 px-4 bg-gray-50/50 border-y border-white shadow-sm">
                            <div className="h-4 bg-gray-200 rounded w-28" />
                          </td>
                          <td className="py-4 px-4 bg-gray-50/50 border-y border-white shadow-sm">
                            <div className="h-4 bg-gray-200 rounded w-16" />
                          </td>
                          <td className="py-4 px-4 bg-gray-50/50 rounded-r-2xl border-y border-r border-white shadow-sm text-right">
                            <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
                          </td>
                        </tr>
                      ))
                    ) : completedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-24 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest bg-gray-50/50 rounded-2xl">No sales recorded in the system</td>
                      </tr>
                    ) : (
                      completedOrders.map((o) => (
                        <tr key={o.req_id} className="group hover:bg-gray-50 transition-all duration-300 cursor-pointer">
                          <td className="py-5 px-4 rounded-l-2xl border-y border-l border-transparent group-hover:border-gray-100">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-tighter bg-gray-50 px-2.5 py-1 rounded-lg">{new Date(o.req_date).toLocaleDateString()}</span>
                          </td>
                          <td className="py-5 px-4 border-y border-transparent group-hover:border-gray-100">
                            <p className="text-sm font-black text-gray-900 group-hover:text-emerald-700 transition-colors uppercase italic">{o.p_name}</p>
                          </td>
                          <td className="py-5 px-4 border-y border-transparent group-hover:border-gray-100">
                            <p className="text-sm font-bold text-gray-600">{o.buyer_first} {o.buyer_last}</p>
                          </td>
                          <td className="py-5 px-4 border-y border-transparent group-hover:border-gray-100">
                            <p className="text-sm font-black text-gray-500 italic">{o.quantity} <span className="text-[10px] uppercase font-bold not-italic">{o.p_unit}</span></p>
                          </td>
                          <td className="py-5 px-4 border-y border-r border-transparent group-hover:border-gray-100 rounded-r-2xl text-right">
                            <p className="text-[15px] font-black text-emerald-600 drop-shadow-sm">₱{(Number(o.quantity || 0) * Number(o.p_price || 0)).toLocaleString()}</p>
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
