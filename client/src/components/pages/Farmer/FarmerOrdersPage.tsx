import React, { useState, useEffect } from 'react';
import { ShoppingCart, Clock, CheckCircle, XCircle, MapPin, Phone, Mail, Package, RefreshCcw, AlertTriangle, Zap, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../../api/apiConfig';

const FarmerOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Confirmed' | 'Completed'>('All');

  const userId = localStorage.getItem('agrilink_id');

  const fetchOrders = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('agrilink_token');
      const res = await fetch(`${API_BASE_URL}/purchases/farmer/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setOrders(data.orders || []);
      else setError(data.message);
    } catch (err) {
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const onOrderUpdated = () => fetchOrders();
    window.addEventListener('order-updated', onOrderUpdated);
    window.addEventListener('agrilink-new-order', onOrderUpdated);
    return () => {
      window.removeEventListener('order-updated', onOrderUpdated);
      window.removeEventListener('agrilink-new-order', onOrderUpdated);
    };
  }, [userId]);

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('agrilink_token');
      const res = await fetch(`${API_BASE_URL}/purchases/status/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, u_id: userId })
      });
      if (res.ok) fetchOrders();
      else {
        const data = await res.json();
        alert(data.message);
      }
    } catch (err) {
      alert('Update failed.');
    }
  };

  const filteredOrders = orders.filter(o => filter === 'All' || o.req_status === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FBE7] to-white pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="animate-fadeIn">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter mb-1">Order Desk<span className="text-[#5ba409]">.</span></h1>
            <p className="text-base text-gray-400 font-medium tracking-tight">Fulfill requests and manage your sales</p>
          </div>

          <div className="flex bg-white p-2 rounded-3xl shadow-xl border border-gray-100">
            {(['All', 'Pending', 'Confirmed', 'Completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-3 rounded-2xl font-black text-sm transition-all ${filter === f ? 'bg-[#5ba409] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-8 p-6 bg-red-50 border-2 border-red-100 rounded-3xl flex items-center gap-4 animate-shake">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <p className="font-bold text-red-800">{error}</p>
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="py-40 flex flex-col items-center gap-4">
            <RefreshCcw className="w-12 h-12 text-[#5ba409] animate-spin" />
            <p className="font-black text-gray-300 uppercase tracking-widest text-sm text-center">Loading Orders...</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100">
                <div className="bg-gray-50/50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart className="w-12 h-12 text-gray-200" />
                </div>
                <h3 className="text-2xl font-black text-gray-300">No {filter === 'All' ? '' : filter} orders yet</h3>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.req_id} className="bg-white rounded-[3rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden group hover:border-[#5ba409]/30 transition-all">
                  <div className="flex flex-col lg:flex-row">

                    {/* Status & Price Sidebar */}
                    <div className={`p-10 lg:w-80 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-50 ${order.req_status === 'Pending' ? 'bg-amber-50/30' :
                      order.req_status === 'Confirmed' ? 'bg-blue-50/30' :
                        'bg-green-50/30'
                      }`}>
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <ShoppingCart className={`w-8 h-8 ${order.req_status === 'Pending' ? 'text-amber-500' :
                            order.req_status === 'Confirmed' ? 'text-blue-500' :
                              'text-green-500'
                            }`} />
                          <span className="font-black text-gray-900 text-2xl tracking-tighter italic">#{order.req_id}</span>
                        </div>
                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${order.req_status === 'Pending' ? 'bg-amber-500 text-white border-amber-600 animate-pulse' :
                          order.req_status === 'Confirmed' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            'bg-green-100 text-green-700 border-green-200'
                          }`}>
                          {order.req_status === 'Pending' ? <Zap className="w-3 h-3" /> : null}
                          {order.req_status}
                        </span>
                      </div>
                      <div className="mt-10 lg:mt-0">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Total Value</p>
                        <p className="text-4xl font-black text-[#5ba409] tracking-tighter italic">₱{(order.quantity * order.p_price).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Main Fulfillment Content */}
                    <div className="flex-1 p-10 md:p-12">
                      <div className="grid md:grid-cols-2 gap-12">

                        {/* Product Section */}
                        <div className="space-y-6">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#5ba409]" />
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Details</h3>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center border border-gray-100 shadow-sm relative group-hover:bg-[#5ba409]/5 transition-colors">
                              <Package className="w-10 h-10 text-[#5ba409] opacity-40" />
                              <div className="absolute -top-2 -right-2 bg-gray-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-lg">×{order.quantity}</div>
                            </div>
                            <div>
                              <p className="text-2xl font-black text-gray-900 italic tracking-tighter mb-1">{order.p_name}</p>
                              <p className="font-bold text-gray-400 text-sm">Requested on {new Date(order.req_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                          </div>
                        </div>

                        {/* Customer Section */}
                        <div className="space-y-6">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Buyer Information</h3>
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-sm">
                                {order.buyer_first[0]}{order.buyer_last[0]}
                              </div>
                              <div>
                                <p className="font-black text-gray-900 text-lg leading-none mb-1">{order.buyer_first} {order.buyer_last}</p>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-tight flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> Area 4, Cebu City
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button className="flex-1 py-3 bg-gray-50 hover:bg-[#5ba409]/10 text-gray-500 hover:text-[#5ba409] rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-transparent hover:border-[#5ba409]/20 flex items-center justify-center gap-2">
                                <MessageSquare className="w-3.5 h-3.5" /> Send Message
                              </button>
                              <button className="flex-1 py-3 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-transparent hover:border-blue-100 flex items-center justify-center gap-2">
                                <Phone className="w-3.5 h-3.5" /> Call Buyer
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="mt-12 pt-8 border-t border-gray-50 flex flex-wrap items-center gap-4">
                        {order.req_status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(order.req_id, 'Confirmed')}
                              className="flex-[2] flex items-center justify-center gap-3 px-10 py-5 bg-[#5ba409] hover:bg-[#4d8f08] text-white rounded-[2rem] font-black text-lg shadow-[0_15px_40px_-12px_rgba(91,164,9,0.5)] transition-all hover:-translate-y-1 active:scale-95 group"
                            >
                              <CheckCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                              Fulfill Request
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(order.req_id, 'Cancelled')}
                              className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-white border-2 border-red-50 hover:bg-red-50 text-red-500 rounded-[2rem] font-black text-sm transition-all"
                            >
                              <XCircle className="w-5 h-5" /> Decline
                            </button>
                          </>
                        )}

                        {order.req_status === 'Confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus(order.req_id, 'Completed')}
                            className="flex-[2] flex items-center justify-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black text-lg shadow-[0_15px_40px_-12px_rgba(37,99,235,0.5)] transition-all hover:-translate-y-1 active:scale-95 group"
                          >
                            <Package className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            Mark as Delivered
                          </button>
                        )}

                        {order.req_status === 'Completed' && (
                          <div className="flex-[2] bg-green-50 py-5 rounded-[2rem] border-2 border-green-100 flex items-center justify-center gap-3 text-green-700 font-black text-lg">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                            Transaction Finalized
                          </div>
                        )}

                        <button className="p-5 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-full transition-all ml-auto">
                          <ArrowRight className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Custom Icons
const MessageSquare: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
);

const CheckCircle2: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default FarmerOrdersPage;
