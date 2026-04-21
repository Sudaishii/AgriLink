import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, ShoppingCart, Truck, Activity, DollarSign, Package, ChevronRight, Globe, ShieldCheck } from 'lucide-react';
import DashboardCard from '../../ui/DashboardCard';
import { API_BASE_URL, getStoredAuthToken } from '../../../api/apiConfig';

const AdminOrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const token = getStoredAuthToken();
                const res = await fetch(`${API_BASE_URL}/purchases/transactions/all`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setOrders(Array.isArray(data.transactions) ? data.transactions : []);
                }
            } catch (err) {
                console.error('Failed to fetch transactions:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const searchStr = searchQuery.toLowerCase();
            const matchesSearch = 
                String(order.req_id).includes(searchStr) || 
                String(order.p_name).toLowerCase().includes(searchStr) || 
                String(order.buyer_first || '').toLowerCase().includes(searchStr) ||
                String(order.buyer_last || '').toLowerCase().includes(searchStr);
            
            const matchesStatus = statusFilter === 'All' || order.req_status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [orders, searchQuery, statusFilter]);

    const activeOrders = orders.filter(o => o.req_status === 'Pending' || o.req_status === 'Confirmed').length;
    const completedOrders = orders.filter(o => o.req_status === 'Completed').length;
    const totalGtv = orders.reduce((sum, o) => sum + (o.quantity * o.p_price), 0);
    const successRate = orders.length ? ((completedOrders / orders.length) * 100).toFixed(1) : '100';

    return (
        <div className="min-h-screen bg-[#FDFDFD]">
            {/* 🏙️ Comprehensive Order Stream Header */}
            <div className="bg-white border-b border-gray-100 py-10">
                <div className="max-w-[1600px] mx-auto px-6 sm:px-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                <ShoppingCart size={12} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5ba409]">System Orders Tracker</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
                            System Sales<span className="text-[#5ba409]">.</span>
                        </h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">View and monitor all market transactions</p>
                    </div>
                    <div className="flex-1 max-w-xl w-full relative group">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Track system by order ID or participant..."
                                className="w-full pl-12 pr-6 py-3.5 bg-white border border-[#5ba409]/20 rounded-2xl text-sm font-medium transition-all outline-none placeholder:text-gray-300 shadow-sm focus:border-[#5ba409]/40 focus:shadow-green-900/5"
                            />
                            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#5ba409] transition-colors" />
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto px-6 sm:px-10 py-10">
                {/* 📊 Order Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <DashboardCard
                        icon={Activity}
                        title="Active Orders"
                        value={activeOrders.toString()}
                        subtitle="Pending & Confirmed"
                        color="#5ba409"
                        trend="Real-time"
                    />
                    <DashboardCard
                        icon={Truck}
                        title="Total Volume"
                        value={orders.length.toString()}
                        subtitle="All-time transactions"
                        color="#2196F3"
                        trend="System wide"
                    />
                    <DashboardCard
                        icon={ShieldCheck}
                        title="Order Success"
                        value={`${successRate}%`}
                        subtitle="Completed Sales"
                        color="#FF9800"
                        trend="Reliable"
                    />
                    <DashboardCard
                        icon={DollarSign}
                        title="Total GTV"
                        value={`₱${totalGtv.toLocaleString()}`}
                        subtitle="Gross Transaction Value"
                        color="#7C3AED"
                        trend="Life time value"
                    />
                </div>

                {/* 📋 Section: Logistics Ledger */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-10 py-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Sales Activity</h3>
                            <p className="text-xl font-black text-gray-900 tracking-tight mt-1">Active Orders</p>
                        </div>

                        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 h-fit">
                            {['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map(status => (
                                <button 
                                    key={status} 
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all tracking-widest ${
                                        statusFilter === status ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-gray-50/30">
                                    <th className="py-5 px-10 text-[10px] font-black uppercase tracking-widest text-gray-400">Order ID</th>
                                    <th className="py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                                    <th className="py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Product Items</th>
                                    <th className="py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Total Price</th>
                                    <th className="py-5 px-10 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Order Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={5} className="py-10 text-center text-sm font-medium text-gray-400">Loading transactions...</td></tr>
                                ) : filteredOrders.length === 0 ? (
                                    <tr><td colSpan={5} className="py-10 text-center text-sm font-medium text-gray-400">No transactions found</td></tr>
                                ) : (
                                    filteredOrders.map((order: any, idx: number) => (
                                        <tr key={order.req_id} className="group hover:bg-gray-50/50 transition-all duration-300 relative border-l-4 border-transparent hover:border-[#5ba409]">
                                            <td className="py-6 px-10">
                                                <span className="font-mono text-[11px] font-black text-gray-400 group-hover:text-[#5ba409] transition-colors">ORD-{order.req_id}</span>
                                            </td>
                                            <td className="py-6">
                                                <div>
                                                    <p className="text-[14px] font-black text-gray-900 leading-none">{order.buyer_first} {order.buyer_last}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Globe size={11} className="text-gray-300" />
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Marketplace User</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                                                        <Package className="w-4 h-4 text-gray-300" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-black text-gray-800 leading-tight">{order.p_name}</p>
                                                        <p className="text-[10px] font-black text-[#5ba409] uppercase tracking-widest mt-1">QTY: {order.quantity} {order.p_unit}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6 text-center">
                                                <p className="text-[15px] font-black text-gray-900 italic tracking-tight">₱{(order.quantity * order.p_price).toLocaleString()}</p>
                                            </td>
                                            <td className="py-6 px-10 text-right">
                                                <div className="flex items-center justify-end gap-5">
                                                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                                        order.req_status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' : 
                                                        order.req_status === 'Confirmed' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                                        order.req_status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                                                        'bg-amber-50 text-amber-700 border-amber-100'
                                                    }`}>
                                                        {order.req_status}
                                                    </span>
                                                    <ChevronRight size={14} className="text-gray-200 group-hover:translate-x-1 group-hover:text-[#5ba409] transition-all" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Automation Link */}
                <div className="mt-12 text-center">
                    <button className="px-10 py-5 bg-white border-2 border-dashed border-gray-100 rounded-[2rem] font-black text-gray-300 hover:border-[#5ba409] hover:text-[#5ba409] transition-all uppercase tracking-[0.2em] text-[10px]">
                       No further transactions to hydrate in current stream
                    </button>
                </div>
            </main>
        </div>
    );
};

export default AdminOrdersPage;

