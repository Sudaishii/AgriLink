import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, RefreshCcw, AlertCircle, ShoppingBag, CreditCard, PieChart } from 'lucide-react';
import { API_BASE_URL } from '../../../api/apiConfig';

const FarmerEarningsPage: React.FC = () => {
    const [earnings, setEarnings] = useState<any>({ total_earnings: 0 });
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const userId = localStorage.getItem('agrilink_id');

    const fetchData = async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const token = localStorage.getItem('agrilink_token');
            const [earnRes, orderRes] = await Promise.all([
                fetch(`${API_BASE_URL}/purchases/earnings/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/purchases/farmer/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const earnData = await earnRes.json();
            const orderData = await orderRes.json();

            if (earnRes.ok) setEarnings(earnData.summary);
            if (orderRes.ok) setOrders(orderData.orders.filter((o: any) => o.req_status === 'Completed'));
        } catch (err) {
            setError('Failed to load financial data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userId]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F9FBE7] to-white pb-20 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                    <div className="animate-fadeIn">
                        <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">Earnings Summary<span className="text-[#5ba409]">.</span></h1>
                        <p className="text-xl text-gray-400 font-medium italic">Track your revenue and financial growth</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-[#5ba409] transition-all shadow-sm active:scale-90"
                    >
                        <RefreshCcw className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {error && (
                    <div className="mb-10 p-6 bg-red-50 border-2 border-red-100 rounded-3xl flex items-center gap-4">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        <p className="font-bold text-red-800">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="py-40 flex flex-col items-center gap-6">
                        <RefreshCcw className="w-16 h-16 text-[#5ba409] animate-spin" />
                        <p className="font-black text-gray-300 uppercase tracking-[0.3em] text-sm italic text-center">Crunching numbers...</p>
                    </div>
                ) : (
                    <div className="space-y-12">

                        {/* Primary Metrics */}
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="bg-white rounded-[3rem] p-10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] border border-gray-50 flex flex-col justify-between group">
                                <div>
                                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#5ba409] group-hover:text-white transition-all">
                                        <DollarSign className="w-8 h-8 text-[#5ba409] group-hover:text-white" />
                                    </div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Combined Earnings</p>
                                    <h2 className="text-5xl font-black text-gray-900 italic tracking-tighter">₱{Number(earnings.total_earnings || 0).toLocaleString()}</h2>
                                </div>
                                <div className="mt-8 flex items-center gap-2 text-green-600 font-bold">
                                    <ArrowUpRight className="w-5 h-5" />
                                    <span>+12.5% vs last month</span>
                                </div>
                            </div>

                            <div className="bg-gray-900 rounded-[3rem] p-10 shadow-2xl flex flex-col justify-between">
                                <div>
                                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                                        <ShoppingBag className="w-8 h-8 text-[#5ba409]" />
                                    </div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Completed Sales</p>
                                    <h2 className="text-5xl font-black text-white italic tracking-tighter">{orders.length}</h2>
                                </div>
                                <p className="mt-8 text-gray-400 font-medium">Successfully delivered harvests</p>
                            </div>

                            <div className="bg-[#5ba409] rounded-[3rem] p-10 shadow-[0_30px_60px_-15px_rgba(91,164,9,0.3)] flex flex-col justify-between">
                                <div>
                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                                        <CreditCard className="w-8 h-8 text-white" />
                                    </div>
                                    <p className="text-xs font-black text-green-100 uppercase tracking-[0.2em] mb-2">Payout Method</p>
                                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase underline decoration-2 underline-offset-8">Direct Transfer</h2>
                                </div>
                                <div className="mt-8 flex items-center gap-2 text-white font-bold">
                                    <CheckCircle className="w-5 h-5" />
                                    <span>Verified & Connected</span>
                                </div>
                            </div>
                        </div>

                        {/* Sales Table */}
                        <div className="bg-white rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
                            <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="text-2xl font-black text-gray-900 italic tracking-tighter">Transaction History</h3>
                                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-6 py-3 rounded-2xl">
                                    <PieChart className="w-4 h-4" /> Export Report
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="py-6 px-10 font-black text-[10px] text-gray-400 uppercase tracking-[0.2em]">Purchase Details</th>
                                            <th className="py-6 px-10 font-black text-[10px] text-gray-400 uppercase tracking-[0.2em]">Buyer</th>
                                            <th className="py-6 px-10 font-black text-[10px] text-gray-400 uppercase tracking-[0.2em]">Quantity</th>
                                            <th className="py-6 px-10 font-black text-[10px] text-gray-400 uppercase tracking-[0.2em] text-right">Income Generated</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {orders.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-32 text-center">
                                                    <h4 className="text-gray-300 font-black uppercase text-sm tracking-widest italic">No financial history yet</h4>
                                                </td>
                                            </tr>
                                        ) : (
                                            orders.map((o) => (
                                                <tr key={o.req_id} className="group hover:bg-gray-50/50 transition-colors">
                                                    <td className="py-8 px-10">
                                                        <p className="font-black text-gray-900 text-lg tracking-tighter italic mb-0.5">{o.p_name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date(o.req_date).toLocaleDateString()}</p>
                                                    </td>
                                                    <td className="py-8 px-10">
                                                        <p className="font-bold text-gray-600">{o.buyer_first} {o.buyer_last}</p>
                                                    </td>
                                                    <td className="py-8 px-10 text-gray-500 font-bold italic">
                                                        {o.quantity} units
                                                    </td>
                                                    <td className="py-8 px-10 text-right">
                                                        <p className="font-black text-[#5ba409] text-xl italic tracking-tighter">+ ₱{(o.quantity * o.p_price).toLocaleString()}</p>
                                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Commission Free</span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
};

// Custom Icons
const CheckCircle: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default FarmerEarningsPage;
