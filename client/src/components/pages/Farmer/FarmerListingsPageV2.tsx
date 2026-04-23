import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, Edit3, Leaf, Package, RefreshCcw, Search, Trash2 } from 'lucide-react';
import { API_BASE_URL, getFullImageUrl } from '../../../api/apiConfig';
import { useToast } from '../../ui/Toast';
import Modal from '../../ui/Modal';
import ProductDetailModal from '../../ui/ProductDetailModal';
import { getLowStockMeta } from '../../../utils/stockThreshold';

const FarmerListingsPageV2: React.FC = () => {
  const { success, error: showError } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [productToArchive, setProductToArchive] = useState<any | null>(null);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');

  const userId = localStorage.getItem('agrilink_id') || localStorage.getItem('agrilink_userId');

  const fetchProducts = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('agrilink_token');
      const res = await fetch(`${API_BASE_URL}/products/farmer/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load listings.');
      setProducts(data.products || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    const handleRefresh = () => fetchProducts();
    window.addEventListener('product-added', handleRefresh);
    window.addEventListener('product-updated', handleRefresh);

    return () => {
      window.removeEventListener('product-added', handleRefresh);
      window.removeEventListener('product-updated', handleRefresh);
    };
  }, [userId]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const pName = String(p.p_name || '').toLowerCase();
      const pCat = String(p.cat_name || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = pName.includes(query) || pCat.includes(query);
      
      const pStatus = String(p.p_status || p.status || '').toLowerCase();
      const matchesStatus = filterStatus === 'all' || pStatus === filterStatus.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
  }, [products, searchQuery, filterStatus]);

  const activeCount = useMemo(() => products.filter((p) => String(p.p_status || p.status || '').toLowerCase() === 'active').length, [products]);
  const archivedCount = useMemo(() => products.filter((p) => String(p.p_status || p.status || '').toLowerCase() === 'archived').length, [products]);
  const lowStockCount = useMemo(() => products.filter((p) => getLowStockMeta(p).isLowStock).length, [products]);

  const getStatusStyles = (statusVal: string) => {
    const s = String(statusVal || '').toLowerCase();
    if (s === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'archived') return 'bg-slate-100 text-slate-700 border-slate-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      const token = localStorage.getItem('agrilink_token');
      const res = await fetch(`${API_BASE_URL}/products/${productToDelete.p_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ u_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Deletion failed.');
      success('Listing deleted successfully.');
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err: any) {
      const rawMessage = String(err?.message || 'Deletion failed.');
      const normalized = rawMessage.toLowerCase();
      if (normalized.includes('active or reserved orders') || normalized.includes('active orders')) {
        showError('Cannot delete listing while it has active orders. Please fulfill or cancel orders first.');
        return;
      }
      showError(rawMessage);
    }
  };

  const handleArchive = async () => {
    if (!productToArchive) return;
    try {
      const token = localStorage.getItem('agrilink_token');
      const res = await fetch(`${API_BASE_URL}/products/archive/${productToArchive.p_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ u_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Archive failed.');
      success('Listing archived successfully.');
      setIsArchiveModalOpen(false);
      setProductToArchive(null);
      fetchProducts();
    } catch (err: any) {
      showError(err.message || 'Archive failed.');
    }
  };

  const handleUnarchive = async (productId: number) => {
    try {
      const token = localStorage.getItem('agrilink_token');
      const res = await fetch(`${API_BASE_URL}/products/unarchive/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ u_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Restore failed.');
      success('Listing restored successfully.');
      fetchProducts();
    } catch (err: any) {
      showError(err.message || 'Restore failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <div className="max-w-[1600px] mx-auto px-4 pt-10 pb-8">
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-white mb-8 shadow-xl border border-emerald-300/30 bg-gradient-to-r from-[#0f2f0f] via-[#1f5c1b] to-[#2f7a24]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_45%)]" />
          <div className="absolute -bottom-8 left-0 w-[60%] h-24 rounded-[100%] bg-[#b9e57a]/20 blur-xl" />
          <div className="absolute -bottom-10 right-0 w-[52%] h-24 rounded-[100%] bg-[#86c640]/20 blur-xl" />
          <div className="relative z-10">
            <p className="text-[11px] uppercase tracking-[0.22em] text-green-100/90 font-semibold mb-2">AgriLink Farmer</p>
            <h1 className="text-3xl md:text-4xl font-black leading-tight">My Listings</h1>
            <p className="text-white/90 mt-2 max-w-2xl">Keep your harvest listings accurate, visible, and market-ready for buyers.</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-black text-gray-900">Listings Overview</h2>
            <p className="text-gray-500 mt-1">Track stock, archive inactive items, and publish new harvests fast.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchProducts}
              className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold inline-flex items-center gap-2 bg-white"
            >
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-add-product'))}
              className="px-4 py-2.5 rounded-xl bg-[#5ba409] hover:bg-[#4d8f08] text-white text-sm font-semibold"
            >
              New Listing
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Active Listings', value: activeCount, subtitle: 'Visible in market', tone: 'emerald' },
            { label: 'Archived', value: archivedCount, subtitle: 'Hidden from buyers', tone: 'slate' },
            { label: 'Low Stock', value: lowStockCount, subtitle: 'Needs refill soon', tone: 'amber' },
          ].map((card) => (
            <div
              key={card.label}
              className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md min-h-[160px] ${
                card.tone === 'amber'
                  ? 'border-amber-200 bg-gradient-to-br from-white via-white to-amber-50'
                  : card.tone === 'slate'
                  ? 'border-slate-200 bg-gradient-to-br from-white via-white to-slate-50'
                  : 'border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50'
              }`}
            >
              <div className="absolute inset-y-0 -right-8 w-1/2 flex items-center justify-end opacity-12 pointer-events-none">
                <Leaf className={`w-36 h-36 ${
                  card.tone === 'amber' ? 'text-amber-500' : 
                  card.tone === 'slate' ? 'text-slate-300' :
                  'text-emerald-600'
                }`} />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className={`w-11 h-11 rounded-xl bg-white border flex items-center justify-center shadow-sm mb-4 ${
                  card.tone === 'amber' ? 'border-amber-200' : 
                  card.tone === 'slate' ? 'border-slate-200' :
                  'border-emerald-200'
                }`}>
                  <Package className={`w-5 h-5 ${
                    card.tone === 'amber' ? 'text-amber-600' : 
                    card.tone === 'slate' ? 'text-slate-600' :
                    'text-emerald-700'
                  }`} />
                </div>
                <p className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] w-fit ${
                  card.tone === 'amber'
                    ? 'bg-amber-100 text-amber-700'
                    : card.tone === 'slate'
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {card.label}
                </p>
                <div className="mt-4">
                  <p className={`text-[40px] leading-none font-black tracking-tighter ${
                    card.tone === 'amber' ? 'text-amber-700' : 
                    card.tone === 'slate' ? 'text-slate-800' :
                    'text-emerald-800'
                  }`}>{card.value}</p>
                  <p className="text-sm mt-2 font-bold tracking-wide text-gray-600">{card.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between shadow-sm">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'All Listings' },
              { id: 'active', label: 'Active' },
              { id: 'archived', label: 'Archived' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  filterStatus === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative w-full md:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 bg-gray-50/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5ba409]/20 focus:bg-white transition-colors"
              />
            </div>
            <p className="text-xs text-gray-600 font-semibold bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 whitespace-nowrap">
              {filteredProducts.length} listing{filteredProducts.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[820px]">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Stock</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse border-t border-gray-100">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-gray-100 rounded-lg" />
                          <div className="space-y-2">
                             <div className="h-4 bg-gray-100 rounded w-24" />
                             <div className="h-3 bg-gray-100 rounded w-16" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-12" /></td>
                      <td className="px-5 py-4"><div className="h-6 bg-gray-100 rounded-full w-20" /></td>
                      <td className="px-5 py-4 text-right"><div className="h-8 bg-gray-100 rounded-lg w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-500">No listings found.</td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const stockMeta = getLowStockMeta(product);
                    return (
                    <tr
                      key={product.p_id}
                      className="border-t border-gray-100 hover:bg-emerald-50/30 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedProductForDetail(product);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getFullImageUrl(product.p_image)}
                            alt={product.p_name}
                            className="w-11 h-11 rounded-lg object-cover border border-gray-200 ring-2 ring-white shadow-sm"
                          />
                          <div>
                            <p className="font-bold text-gray-900">{product.p_name}</p>
                            <p className="text-[11px] text-gray-500">
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                                {product.cat_name || 'Uncategorized'}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 font-semibold">PHP {Number(product.p_price || 0).toLocaleString()} / {product.p_unit}</td>
                      <td className="px-5 py-4 text-sm">
                        <div className="flex flex-col gap-1">
                          <span className={`font-bold ${stockMeta.isLowStock ? 'text-amber-700' : 'text-gray-700'}`}>
                            {product.p_quantity} {product.p_unit}
                          </span>
                          {stockMeta.isLowStock && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 w-fit">
                              Low stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-xs rounded-full border font-semibold ${getStatusStyles(product.p_status)}`}>
                          {product.p_status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-edit-product', { detail: product }))}
                            className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                            title="Edit Crop"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit Crop
                          </button>
                          {product.p_status === 'active' ? (
                            <button
                              onClick={() => {
                                setProductToArchive(product);
                                setIsArchiveModalOpen(true);
                              }}
                              className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                              title="Archive Crop"
                            >
                              <Archive className="w-4 h-4" />
                              Archive
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnarchive(product.p_id)}
                              className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                            >
                              <RefreshCcw className="w-4 h-4" />
                              Restore
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setProductToDelete(product);
                              setIsDeleteModalOpen(true);
                            }}
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
      </div>

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
          <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors">
            Delete Crop
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => {
          setIsArchiveModalOpen(false);
          setProductToArchive(null);
        }}
        title="Archive Listing"
      >
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 mb-4 flex items-start gap-2">
          <Archive className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            Archive <span className="font-semibold">{productToArchive?.p_name}</span>? Buyers will not see it until restored.
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

export default FarmerListingsPageV2;
