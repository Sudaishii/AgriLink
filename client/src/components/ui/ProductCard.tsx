import React from 'react';
import { MapPin, Heart, ShoppingCart, Star, Package, Plus, User, ShieldCheck, BadgeCheck } from 'lucide-react';
import type { ProductCardProps } from '../../types';
import { useNavigate } from 'react-router-dom';
import { getFullImageUrl } from '../../api/apiConfig';
import * as cartService from '../../services/cartService';
import { useToast } from './Toast';

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onClick, 
  viewMode = 'grid', 
  isFavorited = false, 
  onToggleFavorite 
}) => {
  const navigate = useNavigate();
  const { info, success, error } = useToast();
  const imageUrl = getFullImageUrl(product.image);
  const isOutOfStock = Number(product.stock || 0) <= 0;
  
  const myUserId = Number(localStorage.getItem('agrilink_id') || localStorage.getItem('agrilink_userId'));
  const isOwnListing = Boolean(myUserId && product.sellerUserId && myUserId === product.sellerUserId);
  const userRole = localStorage.getItem('agrilink_role')?.toLowerCase() || 'buyer';
  const isFarmer = userRole === 'farmer';
  const isAdmin = userRole === 'admin' || userRole === 'brgy_official' || userRole === 'lgu_official';
  const canFavorite = !isAdmin && !isFarmer && Boolean(onToggleFavorite);
  const isArchived = product.status === 'archived' || (product as any).p_status === 'archived';

  const handleClick = () => {
    if (onClick) onClick();
    else navigate(`/buyer/product/${product.id}`);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) {
      info('This item is sold out.');
      return;
    }
    const result = await cartService.addToCart(product, 1);
    if (result.success) {
      if (result.message) {
        info(result.message);
      } else {
        success(`${product.name} added to cart`);
      }
    } else {
      error(result.message || 'Could not add to cart.');
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(Number(product.id), e);
    }
  };

  const handleViewFarmer = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sellerUserId = Number(product.sellerUserId || 0);
    if (!Number.isFinite(sellerUserId) || sellerUserId <= 0) {
      info('Farmer profile is unavailable for this listing.');
      return;
    }
    navigate(`/profile/${sellerUserId}`);
  };

  if (viewMode === 'list') {
    return (
      <div 
        onClick={handleClick}
        className={`bg-white border border-gray-100 rounded-3xl overflow-hidden transition-all duration-300 group cursor-pointer ${
          isOutOfStock ? 'opacity-80' : 'hover:border-[#5ba409]/30 hover:shadow-xl'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center p-5 gap-8">
          <div className={`w-full sm:w-48 aspect-video rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-50 relative group/img ${isOutOfStock ? 'grayscale' : ''}`}>
             {imageUrl.length > 5 ? (
               <img src={imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-gray-200">
                  <Package size={32} />
               </div>
             )}
             {isOutOfStock && (
               <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                 <span className="px-3 py-1 rounded-full bg-black/80 text-white text-[10px] font-black uppercase tracking-[0.2em]">Sold Out</span>
               </div>
             )}
              {canFavorite && (
                <button
                  onClick={handleFavoriteClick}
                  className={`absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm z-20 ${
                    isFavorited 
                    ? 'bg-red-50 text-red-500' 
                    : 'bg-white/90 backdrop-blur-md text-gray-400 hover:text-red-500'
                  }`}
                >
                  <Heart size={16} className={isFavorited ? 'fill-current' : ''} />
                </button>
              )}
              {product.isVerified && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/95 backdrop-blur-md shadow-sm border border-green-100 z-10 transition-transform group-hover/img:scale-105">
                  <BadgeCheck size={14} className="text-[#5ba409] fill-green-50" />
                  <span className="text-[10px] font-black text-[#5ba409] uppercase tracking-widest leading-none">Verified Farmer</span>
                </div>
              )}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
             <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-green-50 text-[#5ba409] text-[10px] font-black uppercase tracking-widest rounded-lg border border-green-100/50">{product.category}</span>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-none">Stock: {product.stock} {product.unit}</p>
             </div>
             
             <div>
                <h3 className="text-2xl font-black text-gray-900 group-hover:text-[#5ba409] transition-colors truncate tracking-tight">{product.name}</h3>
                <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                       <User size={12} className="text-[#5ba409]" /> <span title="Verified Farmer">{product.seller}</span>
                       {product.isVerified && <BadgeCheck size={14} className="text-[#5ba409] fill-green-50" />}
                    </div>
                   <button
                     onClick={handleViewFarmer}
                     className="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#5ba409] hover:bg-green-100"
                   >
                     View Farmer
                   </button>
                    <div className="flex items-center gap-1">
                       {(product as any).avgRating > 0 ? (
                         <>
                           <Star size={11} className="fill-amber-400 text-amber-400" />
                           <span className="text-[11px] font-black text-gray-900">{(product as any).avgRating.toFixed(1)} Rating</span>
                         </>
                       ) : (
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No ratings yet</span>
                       )}
                    </div>
                </div>
             </div>
          </div>

          <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-5 sm:border-l sm:border-gray-50 sm:pl-10 sm:py-2">
             <div className="text-right">
                <div className="flex items-baseline gap-1 text-gray-900">
                   <span className="text-sm font-bold opacity-30">₱</span>
                   <span className="text-3xl font-black tracking-tighter">{product.price.toLocaleString()}</span>
                   <span className="text-[11px] font-bold text-gray-400 italic">/ {product.unit}</span>
                </div>
             </div>
             <button 
               onClick={handleAddToCart}
               disabled={isOutOfStock || isOwnListing || isAdmin}
               className={`h-12 px-10 rounded-2xl flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest ${
                 isOutOfStock
                   ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                   : isOwnListing
                   ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                   : isAdmin
                   ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                   : 'bg-[#5ba409] text-white hover:bg-green-700 shadow-xl shadow-green-900/10 active:scale-95'
               }`}
             >
                <Plus size={18} /> {isOutOfStock ? 'Sold Out' : isOwnListing ? 'Your Listing' : isAdmin ? 'Admin View' : 'Add to Cart'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-[2rem] overflow-hidden border border-gray-100 group transition-all duration-500 cursor-pointer flex flex-col h-full relative ${
        isOutOfStock
          ? 'opacity-85'
          : 'hover:border-[#5ba409]/20 hover:shadow-[0_25px_50px_-15px_rgba(0,0,0,0.06)]'
      }`}
    >
      <div className={`relative aspect-video overflow-hidden bg-gray-50 border-b border-gray-50/50 ${isOutOfStock ? 'grayscale' : ''}`}>
        <img
          src={imageUrl.length > 5 ? imageUrl : undefined}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {(imageUrl.length <= 5) && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-200">
             <Package size={32} />
          </div>
        )}

        {canFavorite && (
          <button
            onClick={handleFavoriteClick}
            className={`absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-xl shadow-black/5 z-20 ${
              isFavorited 
              ? 'bg-white text-red-500 scale-110' 
              : 'bg-white/80 backdrop-blur-md text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100'
            }`}
          >
            <Heart size={16} className={isFavorited ? 'fill-current' : ''} />
          </button>
        )}

        {product.isVerified && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md shadow-sm border border-green-100 transition-transform group-hover/img:scale-105">
            <BadgeCheck size={14} className="text-[#5ba409] fill-green-50" />
            <span className="text-[10px] font-black text-[#5ba409] uppercase tracking-widest leading-none">Verified Farmer</span>
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute top-4 left-4 z-10">
            <span className="px-3 py-1.5 rounded-xl bg-black/85 text-white text-[10px] font-black uppercase tracking-[0.2em]">
              Sold Out
            </span>
          </div>
        )}

        <div className="absolute bottom-4 left-4">
          <div className={`backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-100 flex items-center gap-1.5 shadow-sm ${
            isOutOfStock ? 'bg-gray-200/90 text-gray-700' : 'bg-white/90 text-gray-900'
          }`}>
            <MapPin size={10} className="text-[#5ba409]" />
            <span className="text-[10px] font-black tracking-tight uppercase tracking-[0.1em] leading-none">{product.location}</span>
          </div>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
             <span className="text-[9px] font-black text-[#5ba409] uppercase tracking-[0.2em] px-2.5 py-1 bg-green-50 rounded-lg border border-green-100/30">
               {product.category}
             </span>
             {/* 🎖️ Seller Global Rating (Star Display) */}
             <div className="flex items-center gap-1">
                {(product as any).avgRating > 0 ? (
                  <>
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    <span className="text-[11px] font-black text-gray-900">{(product as any).avgRating.toFixed(1)} Farmer Rating</span>
                  </>
                ) : (
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No ratings yet</span>
                )}
             </div>
          </div>
          
          <h3 className="text-lg font-black text-gray-900 leading-tight group-hover:text-[#5ba409] transition-colors truncate tracking-tight mb-2">
            {product.name}
          </h3>
          
          <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                 <User size={12} className="text-[#5ba409]" /> <span title="Verified Farmer">{product.seller}</span>
                 {product.isVerified && <BadgeCheck size={14} className="text-[#5ba409] fill-green-50" />}
              </div>
             <button
               onClick={handleViewFarmer}
               className="w-fit rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#5ba409] hover:bg-green-100"
             >
               View Farmer
             </button>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Price / {product.unit}</span>
            <div className="flex items-baseline gap-0.5 text-gray-900">
              <span className="text-xs font-bold opacity-30">₱</span>
              <span className="text-[26px] font-black tracking-tighter leading-none">{product.price.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || isOwnListing || isAdmin}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 overflow-hidden relative ${
              isOutOfStock
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : isOwnListing
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                : isAdmin
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#5ba409] text-white hover:bg-green-700 shadow-xl shadow-green-900/10 active:scale-95 group/btn'
            }`}
            title={isOutOfStock ? 'Sold out' : isOwnListing ? 'Your Listing' : isAdmin ? 'View Only' : 'Add to cart'}
          >
            <Plus size={22} className="z-10" />
            {!isOutOfStock && !isOwnListing && !isAdmin && (
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
