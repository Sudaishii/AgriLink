import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, ChevronRight, Clock3, Edit3, Heart, Map as MapIcon, Package, Plus, RefreshCcw, Search, ShoppingBag, ShoppingCart, Trash2, Wallet, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { FarmerDashboardProps } from '../../../types';
import { API_BASE_URL } from '../../../api/apiConfig';
import Modal from '../../ui/Modal';
import ProductDetailModal from '../../ui/ProductDetailModal';
import DashboardCard from '../../ui/DashboardCard';
import { useToast } from '../../ui/Toast';
import { getLowStockMeta } from '../../../utils/stockThreshold';

type DemandLevel = 'High Demand' | 'Medium Demand' | 'Low Demand';
type DemandMetrics = {
  soldQuantity: number;
  orderCount: number;
  demandScore: number;
  level: DemandLevel;
};

const resolveImageUrl = (path: string) => {
  if (!path) return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=200';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL.replace('/api', '')}${path}`;
};

const formatMoney = (value: unknown) =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const FarmerDashboardV2: React.FC<FarmerDashboardProps> = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [demandWindowDays, setDemandWindowDays] = useState(7);
  const [onboardingCompleted, setOnboardingCompleted] = useState(localStorage.getItem('agrilink_onboarding_completed') === '1');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [productToArchive, setProductToArchive] = useState<any | null>(null);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<any | null>(null);

  const userId = localStorage.getItem('agrilink_id');
  const firstName = localStorage.getItem('agrilink_firstName') || 'Farmer';

  const fetchData = async () => {
    if (!userId) {
      setError('User session expired. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('agrilink_token');
      if (!token) {
        throw new Error('Session token missing. Please log in again.');
      }
      const [prodRes, orderRes, earnRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products/farmer/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/purchases/farmer/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/purchases/earnings/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (prodRes.status === 401 || orderRes.status === 401 || earnRes.status === 401) {
        localStorage.removeItem('agrilink_token');
        throw new Error('Session expired. Please log in again.');
      }

      if (!prodRes.ok || !orderRes.ok || !earnRes.ok) {
        throw new Error('Some dashboard data failed to sync. Please retry.');
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
    const refresh = () => fetchData();
    const onboardingDone = () => setOnboardingCompleted(true);

    window.addEventListener('product-added', refresh);
    window.addEventListener('product-updated', refresh);
    window.addEventListener('order-updated', refresh);
    window.addEventListener('agrilink-onboarding-completed', onboardingDone);
    return () => {
      window.removeEventListener('product-added', refresh);
      window.removeEventListener('product-updated', refresh);
      window.removeEventListener('order-updated', refresh);
      window.removeEventListener('agrilink-onboarding-completed', onboardingDone);
    };
  }, [userId]);

  const activeProducts = useMemo(() => products.filter((p) => p.p_status === 'active'), [products]);
  const pendingOrders = useMemo(() => orders.filter((o) => o.req_status === 'Pending'), [orders]);
  const lowStockCount = useMemo(() => activeProducts.filter((p) => getLowStockMeta(p).isLowStock).length, [activeProducts]);
  const criticalStockCount = useMemo(() => activeProducts.filter((p) => getLowStockMeta(p).isCriticalStock).length, [activeProducts]);

  const demandByProduct = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - demandWindowDays);

    const byProduct: Map<number, DemandMetrics> = new Map();
    const salesRows = orders.filter((o) => {
      const status = String(o.req_status || '').toLowerCase();
      if (status !== 'completed') return false;

      const dateValue = o.completed_at || o.req_date || o.created_at;
      const when = new Date(dateValue);
      if (Number.isNaN(when.getTime())) return false;
      return when >= start && when <= end;
    });

    for (const row of salesRows) {
      const productId = Number(row.product_id);
      if (!Number.isFinite(productId) || productId <= 0) continue;

      const qty = Number(row.quantity || 0);
      const current = byProduct.get(productId) || { soldQuantity: 0, orderCount: 0, demandScore: 0, level: 'Low Demand' as const };
      current.soldQuantity += Number.isFinite(qty) ? Math.max(0, qty) : 0;
      current.orderCount += 1;
      byProduct.set(productId, current);
    }

    for (const [productId, agg] of byProduct.entries()) {
      const demandScore = agg.soldQuantity / demandWindowDays;
      let level: DemandLevel = 'Low Demand';

      if (agg.orderCount === 0 || agg.soldQuantity <= 0) {
        level = 'Low Demand';
      } else if (agg.orderCount >= Math.max(2, Math.floor(demandWindowDays / 7)) && demandScore >= 1) {
        level = 'High Demand';
      } else {
        level = 'Medium Demand';
      }

      byProduct.set(productId, { ...agg, demandScore, level });
    }

    return byProduct;
  }, [demandWindowDays, orders]);
  const filteredProducts = useMemo(
    () =>
      products.filter((p) =>
        String(p.p_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.cat_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [products, searchTerm]
  );

  const statCards = useMemo(
    () => [
      {
        title: 'Current Revenue',
        value: `₱${formatMoney(earnings)}`,
        subtitle: 'Lifetime earnings',
        icon: Wallet,
        color: '#5ba409',
        action: () => navigate('/farmer/earnings'),
      },
      {
        title: 'Harvest Listings',
        value: activeProducts.length.toString(),
        subtitle: `${lowStockCount} low, ${criticalStockCount} critical`,
        icon: Package,
        color: '#2196F3',
        action: () => navigate('/farmer/listings'),
      },
      {
        title: 'Buyer Requests',
        value: pendingOrders.length.toString(),
        subtitle: 'Needs confirmation',
        icon: ShoppingCart,
        color: '#FF9800',
        action: () => navigate('/farmer/orders'),
      },
      {
        title: 'Your Purchases',
        value: 'Market',
        subtitle: 'Shop now',
        icon: ShoppingBag,
        color: '#7C3AED',
        action: () => navigate('/buyer/marketplace'),
      },
    ],
    [earnings, activeProducts.length, lowStockCount, criticalStockCount, pendingOrders.length, products.length, navigate]
  );

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const token = localStorage.getItem('agrilink_token');
      const response = await fetch(`${API_BASE_URL}/products/${productToDelete.p_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ u_id: userId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete listing.');
      }
      success('Listing deleted successfully.');
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Delete failed.');
    }
  };

  const handleArchive = async () => {
    if (!productToArchive) return;
    try {
      const token = localStorage.getItem('agrilink_token');
      const response = await fetch(`${API_BASE_URL}/products/archive/${productToArchive.p_id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ u_id: userId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Archive failed.');
      success('Listing archived successfully.');
      setIsArchiveModalOpen(false);
      setProductToArchive(null);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Archive failed.');
    }
  };

  const handleUnarchive = async (productId: number) => {
    try {
      const token = localStorage.getItem('agrilink_token');
      const response = await fetch(`${API_BASE_URL}/products/unarchive/${productId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ u_id: userId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Restore failed.');
      success('Listing restored successfully.');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Restore failed.');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] p-4">
        <div className="bg-white border border-red-200 rounded-[2rem] p-8 max-w-md w-full text-center shadow-lg">
          <AlertTriangle className="w-8 h-8 mx-auto text-red-600 mb-3" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Dashboard Sync Error</h2>
          <p className="text-gray-600 mb-5 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5ba409] hover:bg-[#4d8f08] text-white font-bold transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      {/* 🏙️ Clean SaaS Header */}
      <div className="bg-white border-b border-gray-100 py-8 lg:py-10">
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center text-[#5ba409]">
                  <Sprout size={12} />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5ba409]">AgriLink Farmer</span>
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
              Hello, {firstName}<span className="text-[#5ba409]">.</span>
            </h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Manage listings and farm profile</p>
          </div>
          
          <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-100 shrink-0">
             <button 
              onClick={() => navigate('/farmer/orders')} 
              className="px-4 py-2 bg-white text-gray-900 shadow-sm rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 flex items-center gap-2"
             >
                <ShoppingCart size={12} /> Manage Requests
             </button>
             <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-add-product'))} 
              className="px-4 py-2 bg-[#5ba409] text-white shadow-sm rounded-lg text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center"
             >
                <Plus size={12} /> New Listing
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 py-10">
        {!onboardingCompleted && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-[2rem] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4 px-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-red-800 uppercase tracking-widest">Profile Incomplete</p>
                <p className="text-xs text-red-700 font-bold mt-1">Complete your farm profile and map location to make listings visible to buyers.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/profile?setup=true')}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors mr-2 whitespace-nowrap"
            >
              Complete Setup
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((card) => (
             <div key={card.title} onClick={card.action} className="cursor-pointer group">
               <DashboardCard
                 icon={card.icon}
                 title={card.title}
                 value={card.value}
                 subtitle={card.subtitle}
                 color={card.color}
                 trend="Active Metrics"
               />
             </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Recent Buyer Requests</h2>
              <button onClick={() => navigate('/farmer/orders')} className="text-[10px] font-black text-[#5ba409] uppercase tracking-widest hover:underline">
                View all requests
              </button>
            </div>
            
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-gray-50 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl" />
                    <div className="flex-1 space-y-2">
                       <div className="h-4 bg-gray-100 rounded w-1/3" />
                       <div className="h-3 bg-gray-100 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
                  <ShoppingCart className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium tracking-tight">No requests at the moment</p>
                <p className="text-gray-400 text-xs mt-1">New buyer requests will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {orders.slice(0, 5).map((order) => (
                  <div 
                    key={order.req_id} 
                    className="group py-4 flex items-center justify-between gap-4 transition-all hover:bg-gray-50/50 cursor-pointer -mx-4 px-4 rounded-2xl"
                    onClick={() => navigate('/farmer/orders')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-[#5ba409]" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-[14px]">
                          {order.buyer_first} {order.buyer_last}
                        </p>
                        <p className="text-xs text-gray-500 font-medium">{order.p_name}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-[10px] text-gray-400 inline-flex items-center gap-1 font-semibold uppercase tracking-wider">
                            <Clock3 className="w-3 h-3" />
                            {order.quantity} {order.p_unit}
                          </p>
                          <p className="text-[10px] text-[#5ba409] font-black uppercase tracking-wider">
                            ₱{(Number(order.quantity) * Number(order.p_price)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ${
                        order.req_status === 'Pending' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {order.req_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Access Links</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
               {[
                 { label: 'Harvest Manager', icon: Package, to: '/farmer/listings', color: 'text-blue-600', bg: 'bg-blue-50', bdr: 'border-blue-100' },
                 { label: 'Shop Market', icon: ShoppingBag, to: '/buyer/marketplace', color: 'text-emerald-600', bg: 'bg-emerald-50', bdr: 'border-emerald-100' },
                 { label: 'Orders', icon: ShoppingCart, to: '/farmer/orders', color: 'text-amber-600', bg: 'bg-amber-50', bdr: 'border-amber-100' },
                 { label: 'My Purchases', icon: Package, to: '/profile?tab=orders', color: 'text-purple-600', bg: 'bg-purple-50', bdr: 'border-purple-100' },
                 { label: 'Map', icon: MapIcon, to: '/farmer/map', color: 'text-indigo-600', bg: 'bg-indigo-50', bdr: 'border-indigo-100' },
                 { label: 'Wishlist', icon: Heart, to: '/profile?tab=wishlist', color: 'text-red-600', bg: 'bg-red-50', bdr: 'border-red-100' },
               ].map((action) => (
                 <button 
                   key={action.label}
                   onClick={() => navigate(action.to)} 
                   className="flex flex-col items-center justify-center p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-[#5ba409]/30 transition-all active:scale-95"
                 >
                   <div className={`w-10 h-10 rounded-xl ${action.bg} ${action.color} border ${action.bdr} flex items-center justify-center mb-2`}>
                     <action.icon size={18} />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-tight text-gray-600 text-center">{action.label}</span>
                 </button>
               ))}
            </div>
          </div>
        </div>

      </div>

      {/* Modals */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setProductToDelete(null); }} title="Delete Listing">
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 mb-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">This permanently deletes <span className="font-semibold">{productToDelete?.p_name}</span>. This action cannot be undone.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setIsDeleteModalOpen(false); setProductToDelete(null); }} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-black uppercase tracking-widest transition-colors">Cancel</button>
          <button onClick={handleDeleteProduct} className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest transition-colors shadow-md">Delete Crop</button>
        </div>
      </Modal>

      <Modal isOpen={isArchiveModalOpen} onClose={() => { setIsArchiveModalOpen(false); setProductToArchive(null); }} title="Archive Listing">
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 mb-4 flex items-start gap-3">
          <Archive className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">Archive <span className="font-semibold">{productToArchive?.p_name}</span>? Buyers will no longer see it until restored.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setIsArchiveModalOpen(false); setProductToArchive(null); }} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-black uppercase tracking-widest transition-colors">Cancel</button>
          <button onClick={handleArchive} className="flex-1 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-widest transition-colors shadow-md">Archive Crop</button>
        </div>
      </Modal>

      <ProductDetailModal isOpen={isDetailModalOpen} onClose={() => { setIsDetailModalOpen(false); setSelectedProductForDetail(null); }} product={selectedProductForDetail} />
    </div>
  );
};

export default FarmerDashboardV2;
