import React, { useState, useEffect } from 'react';
import { Plus, Package, ShoppingCart, TrendingUp, Users, AlertTriangle, RefreshCcw, Leaf, ChevronRight, Activity, History, ArrowRight, Settings, Wallet, Trash2, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { FarmerDashboardProps } from '../../../types';
import { API_BASE_URL } from '../../../api/apiConfig';
import DashboardCard from '../../ui/DashboardCard';
import { useToast } from '../../ui/Toast';
import Modal from '../../ui/Modal';
import ProductDetailModal from '../../ui/ProductDetailModal';
import { getLowStockMeta } from '../../../utils/stockThreshold';

const resolveImageUrl = (path: string) => {
  if (!path) return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=200';
  if (path.startsWith('http')) return path;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}${path}`;
};

const formatMoney = (value: unknown) =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const FarmerDashboard: React.FC<FarmerDashboardProps> = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(() => {
    return localStorage.getItem('agrilink_onboarding_completed') === '1';
  });

  const userId = localStorage.getItem('agrilink_id') || localStorage.getItem('agrilink_userId');
  const firstName = localStorage.getItem('agrilink_firstName') || 'Farmer';
  const { success: showSuccess, error: showError, info: showInfo } = useToast();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [productToArchive, setProductToArchive] = useState<any | null>(null);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<any | null>(null);

  const fetchData = async () => {
    if (!userId) {
      setError('User session expired. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const isInitialLoad = products.length === 0 && orders.length === 0;
      if (isInitialLoad) setLoading(true);
      const token = localStorage.getItem('agrilink_token');

      const [prodRes, orderRes, earnRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products/farmer/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/purchases/farmer/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/purchases/earnings/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!prodRes.ok || !orderRes.ok || !earnRes.ok) {
        throw new Error('Some data failed to sync. Please retry.');
      }

      const prodData = await prodRes.json();
      const orderData = await orderRes.json();
      const earnData = await earnRes.json();

      setProducts(prodData.products || []);
      setOrders(orderData.orders || []);
      setEarnings(earnData.summary?.total_earnings || 0);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Connection with server failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleRefresh = () => fetchData();
    window.addEventListener('product-added', handleRefresh);
    window.addEventListener('order-updated', handleRefresh);
    window.addEventListener('product-updated', handleRefresh);
    const handleCompletion = () => setOnboardingCompleted(true);
    window.addEventListener('agrilink-onboarding-completed', handleCompletion);

    return () => {
      window.removeEventListener('product-added', handleRefresh);
      window.removeEventListener('order-updated', handleRefresh);
      window.removeEventListener('product-updated', handleRefresh);
      window.removeEventListener('agrilink-onboarding-completed', handleCompletion);
    };
  }, [userId]);

  const activeProducts = products.filter(p => String(p.p_status || p.status || '').toLowerCase() === 'active');
  const archivedProducts = products.filter(p => String(p.p_status || p.status || '').toLowerCase() === 'archived');
  const pendingOrders = orders.filter(o => (o.req_status || '').toLowerCase() === 'pending');
  const filteredProducts = products.filter(p =>
    (p.p_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.cat_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const lowStockCount = activeProducts.filter((p) => getLowStockMeta(p).isLowStock).length;

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const token = localStorage.getItem('agrilink_token');
      const response = await fetch(`${API_BASE_URL}/products/${productToDelete.p_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ u_id: userId })
      });

      if (response.ok) {
        showSuccess('Crop deleted successfully!');
        fetchData();
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
      } else {
        const data = await response.json();
        showError(data.message || 'Failed to delete product.');
      }
    } catch (err) {
      showError('The server encountered an issue while deleting your listing.');
    }
  };

  const openDeleteModal = (product: any) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const openArchiveModal = (product: any) => {
    setProductToArchive(product);
    setIsArchiveModalOpen(true);
  };

  const openDetailModal = (product: any) => {
    setSelectedProductForDetail(product);
    setIsDetailModalOpen(true);
  };

  const handleArchive = async () => {
    if (!productToArchive) return;

    try {
      const token = localStorage.getItem('agrilink_token');
      const res = await fetch(`${API_BASE_URL}/products/archive/${productToArchive.p_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ u_id: userId })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess('Harvest archived successfully!');
        fetchData();
        setIsArchiveModalOpen(false);
        setProductToArchive(null);
      } else {
        showError(data.message || 'Archive failed.');
      }
    } catch (err) {
      showError('The server encountered an issue while archiving your listing.');
    }
  };

  const handleUnarchive = async (productId: number) => {
    try {
      const token = localStorage.getItem('agrilink_token');
      const res = await fetch(`${API_BASE_URL}/products/unarchive/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ u_id: userId })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess('Harvest restored successfully!');
        fetchData();
      } else {
        showError(data.message || 'Restoration failed.');
      }
    } catch (err) {
      showError('The server encountered an issue while restoring your listing.');
    }
  };


  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FBE7]">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-red-50 max-w-sm text-center">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase italic tracking-tighter">Sync Error</h2>
        <p className="text-gray-500 font-medium mb-10 leading-relaxed italic text-sm">{error}</p>
        <button
          onClick={fetchData}
          className="w-full bg-[#5ba409] hover:bg-[#4d8f08] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-green-100"
        >
          <RefreshCcw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFB] font-sans pb-24 animate-in fade-in duration-700" style={{ overflowAnchor: 'none' }}>
      {/* 🌿 Premium Header */}
      <div className="bg-gradient-to-br from-[#1a2e05] to-[#121c04] py-16 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] italic">Real-Time Marketplace Feed</span>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter leading-none">
              Hello, {firstName}<span className="text-[#5ba409]">.</span>
            </h1>
            <p className="text-white/40 font-medium text-lg italic max-w-sm uppercase tracking-tight">
              Your farm is performing brilliantly today.
            </p>
          </div>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-add-product'))}
            className="group bg-[#5ba409] hover:bg-[#4d8f08] text-white px-8 py-4 rounded-2xl font-black shadow-2xl shadow-green-900/30 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 active:scale-95"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-base tracking-tight uppercase italic font-black">Post New Listing</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-10">
        {/* 🚨 Profile Setup Action Required */}
        {!onboardingCompleted && (
          <div className="bg-red-50 border-1 border-red-500/20 p-5 mb-10 rounded-[2rem] shadow-xl shadow-red-500/5 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden z-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start md:items-center gap-4 relative z-10">
              <div className="bg-red-500 text-white p-3 rounded-2xl shadow-inner shadow-black/20 shrink-0 hidden md:flex">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-red-900 font-black text-xl tracking-tight italic uppercase mb-1">Action Required: Complete Your Farm Profile</h3>
                <p className="text-red-700/80 font-bold text-sm">You must set up your farm address and pin your location on the map before your listings become visible to buyers.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/profile?setup=true')} 
              className="group bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-900/20 hover:-translate-y-1 transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-3 relative z-10"
            >
              Setup Location <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* 📊 Real-Time Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <DashboardCard icon={Wallet} title="Total Revenue" value={`₱${formatMoney(earnings)}`} subtitle="Lifetime Earnings" color="#5ba409" trend="+12% this week" />
          <DashboardCard icon={Package} title="Live Listings" value={activeProducts.length.toString()} subtitle={`${lowStockCount} items low on stock`} color="#FF9800" />
          <DashboardCard icon={ShoppingCart} title="Active Requests" value={pendingOrders.length.toString()} subtitle="Pending Confirmation" color="#2196F3" trend="Priority Support" />
          <DashboardCard icon={Archive} title="Archived" value={archivedProducts.length.toString()} subtitle="Hidden from market" color="#64748b" />
          <DashboardCard icon={Users} title="Total Items" value={products.length.toString()} subtitle="Full Inventory" color="#9C27B0" />
        </div>

        {/* 📋 Section: My Inventory */}
        <div className="bg-white rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.05)] border border-gray-100 p-10 mb-12 animate-in fade-in duration-1000">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-50">
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tighter italic uppercase underline decoration-[#5ba409] decoration-4 underline-offset-8">My Inventory</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">Manage your active marketplace listings</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#5ba409]/20 focus:border-[#5ba409] transition-all w-64"
                />
                <Activity className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                onClick={() => navigate('/farmer/listings')}
                className="flex items-center gap-2 text-[10px] font-black text-[#5ba409] uppercase tracking-widest hover:translate-x-1 transition-transform italic"
              >
                View Manager <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] relative">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 bg-white z-10 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]">
                <tr className="italic">
                  <th className="py-4 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Price</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Stock</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right px-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-gray-300 font-black uppercase text-xs italic tracking-widest opacity-40">
                      {searchTerm ? 'No matches found...' : 'No active crops yet...'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const stockMeta = getLowStockMeta(product);
                    return (
                    <tr
                      key={product.p_id}
                      onClick={() => openDetailModal(product)}
                      className="group hover:bg-green-50/30 transition-all duration-500 relative cursor-pointer border-l-4 border-transparent hover:border-[#5ba409]"
                    >
                      <td className="py-6 px-2">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-50 rounded-2xl overflow-hidden border border-gray-100 group-hover:border-[#5ba409] group-hover:animate-pulse transition-all duration-300">
                            <img src={resolveImageUrl(product.p_image)} alt={product.p_name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-black text-gray-900 italic uppercase leading-none mb-1">{product.p_name}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{product.cat_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 text-center">
                        <span className="font-black text-gray-900 italic">₱{product.p_price}/{product.p_unit}</span>
                      </td>
                      <td className="py-6 text-center">
                        <span
                          className={`text-xs font-black uppercase tracking-tight px-4 py-1.5 rounded-full ${stockMeta.isLowStock ? 'bg-slate-50 text-slate-600' : 'bg-gray-50 text-gray-500'
                            }`}
                        >
                          {product.p_quantity} {product.p_unit}
                        </span>
                      </td>
                      <td className="py-6 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${product.p_status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-400 border border-gray-200'
                            }`}
                        >
                          {product.p_status === 'active' && <Leaf className="w-3.5 h-3.5 text-green-600" />}
                          {product.p_status}
                        </span>
                      </td>
                      <td className="py-6 text-right px-2">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() =>
                              window.dispatchEvent(new CustomEvent('open-edit-product', { detail: product }))
                            }
                            className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                            title="Edit Crop"
                          >
                            <Settings className="w-4 h-4" />
                            Edit Crop
                          </button>
                          {product.p_status === 'active' ? (
                            <button
                              onClick={() => openArchiveModal(product)}
                              className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                              title="Archive Crop"
                            >
                              <AlertTriangle className="w-4 h-4" />
                              Archive
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnarchive(product.p_id)}
                              className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                              title="Restore"
                            >
                              <RefreshCcw className="w-4 h-4" />
                              Restore
                            </button>
                          )}
                          <button
                            onClick={() => openDeleteModal(product)}
                            className="px-3 py-2 rounded-lg border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                            title="Delete Crop"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-1000 delay-150">
          {/* 📋 Recent Orders Feed */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[3rem] p-10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.05)] border border-gray-100">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-50">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tighter italic uppercase">Market Requests</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Pending and recent buyer activity</p>
                </div>
                <button onClick={() => navigate('/farmer/orders')} className="flex items-center gap-2 text-[10px] font-black text-[#5ba409] uppercase tracking-widest hover:translate-x-1 transition-transform italic">
                  Order Management <History className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="py-24 flex flex-col items-center justify-center text-center opacity-30 grayscale italic">
                    <Activity className="w-12 h-12 mb-4 text-gray-300" />
                    <p className="font-black text-sm uppercase tracking-tighter">Field activity is currently tranquil...</p>
                  </div>
                ) : (
                  orders.slice(0, 5).map((order: any) => (
                    <div key={order.req_id} className="group flex items-center justify-between p-6 bg-slate-50/50 hover:bg-gray-100 rounded-3xl border border-transparent hover:border-[#5ba409]/20 transition-all cursor-pointer">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:border-[#5ba409] transition-all flex items-center justify-center font-black text-gray-900 italic text-xl">
                          {order.buyer_first?.[0] || 'B'}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 tracking-tight text-lg mb-1 leading-none italic uppercase">{order.buyer_first} {order.buyer_last}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-[#5ba409] uppercase tracking-widest">{order.quantity} {order.p_unit}</span>
                            <span className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                            <span className="text-[11px] text-gray-400 font-bold italic uppercase">{order.p_name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <p className="text-lg font-black text-gray-900 italic leading-none">₱{(order.quantity * order.p_price).toLocaleString()}</p>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${order.req_status === 'Pending' ? 'bg-amber-50 text-amber-600 animate-pulse' :
                          order.req_status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                          {order.req_status}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 🔗 Quick Access Hub */}
          <div className="space-y-8">
            <div className="bg-white rounded-[3rem] p-10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.05)] border border-gray-100 relative group">
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] mb-12 italic">Farmer Hub Access</h4>
              <div className="space-y-5">
                {[
                  { label: 'Harvest Manager', to: '/farmer/listings', icon: Package },
                  { label: 'Market Earnings', to: '/farmer/earnings', icon: TrendingUp },
                  { label: 'Crop Phenotypes', to: '/farmer/phenotyping', icon: Leaf },
                  { label: 'Merchant Profile', to: '/profile', icon: Settings }
                ].map((link, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(link.to)}
                    className="w-full group/btn p-6 bg-slate-50/50 hover:bg-[#5ba409]/5 rounded-[2.5rem] border border-transparent hover:border-[#5ba409]/10 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-6">
                      <link.icon className="w-5 h-5 text-[#5ba409] transform group-hover/btn:scale-125 transition-transform" />
                      <span className="text-sm font-black italic tracking-wide uppercase text-gray-700">{link.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover/btn:translate-x-1 group-hover/btn:text-[#5ba409] transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🗑️ Elite Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        title="Delete Listing"
      >
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">
            This permanently deletes <span className="font-semibold">{productToDelete?.p_name}</span>. This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsDeleteModalOpen(false);
              setProductToDelete(null);
            }}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button onClick={handleDeleteProduct} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors">
            Delete Crop
          </button>
        </div>
      </Modal>
      {/* 📦 Elite Archive Confirmation Modal */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => {
          setIsArchiveModalOpen(false);
          setProductToArchive(null);
        }}
        title="Archive Listing"
      >
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            Archive <span className="font-semibold">{productToArchive?.p_name}</span>? Buyers will no longer see it until restored.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsArchiveModalOpen(false);
              setProductToArchive(null);
            }}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button onClick={handleArchive} className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors">
            Archive Crop
          </button>
        </div>
      </Modal>
      {/* 📋 Elite Product Detail Modal */}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProductForDetail(null);
        }}
        product={selectedProductForDetail}
      />
    </div>
  );
};

export default FarmerDashboard;
