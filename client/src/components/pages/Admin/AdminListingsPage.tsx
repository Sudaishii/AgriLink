import React, { useState, useEffect } from 'react';
import { Search, Filter, Package, Tag, Eye, ShoppingCart, Info } from 'lucide-react';
import { API_BASE_URL, getFullImageUrl } from '../../../api/apiConfig';

const AdminListingsPage: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/products`);
                if (res.ok) {
                    const data = await res.json();
                    setProducts(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error('Failed to fetch products:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const filteredProducts = products.filter(p => 
        String(p.p_name).toLowerCase().includes(searchQuery.toLowerCase()) || 
        String(p.u_firstName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#FDFDFD]">
            {/* 🏙️ Comprehensive Catalog Header */}
            <div className="bg-white border-b border-gray-100 py-10">
                <div className="max-w-[1600px] mx-auto px-6 sm:px-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                <Package size={12} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5ba409]">Market Products</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
                            Product List<span className="text-[#5ba409]">.</span>
                        </h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">View and manage all active products in the market</p>
                    </div>
                    <div className="flex-1 max-w-xl w-full relative group">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter catalog by product or farmer..."
                                className="w-full pl-12 pr-6 py-3.5 bg-white border border-[#5ba409]/20 rounded-2xl text-sm font-medium transition-all outline-none placeholder:text-gray-300 shadow-sm focus:border-[#5ba409]/40 focus:shadow-green-900/5"
                            />
                            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#5ba409] transition-colors" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 🚀 Monitoring Stats Bar */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-50 py-3.5 sticky top-[72px] z-30">
                <div className="max-w-[1600px] mx-auto px-6 sm:px-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#5ba409]" />
                        <p className="text-[11px] font-black text-gray-900 uppercase tracking-widest">
                            Total Products: <span className="text-[#5ba409]">{products.length}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest text-gray-500">
                           <Filter size={12} /> All Categories
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto px-6 sm:px-10 py-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {loading ? (
                        <div className="col-span-full py-10 text-center text-gray-400">Loading catalog...</div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="col-span-full py-10 text-center text-gray-400">No active products found</div>
                    ) : (
                        filteredProducts.map((product) => (
                            <div key={product.p_id} className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-green-900/5 transition-all duration-500 flex flex-col">
                                {/* Product Image Area */}
                                <div className="relative aspect-[4/3] overflow-hidden bg-gray-50 flex items-center justify-center">
                                    {product.p_image ? (
                                        <img src={getFullImageUrl(product.p_image)} alt={product.p_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-90 group-hover:opacity-100" />
                                    ) : (
                                        <Package className="w-12 h-12 text-gray-300" />
                                    )}
                                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg border border-white/50 flex items-center gap-1.5">
                                        <Tag className="w-3 h-3 text-[#5ba409]" />
                                        <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">{product.cat_name || 'Crop'}</span>
                                    </div>
                                </div>
                                
                                {/* Product Info Area */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="min-w-0 pr-2">
                                            <h3 className="text-[17px] font-black text-gray-900 leading-tight group-hover:text-[#5ba409] transition-colors truncate">{product.p_name}</h3>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider truncate">
                                                Farmer: <span className="text-gray-700">{product.u_firstName} {product.u_lastName}</span>
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[17px] font-black text-[#5ba409]">₱{(Number(product.p_price)||0).toLocaleString()}</p>
                                            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{product.p_unit}</p>
                                        </div>
                                    </div>

                                    {/* Stock & Sales Info */}
                                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50 mb-6">
                                        <div>
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Stock</p>
                                            <div className="flex items-center gap-1.5 font-black text-gray-800 text-[13px]">
                                                <Package className="w-3.5 h-3.5 text-[#5ba409]" />
                                                {product.p_quantity} <span className="text-gray-400 font-bold max-w-[40px] truncate">{product.p_unit}s</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Status</p>
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase ${
                                                product.p_status === 'active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-500 border-gray-200'
                                            }`}>
                                                {product.p_status || 'Active'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Monitoring CTA */}
                                    <button className="w-full mt-auto py-3 bg-gray-50 border border-gray-100 hover:bg-white hover:border-[#5ba409] hover:text-[#5ba409] transition-all rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <Info size={14} /> Full Product Details
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Comprehensive Reset / View All */}
                <div className="mt-16 text-center">
                    <button className="px-10 py-5 bg-white border-2 border-dashed border-gray-100 rounded-[2rem] font-black text-gray-300 hover:border-[#5ba409] hover:text-[#5ba409] transition-all uppercase tracking-[0.2em] text-[10px]">
                       No more listings to display for this region
                    </button>
                </div>
            </main>
        </div>
    );
};

export default AdminListingsPage;

