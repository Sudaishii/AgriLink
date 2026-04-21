import React from 'react';
import {
  CheckCircle2,
  Leaf,
  MapPin,
  MessageSquare,
  Package,
  ShoppingCart,
  Star,
  TrendingUp,
} from 'lucide-react';
import Modal from './Modal';
import { getFullImageUrl } from '../../api/apiConfig';
import { useNavigate } from 'react-router-dom';
import * as cartService from '../../services/cartService';
import { getLowStockMeta } from '../../utils/stockThreshold';
import { useToast } from './Toast';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  hideMessageButton?: boolean;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  hideMessageButton = false,
}) => {
  const navigate = useNavigate();
  const { error, info } = useToast();
  const [qty, setQty] = React.useState(1);
  const [cartSuccess, setCartSuccess] = React.useState(false);

  if (!product) return null;

  const id = product.p_id || product.id;
  const name = product.p_name || product.name;
  const price = Number(product.p_price || product.price || 0);
  const quantity = Number(product.p_quantity || product.stock || 0);
  const unit = product.p_unit || product.unit || 'kg';
  const category = product.cat_name || product.category || 'Agri Product';
  const description = product.p_description || product.description || 'No description added yet.';
  const seller = product.first_name
    ? `${product.first_name} ${product.last_name || ''}`.trim()
    : product.seller || 'Verified Farmer';
  const image = product.p_image || product.image;
  const ownerId = product.u_id || product.user_id || product.sellerUserId;

  const currentUserId = localStorage.getItem('agrilink_id');
  const isOwner = Boolean(currentUserId && ownerId && String(currentUserId) === String(ownerId));
  const imageUrl = getFullImageUrl(image);
  const isLowStock = getLowStockMeta(product).isLowStock;

  const handleAddToCart = () => {
    const productObj = {
      id,
      name,
      price,
      unit,
      seller,
      stock: quantity,
      image,
      category,
      location: product.location || 'Local Farm',
    };

    const result = cartService.addToCart(productObj as any, qty);
    if (result.success) {
      if (result.message) {
        info(result.message);
      }
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 1800);
    } else {
      error(result.message || 'Failed to add to cart.');
    }
  };

  const handleBuyNow = () => {
    onClose();
    navigate(`/checkout/${id}?qty=${qty}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-700" />
          <span>Listing Details</span>
        </div>
      }
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            <div className="aspect-[4/3] bg-slate-100 relative">
              {imageUrl ? (
                <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-slate-400">
                  <Package className="w-9 h-9" />
                </div>
              )}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-2 py-1 rounded-lg bg-white/90 text-emerald-800 text-[11px] font-bold border border-emerald-100">
                  {category}
                </span>
                {isLowStock && (
                  <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[11px] font-bold border border-amber-200">
                    Low Stock
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {product.location || 'Local Farm'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold text-slate-500">ID #{String(id || '').padStart(5, '0')}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-[11px] font-semibold text-emerald-700">Verified Listing</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">{name}</h2>
              <div className="mt-3 inline-flex items-center gap-1 text-amber-500">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="text-sm font-semibold text-slate-800 ml-1">{(product as any).avgRating || '0.0'} Farmer Rating</span>
                <span className="text-xs text-slate-500 font-semibold ml-1">({(product as any).reviewCount || 0} reviews)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[11px] text-slate-500 font-semibold">Price</p>
                <p className="text-lg font-black text-emerald-800">PHP {price.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500">per {unit}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500 font-semibold">Available</p>
                <p className={`text-lg font-black ${isLowStock ? 'text-amber-700' : 'text-slate-900'}`}>{quantity}</p>
                <p className="text-[11px] text-slate-500">{unit}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-[11px] text-slate-500 font-semibold">Demand</p>
                <p className="text-lg font-black text-blue-800 inline-flex items-center gap-1"><TrendingUp className="w-4 h-4" />High</p>
                <p className="text-[11px] text-slate-500">market</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500 mb-1">Seller</p>
              <button
                type="button"
                disabled={!ownerId || isOwner}
                onClick={() => ownerId && navigate(`/profile/${ownerId}`)}
                className={`text-left w-full rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  ownerId && !isOwner
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border-slate-200 bg-slate-50 text-slate-600 cursor-default'
                }`}
              >
                {isOwner ? `You (${seller})` : seller}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">Description</p>
          <p className="text-sm text-slate-700 leading-relaxed">{description}</p>
        </div>

        {!isOwner && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">Order Quantity</p>
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-slate-700 hover:bg-slate-50"
                >
                  -
                </button>
                <span className="px-4 py-2 text-sm font-bold text-slate-900">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(quantity || 1, q + 1))}
                  className="px-3 py-2 text-slate-700 hover:bg-slate-50"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Estimated total</span>
              <span className="font-black text-emerald-700">PHP {(price * qty).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleBuyNow}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Buy Now
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                className={`flex-1 px-4 py-2.5 rounded-xl border font-bold inline-flex items-center justify-center gap-2 transition-colors ${
                  cartSuccess
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {cartSuccess ? <CheckCircle2 className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                {cartSuccess ? 'Added' : 'Add to Cart'}
              </button>
              {!hideMessageButton && (
                <button
                  type="button"
                  onClick={() => ownerId && navigate(`/profile/${ownerId}`)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ProductDetailModal;
