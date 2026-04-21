import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  ChevronDown,
  LayoutGrid,
  List,
  Heart,
  Package,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  User,
  Star,
  Camera,
  Loader2,
  MapPin,
  Navigation,
  Info,
  Map as MapIcon,
  Phone,
  Clock,
  Lock,
  Eye,
  BadgeCheck
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProductCard from '../ui/ProductCard';
import { API_BASE_URL, getFullImageUrl } from '../../api/apiConfig';
import type { Product } from '../../types';
import { useToast } from '../ui/Toast';

const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { info, error, success } = useToast();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000000);
  const [sortBy, setSortBy] = useState<string>('date');
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageSearchActive, setImageSearchActive] = useState(false);
  const [imageMatchedIds, setImageMatchedIds] = useState<number[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState<number | null>(null);
  const [farmerSearchTerm, setFarmerSearchTerm] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('agrilink_token');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAnalyzingImage(true);
      setImageSearchActive(false);
      setImageMatchedIds([]);
      info('🔍 Finding similar product...');

      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_BASE_URL}/search/image`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Vector search failed');
      const data = await res.json();

      if (data.success && data.matches && data.matches.length > 0) {
        const matchedIds = data.matches.map((m: any) => Number(m.productId));
        setImageMatchedIds(matchedIds);
        setImageSearchActive(true);
        setSearchTerm('');
        success(`✅ Found ${data.matches.length} visually similar product${data.matches.length > 1 ? 's' : ''}!`);
      } else if (data.success && data.totalIndexed === 0) {
        error('No products are indexed yet. Add product images and they will be automatically indexed.');
      } else {
        error('No visually similar products found. Try a clearer photo of the product.');
      }
    } catch (err) {
      console.error('Image search error:', err);
      error('Failed to run image search. Please try again.');
    } finally {
      setAnalyzingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearImageSearch = () => {
    setImageSearchActive(false);
    setImageMatchedIds([]);
  };

  const fetchFavorites = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.favorites) {
          const ids = data.favorites
            .map((f: any) => Number(f.p_id ?? f.product_id))
            .filter((id: number) => Number.isFinite(id));
          setFavoriteIds(ids);
        }
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    }
  };

  useEffect(() => {
    fetchFavorites();
    const handleFocus = () => fetchFavorites();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [token]);

  const handleToggleFavorite = async (productId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) {
      info('Sign in to save harvests.');
      navigate('/login');
      return;
    }
    const isFav = favoriteIds.includes(productId);
    const previousFavorites = [...favoriteIds];
    if (isFav) setFavoriteIds(prev => prev.filter(id => id !== productId));
    else setFavoriteIds(prev => [...prev, productId]);

    try {
      const method = isFav ? 'DELETE' : 'POST';
      const url = isFav ? `${API_BASE_URL}/favorites/${productId}` : `${API_BASE_URL}/favorites`;
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: isFav ? undefined : JSON.stringify({ productId })
      });
      if (!res.ok) {
        setFavoriteIds(previousFavorites);
        error('Action failed.');
      } else {
        if (isFav) success('Harvest unsaved.');
        else success('Harvest saved!');
      }
    } catch (err) {
      setFavoriteIds(previousFavorites);
      error('Network error.');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/products`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.products) {
        const mappedProducts: Product[] = data.products.map((p: any) => ({
          id: p.p_id,
          name: p.p_name,
          price: parseFloat(p.p_price),
          unit: p.p_unit,
          seller: `${p.first_name} ${p.last_name}`,
          location: p.city || 'Local Farm',
          stock: parseFloat(p.p_quantity),
          image: getFullImageUrl(p.p_image),
          category: p.cat_name || 'Others',
          badges: [],
          avgRating: p.sellerAvgRating ? parseFloat(p.sellerAvgRating) : 0,
          reviewCount: parseInt(p.sellerReviewCount) || 0,
          isVerified: Boolean(p.isVerified),
          sellerUserId: Number(p.u_id)
        }));
        setProducts(mappedProducts);
      }
    } catch (err) {
      setFetchError('Currently unable to load products.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableFarmers = async () => {
     try {
       const res = await fetch(`${API_BASE_URL}/users/farmers/all`);
       if (res.ok) {
         const data = await res.json();
         setFarmers(data || []);
       }
     } catch (err) {
       console.error('Failed to fetch farmers', err);
     }
  };

  useEffect(() => {
    fetchProducts();
    fetchAvailableFarmers();

    if (location.state && (location.state as any).farmerId) {
       setSelectedFarmerId((location.state as any).farmerId);
       // Clear state so it doesn't stick on refresh
       window.history.replaceState({}, document.title);
    }

    const handleRefresh = () => fetchProducts();
    window.addEventListener('product-added', handleRefresh);
    window.addEventListener('product-updated', handleRefresh);

    return () => {
      window.removeEventListener('product-added', handleRefresh);
      window.removeEventListener('product-updated', handleRefresh);
    };
  }, []);
  const filteredProducts = useMemo(() => {
    // If image search is active, filter to matched IDs first (ranked order)
    let pool = products;
    if (imageSearchActive && imageMatchedIds.length > 0) {
      const idSet = new Set(imageMatchedIds);
      // Keep rank order from AI results
      pool = imageMatchedIds
        .map(id => products.find(p => Number(p.id) === id))
        .filter(Boolean) as Product[];
      // Also apply any remaining filters on top
      pool = pool.filter(product => {
        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
        const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
        const matchesFavorite = !showFavoritesOnly || favoriteIds.includes(Number(product.id));
        const matchesFarmer = !selectedFarmerId || Number(product.sellerUserId) === selectedFarmerId;
        return matchesCategory && matchesPrice && matchesFavorite && matchesFarmer;
      });
      return pool;
    }

    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           product.seller.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
      const matchesFavorite = !showFavoritesOnly || favoriteIds.includes(Number(product.id));
      const matchesFarmer = !selectedFarmerId || Number(product.sellerUserId) === selectedFarmerId;
      return matchesSearch && matchesCategory && matchesPrice && matchesFavorite && matchesFarmer;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'rating') return (b as any).avgRating - (a as any).avgRating;
      if (sortBy === 'reviews') return (b as any).reviewCount - (a as any).reviewCount;
      return Number(b.id) - Number(a.id); // Default: Date newest first
    });
  }, [products, searchTerm, selectedCategory, minPrice, maxPrice, showFavoritesOnly, favoriteIds, sortBy, imageSearchActive, imageMatchedIds, selectedFarmerId]);

  const categories = ['All', 'Rice & Corn', 'Vegetables', 'Leafy Greens', 'Root Crops', 'Fruits', 'Herbs & Spices', 'Beans & Nuts', 'Others (Default)'];

  const filteredFarmers = useMemo(() => {
    return farmers.filter(f => f.name.toLowerCase().includes(farmerSearchTerm.toLowerCase()));
  }, [farmers, farmerSearchTerm]);

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      
      {/* 🏙️ Clean & Neat SaaS Marketplace Header */}
      <div className="bg-white border-b border-gray-100 py-8 lg:py-10">
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center text-[#5ba409]">
                  <Sparkles size={12} />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5ba409]">Digital Agriculture Marketplace</span>
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
              Marketplace<span className="text-[#5ba409]">.</span>
            </h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Connecting buyers directly to farmers</p>
          </div>
          <div className="flex-1 max-w-xl w-full relative group">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search harvests, farmers, or locations..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); clearImageSearch(); }}
                className="w-full pl-12 pr-12 py-3.5 bg-white border border-[#5ba409]/20 rounded-2xl text-sm font-medium transition-all outline-none placeholder:text-gray-300 shadow-sm focus:border-[#5ba409]/40 focus:ring-4 focus:ring-[#5ba409]/5"
              />
              <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#5ba409] transition-colors" />
              {imageSearchActive ? (
                <button
                  onClick={clearImageSearch}
                  title="Clear image search"
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-[#5ba409] text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg hover:bg-green-700 transition-all"
                >
                  <Camera className="w-3 h-3" /> Clear
                </button>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={analyzingImage}
                  title="Search by Image (CLIP AI)"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5ba409] transition-colors disabled:opacity-50"
                >
                  {analyzingImage ? <Loader2 className="w-5 h-5 animate-spin text-[#5ba409]" /> : <Camera className="w-5 h-5" />}
                </button>
              )}
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleImageUpload} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 Functional Sticky Bar - Layout Fixed */}
      <div className="sticky top-[72px] z-30 bg-white/80 backdrop-blur-md border-b border-gray-50 py-3.5">
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#5ba409]" />
              <p className="text-[11px] font-black text-gray-900 uppercase tracking-widest">
                {imageSearchActive
                  ? <><span className="text-[#5ba409]">Image Match</span>: {filteredProducts.length} visually similar product{filteredProducts.length !== 1 ? 's' : ''}</>
                  : <>Active Listings: <span className="text-[#5ba409]">{filteredProducts.length}</span></>
                }
              </p>
           </div>
           
           <div className="flex items-center gap-6">
              {/* 🛠️ Improved Layout Toggle (SaaS Style) */}
              <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-100 shrink-0">
                  <button 
                   onClick={() => setViewMode('grid')} 
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest ${viewMode === 'grid' ? 'bg-[#5ba409] text-white shadow-md shadow-[#5ba409]/10' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                     <LayoutGrid size={12} /> Grid
                  </button>
                  <button 
                   onClick={() => setViewMode('list')} 
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest ${viewMode === 'list' ? 'bg-[#5ba409] text-white shadow-md shadow-[#5ba409]/10' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                     <List size={12} /> List
                  </button>
              </div>

              <div className="flex items-center gap-2 relative">
                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Sort:</span>
                 <button
                   onClick={() => setIsSortOpen(!isSortOpen)}
                   className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-100 px-3 py-1.5 rounded-lg transition-all"
                 >
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                     {sortBy === 'date' ? 'Date (Newest)' : sortBy === 'name' ? 'Name (A-Z)' : sortBy === 'rating' ? 'Farmer Rating' : 'Farmer Reviews'}
                   </span>
                   <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
                 </button>

                 {isSortOpen && (
                   <>
                     <div 
                       className="fixed inset-0 z-40" 
                       onClick={() => setIsSortOpen(false)} 
                     />
                     <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50 py-1">
                       {[
                         { value: 'date', label: 'By Date (Newest)' },
                         { value: 'name', label: 'By Name (A-Z)' },
                         { value: 'rating', label: 'Farmer Rating' },
                         { value: 'reviews', label: 'Farmer Review Count' },
                       ].map(opt => (
                         <button
                           key={opt.value}
                           onClick={() => { setSortBy(opt.value); setIsSortOpen(false); }}
                           className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                             sortBy === opt.value ? 'bg-[#5ba409] text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                           }`}
                         >
                           {opt.label}
                         </button>
                       ))}
                     </div>
                   </>
                 )}
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 py-10 flex flex-col lg:flex-row gap-10">
        <aside className="w-full lg:w-56 shrink-0">
           <div className="sticky top-[140px] space-y-8">
              {token && (
                <div className="pb-8 border-b border-gray-100">
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`w-full p-1 rounded-[1.5rem] flex items-center transition-all group ${
                      showFavoritesOnly 
                      ? 'bg-[#5ba409] text-white shadow-xl shadow-green-900/20' 
                      : 'bg-white border border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-900'
                    }`}
                  >
                     <div className={`p-3 rounded-2xl transition-all ${showFavoritesOnly ? 'bg-white/20' : 'bg-gray-50 text-[#5ba409]'}`}>
                        <Heart size={16} className={showFavoritesOnly ? 'fill-current' : ''} />
                     </div>
                     <div className="flex-1 px-3 text-left">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${showFavoritesOnly ? 'text-white' : 'text-gray-900'}`}>Saved Items</p>
                        <p className={`text-[9px] font-bold ${showFavoritesOnly ? 'text-white/60' : 'text-gray-400'}`}>Source Later</p>
                     </div>
                     <div className={`mr-2 px-3 py-1 rounded-full text-[11px] font-black ${showFavoritesOnly ? 'bg-white text-[#5ba409]' : 'bg-[#5ba409] text-white'}`}>
                        {favoriteIds.length}
                     </div>
                  </button>
                </div>
              )}

              <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Local Farmers</h3>
                    <div className="relative">
                       <Search size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300" />
                       <input 
                        type="text" 
                        placeholder="Search..." 
                        value={farmerSearchTerm}
                        onChange={(e) => setFarmerSearchTerm(e.target.value)}
                        className="bg-gray-50 border-none rounded-lg py-1 pl-2 pr-6 text-[9px] w-24 outline-none focus:ring-1 focus:ring-[#5ba409]/20"
                       />
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    <button
                      onClick={() => setSelectedFarmerId(null)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        !selectedFarmerId 
                        ? 'bg-[#5ba409] text-white shadow-lg shadow-green-900/10' 
                        : 'text-gray-400 hover:bg-green-50/50 hover:text-[#5ba409]'
                      }`}
                    >
                      All Farmers
                    </button>
                    {filteredFarmers.map((farmer) => (
                      <button
                        key={farmer.id}
                        onClick={() => setSelectedFarmerId(farmer.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-3 ${
                          selectedFarmerId === farmer.id 
                          ? 'bg-white border-[#5ba409] text-[#5ba409] shadow-sm ring-1 ring-[#5ba409]/20' 
                          : 'text-gray-500 hover:bg-green-50/50 border-transparent'
                        } border`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                           {farmer.profile_image ? (
                             <img src={getFullImageUrl(farmer.profile_image)} alt="" className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center bg-green-50 text-[10px] font-black text-[#5ba409] uppercase">
                               {(farmer.first_name?.[0] || '') + (farmer.last_name?.[0] || '') || 'F'}
                             </div>
                           )}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          <span className="truncate">{farmer.name}</span>
                          {farmer.badge_label && (
                            <BadgeCheck size={12} className="text-[#5ba409] fill-green-50 shrink-0" />
                          )}
                        </div>
                        {selectedFarmerId === farmer.id && <div className="w-1 h-3 bg-[#5ba409] rounded-full" />}
                      </button>
                    ))}
                  </div>
               </div>

              <div className="pt-8 border-t border-gray-100 space-y-3">
                 <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Collections</h3>
                 <div className="flex flex-col gap-0.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                          selectedCategory === cat 
                          ? 'bg-[#5ba409] text-white shadow-lg shadow-green-900/10' 
                          : 'text-gray-500 hover:bg-green-50/50 hover:text-[#5ba409]'
                        }`}
                      >
                        {cat}
                        {selectedCategory === cat && <ChevronRight size={12} className="opacity-60" />}
                      </button>
                    ))}
                 </div>
              </div>
           </div>
        </aside>

        <main className="flex-1 min-w-0">
           {loading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
               {[...Array(8)].map((_, i) => (
                 <div key={i} className="bg-gray-50 animate-pulse rounded-2xl aspect-[16/9]" />
               ))}
             </div>
           ) : (
             <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-5 animate-in fade-in duration-500`}>
               {filteredProducts.map((p) => (
                 <ProductCard
                   key={p.id}
                   product={p}
                   viewMode={viewMode}
                   isFavorited={favoriteIds.includes(Number(p.id))}
                   onToggleFavorite={handleToggleFavorite}
                   onClick={() => navigate(`/buyer/product/${p.id}`)}
                 />
               ))}
             </div>
           )}

           {!loading && filteredProducts.length === 0 && (
             <div className="py-24 text-center bg-gray-50/50 border border-gray-100 rounded-[2rem]">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-50">
                   <Package size={24} className="text-gray-100" />
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Zero Harvests matches</h3>
                <button
                  onClick={() => { setSearchTerm(''); setMinPrice(0); setMaxPrice(1000000); setSelectedCategory('All'); setShowFavoritesOnly(false); }}
                  className="mt-8 px-8 py-3 bg-[#5ba409] text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-green-900/10 hover:bg-green-700 transition-all"
                >
                  Reset Marketplace
                </button>
             </div>
           )}
        </main>
      </div>
    </div>
  );
};

export default MarketplacePage;
