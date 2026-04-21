import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, Search, Filter, RefreshCcw, AlertTriangle } from 'lucide-react';
import ProductCard from '../../ui/ProductCard';
import { API_BASE_URL, getStoredAuthToken } from '../../../api/apiConfig';
import type { Product } from '../../../types';

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const userId = localStorage.getItem('agrilink_id');

  useEffect(() => {
    const fetchFavorites = async () => {
      const token = getStoredAuthToken();
      if (!token) {
        setError('Please log in to view your favorites.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/favorites`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok) {
          const mapped: Product[] = (Array.isArray(data.favorites) ? data.favorites : []).map((p: any) => ({
            id: Number(p.p_id ?? p.product_id),
            name: p.p_name || 'Unnamed Product',
            price: Number.parseFloat(p.p_price) || 0,
            unit: p.p_unit || 'unit',
            seller: p.seller_first_name ? `${p.seller_first_name} ${p.seller_last_name || ''}`.trim() : 'Local Farm',
            sellerUserId: Number(p.sellerUserId || 0),
            location: p.seller_city || 'Local Farm',
            stock: Number.parseFloat(p.p_quantity) || 0,
            image: p.p_image || '',
            category: p.cat_name || 'Others',
          })).filter((p: Product) => Number.isFinite(p.id));
          setFavorites(mapped);
        } else {
          throw new Error(data.message || 'Failed to fetch favorites.');
        }
      } catch (err: any) {
        console.error('Error fetching favorites:', err);
        setError(err.message || 'Could not load favorites. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [userId]); // Refetch if userId changes (though unlikely for logged-in user)

  const handleRemoveFavorite = async (productId: number) => {
    const token = getStoredAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/favorites/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        // Remove from local state to update UI immediately
        setFavorites(prevFavorites => prevFavorites.filter(fav => Number(fav.id) !== Number(productId)));
        // Optionally show a success toast
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Failed to remove favorite.');
      }
    } catch (err: any) {
      console.error('Error removing favorite:', err);
      setError(err.message || 'Could not remove favorite.');
    }
  };

  const openProductDetail = (product: Product) => {
    navigate(`/buyer/product/${product.id}`);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="animate-fadeIn">
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">Your Wishlist<span className="text-[#5ba409]">.</span></h1>
            <p className="text-xl text-gray-400 font-medium">Saved items for your future harvests</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
            <p className="font-bold text-amber-900 mb-1">Error loading favorites</p>
            <p className="text-amber-800/90 mb-3">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-amber-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Favorites List */}
        {loading ? (
          <div className="py-40 flex flex-col items-center gap-4">
            <RefreshCcw className="w-12 h-12 text-[#5ba409] animate-spin" />
            <p className="font-black text-gray-300 uppercase tracking-widest text-sm text-center">Loading Wishlist...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.length === 0 && !error && (
              <div className="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-6 h-6 text-gray-300 fill-current" />
                </div>
                <h3 className="text-lg font-black text-gray-900 uppercase">Your wishlist is empty</h3>
                <p className="text-xs text-gray-400 font-bold uppercase mt-1">Add some products you like!</p>
                <button
                  onClick={() => navigate('/buyer/marketplace')}
                  className="mt-6 px-10 py-3 bg-[#5ba409] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                >
                  Shop Now
                </button>
              </div>
            )}

            {favorites.map((fav) => (
              <div key={fav.id} className="relative group"> {/* Container for ProductCard and potential remove button */}
                <ProductCard
                  key={fav.id}
                  product={fav}
                  onClick={() => openProductDetail(fav)}
                />
                {/* Remove from favorites button - appears on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering ProductCard's onClick
                    handleRemoveFavorite(fav.id);
                  }}
                  className="absolute top-3 right-3 z-10 p-1 bg-white/70 backdrop-blur-md rounded-full shadow-sm border border-gray-100 text-red-400 hover:text-red-600 hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Remove from favorites"
                >
                  <Heart className="w-4 h-4 fill-red-400 stroke-red-400" /> {/* Filled heart for removal */}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
