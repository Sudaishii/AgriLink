import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  MapPin,
  MessageSquare,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Star,
  User,
  BadgeCheck,
} from 'lucide-react';
import type { Product } from '../../../types';
import { API_BASE_URL, getFullImageUrl } from '../../../api/apiConfig';
import * as cartService from '../../../services/cartService';
import { useToast } from '../../ui/Toast';

type ProductRecord = {
  p_id?: number;
  p_name?: string;
  p_description?: string;
  p_price?: number | string;
  p_quantity?: number | string;
  p_unit?: string;
  p_image?: string;
  cat_name?: string;
  city?: string;
  first_name?: string;
  last_name?: string;
  u_id?: number | string;
  user_id?: number | string;
  farmer_id?: number | string;
  sellerAvgRating?: number | string;
  sellerReviewCount?: number | string;
  p_original_quantity?: number | string;
  sold7d?: number | string;
  sold14d?: number | string;
  sold30d?: number | string;
  completedOrders30d?: number | string;
};

type FarmerServiceReview = {
  fsr_id?: number;
  req_id?: number;
  rating: number;
  comment?: string;
  created_at?: string;
  product_name_snapshot?: string;
  first_name?: string;
  last_name?: string;
};

type FarmerProfile = {
  id?: number;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  phone?: string;
  city?: string;
  province?: string;
  zip_code?: string;
  farm_city?: string;
  farm_province?: string;
  farm_zip_code?: string;
  farm_name?: string;
  farm_image?: string;
  resolved_farm_city?: string;
  resolved_farm_province?: string;
  resolved_farm_zip_code?: string;
  farm_address?: string;
  resolved_farm_address?: string;
  address?: string;
  created_at?: string;
  onboarding_completed?: number | boolean;
  is_verified?: number | boolean;
  role?: string;
  latitude?: number | string;
  longitude?: number | string;
  farm_latitude?: number | string;
  farm_longitude?: number | string;
  resolved_latitude?: number | string | null;
  resolved_longitude?: number | string | null;
  farm_gallery_images?: string[];
  rating?: {
    average?: number;
    count?: number;
  };
  sales?: {
    completed_orders?: number;
    completed_units?: number;
  };
  badge?: {
    implemented?: boolean;
    label?: string;
    status?: string;
    description?: string;
  };
  badges?: Array<{
    badge_type?: string;
    badge_label?: string;
    revoked_at?: string | null;
  }>;
  reviews?: Array<{
    r_id?: number;
    rating?: number;
    comment?: string;
    created_at?: string;
    product_name?: string;
    first_name?: string;
    last_name?: string;
  }>;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const asText = (value: unknown, fallback = ''): string => {
  const out = String(value ?? '').trim();
  return out || fallback;
};

const nameInitials = (fullName: string): string => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
};

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError, info: showInfo } = useToast();

  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'farmer'>('overview');
  const [reviews, setReviews] = useState<FarmerServiceReview[]>([]);

  const token = localStorage.getItem('agrilink_token');
  const userRole = localStorage.getItem('agrilink_role')?.toLowerCase() || 'buyer';
  const isFarmer = userRole === 'farmer';
  const isAdmin = userRole === 'admin' || userRole === 'brgy_official' || userRole === 'lgu_official';

  useEffect(() => {
    let cancelled = false;

    const fetchProductData = async () => {
      try {
        setLoading(true);

        const productRes = await fetch(`${API_BASE_URL}/products/${id}`);
        if (!productRes.ok) throw new Error('Product not found');

        const productData = (await productRes.json()) as { product?: ProductRecord };
        const nextProduct = productData.product ?? null;
        if (!cancelled) setProduct(nextProduct);

        const farmerId = toNumber(nextProduct?.u_id ?? nextProduct?.user_id ?? nextProduct?.farmer_id);
        if (farmerId > 0) {
          const farmerRes = await fetch(`${API_BASE_URL}/users/public/${farmerId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (!cancelled) {
            if (farmerRes.ok) {
              const publicProfile = (await farmerRes.json()) as FarmerProfile;

              const hasCoreFarmFields = Boolean(
                asText(publicProfile?.farm_name) ||
                asText(publicProfile?.resolved_farm_city) ||
                asText(publicProfile?.farm_city) ||
                asText(publicProfile?.city) ||
                asText(publicProfile?.resolved_farm_address) ||
                asText(publicProfile?.farm_address) ||
                asText(publicProfile?.address)
              );

              // Fallback to full profile endpoint when public payload is missing core fields.
              if (!hasCoreFarmFields && token) {
                try {
                  const userRes = await fetch(`${API_BASE_URL}/users/${farmerId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (userRes.ok && !cancelled) {
                    const fullProfile = (await userRes.json()) as FarmerProfile;
                    setFarmerProfile({
                      ...publicProfile,
                      ...fullProfile,
                      // Keep computed public aggregates when available
                      rating: publicProfile.rating || fullProfile.rating,
                      sales: publicProfile.sales || fullProfile.sales,
                      reviews: publicProfile.reviews || fullProfile.reviews,
                      badge: publicProfile.badge || fullProfile.badge,
                      farm_gallery_images: publicProfile.farm_gallery_images || fullProfile.farm_gallery_images,
                    });
                  } else {
                    setFarmerProfile(publicProfile);
                  }
                } catch {
                  setFarmerProfile(publicProfile);
                }
              } else {
                setFarmerProfile(publicProfile);
              }
            } else {
              setFarmerProfile(null);
            }
          }
        } else if (!cancelled) {
          setFarmerProfile(null);
        }

        if (farmerId > 0) {
          const reviewRes = await fetch(`${API_BASE_URL}/reviews/farmer/${farmerId}`);
          if (!cancelled) {
            if (reviewRes.ok) {
              const reviewData = (await reviewRes.json()) as { reviews?: FarmerServiceReview[] };
              setReviews(Array.isArray(reviewData.reviews) ? reviewData.reviews : []);
            } else {
              setReviews([]);
            }
          }
        } else if (!cancelled) {
          setReviews([]);
        }
      } catch {
        if (!cancelled) console.error('Unable to load product details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProductData();
    window.scrollTo(0, 0);

    return () => {
      cancelled = true;
    };
  }, [id]);

  const averageRating = useMemo(() => {
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + toNumber(r.rating), 0);
      return (sum / reviews.length).toFixed(1);
    }
    return toNumber(product?.sellerAvgRating, 0).toFixed(1);
  }, [product?.sellerAvgRating, reviews]);

  const reviewCount = useMemo(() => {
    if (reviews.length > 0) return reviews.length;
    return toNumber(product?.sellerReviewCount, 0);
  }, [product?.sellerReviewCount, reviews]);

  const ratingBreakdown = useMemo(
    () => [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: reviews.filter((r) => toNumber(r.rating) === s).length })),
    [reviews]
  );

  const handleChatFarmer = () => {
    if (!token) {
      showInfo('Please log in to message the farmer.');
      navigate('/login');
      return;
    }

    const farmerId = toNumber(product?.u_id ?? farmerProfile?.id);
    const myId = toNumber(localStorage.getItem('agrilink_id'));

    if (farmerId <= 0) {
      showError('Farmer profile is unavailable.');
      return;
    }

    if (myId > 0 && myId === farmerId) {
      showInfo('This is your own listing.');
      return;
    }

    const productName = asText(product?.p_name, 'your listing');
    const farmerName = asText(
      `${asText(farmerProfile?.first_name)} ${asText(farmerProfile?.last_name)}`,
      asText(`${asText(product?.first_name)} ${asText(product?.last_name)}`, 'Farmer')
    );
    const params = new URLSearchParams({
      contactId: String(farmerId),
      contactName: farmerName,
      contactImage: asText(farmerProfile?.profile_image),
      contactRole: asText(farmerProfile?.role, 'farmer'),
      startConversation: '1',
      productId: String(toNumber(product?.p_id)),
      productName,
    });

    navigate(`/messages?${params.toString()}`);
  };

  const handleViewFarmerOnMap = () => {
    if (isAdmin) {
      showInfo('Map view is unavailable for this role.');
      return;
    }
    if (isOwnListing) {
      showInfo('This is your own listing.');
      return;
    }
    const targetFarmerId = toNumber(product?.u_id ?? farmerProfile?.id);
    if (targetFarmerId <= 0) {
      showInfo('Farmer map location is unavailable right now.');
      return;
    }

    const role = String(localStorage.getItem('agrilink_role') || '').toLowerCase();
    const baseMapRoute = role === 'farmer' ? '/farmer/map' : '/buyer/map';
    navigate(`${baseMapRoute}?farmerId=${targetFarmerId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-green-600 animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  const imageUrl = getFullImageUrl(product.p_image);
  const name = asText(product.p_name, 'Unnamed Product');
  const category = asText(product.cat_name, 'Uncategorized');
  const price = toNumber(product.p_price, 0);
  const unit = asText(product.p_unit, 'unit');
  const stock = toNumber(product.p_quantity, 0);
  const isOutOfStock = stock <= 0;
  const originalStock = Math.max(toNumber(product.p_original_quantity, stock), stock, 1);
  const stockPercent = Math.max(0, Math.min(100, (stock / originalStock) * 100));
  const sold7d = toNumber(product.sold7d, 0);
  const sold14d = toNumber(product.sold14d, 0);
  const sold30d = toNumber(product.sold30d, 0);
  const completedOrders30d = toNumber(product.completedOrders30d, 0);
  const demandScore = sold30d / 30;
  const demandLevel =
    completedOrders30d >= 10 || demandScore >= 5
      ? 'High Demand'
      : completedOrders30d >= 3 || demandScore >= 1
      ? 'Medium Demand'
      : 'Low Demand';
  const stockLevel = stockPercent <= 20 ? 'Critical Stock' : stockPercent <= 50 ? 'Low Stock' : 'Normal';
  const reviewLabel = reviewCount === 1 ? 'review' : 'reviews';
  const farmerName = asText(
    `${asText(farmerProfile?.first_name)} ${asText(farmerProfile?.last_name)}`,
    asText(`${asText(product.first_name)} ${asText(product.last_name)}`, 'Farmer')
  );
  const farmerCity = asText(
    farmerProfile?.resolved_farm_city ??
      farmerProfile?.farm_city ??
      farmerProfile?.city
  );
  const farmerProvince = asText(
    farmerProfile?.resolved_farm_province ?? farmerProfile?.farm_province ?? farmerProfile?.province
  );
  const farmerAddressLine = asText(
    farmerProfile?.resolved_farm_address ??
      farmerProfile?.farm_address ??
      farmerProfile?.address
  );
  const hasMapPin = Number.isFinite(Number(farmerProfile?.resolved_latitude ?? farmerProfile?.farm_latitude ?? farmerProfile?.latitude))
    && Number.isFinite(Number(farmerProfile?.resolved_longitude ?? farmerProfile?.farm_longitude ?? farmerProfile?.longitude));
  const location = asText(
    product.city,
    [farmerCity, farmerProvince].filter(Boolean).join(', ') ||
      farmerAddressLine ||
      (hasMapPin ? 'Pinned on map' : 'Location not provided')
  );
  const farmerRating = toNumber(farmerProfile?.rating?.average, toNumber(averageRating));
  const farmerRatingCount = toNumber(farmerProfile?.rating?.count, reviewCount);
  const farmerSalesCount = toNumber(farmerProfile?.sales?.completed_orders, 0);
  const farmerHasVerifiedBadge = Array.isArray(farmerProfile?.badges)
    ? farmerProfile.badges.some((b) => String(b?.badge_type || '').toLowerCase() === 'verified_farmer' && !b?.revoked_at)
    : false;
  const farmerRoleLabel = asText(farmerProfile?.role, 'farmer').toLowerCase() === 'farmer' ? 'Farmer' : 'Seller';
  const farmerId = toNumber(product.u_id ?? farmerProfile?.id);
  const farmerInitials = nameInitials(farmerName);
  const isOwnListing = toNumber(localStorage.getItem('agrilink_id')) === farmerId && farmerId > 0;
  const canOpenFarmerProfile = farmerId > 0;

  const handleOpenFarmerProfile = () => {
    if (!canOpenFarmerProfile) {
      showInfo('Farmer profile is unavailable for this listing.');
      return;
    }
    navigate(`/profile/${farmerId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-xs font-semibold text-slate-500 flex items-center gap-2 mb-4">
          <button onClick={() => navigate('/buyer/marketplace')} className="hover:text-slate-700">Marketplace</button>
          <ChevronRight size={14} />
          <span>{category}</span>
          <ChevronRight size={14} />
          <span className="text-slate-700 truncate">{name}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid lg:grid-cols-[420px_1fr]">
            <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
              <div className="aspect-square rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                {imageUrl ? (
                  <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Package size={56} />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <p className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-[11px] font-semibold">
                      <CheckCircle2 size={13} /> {category}
                    </p>
                    {farmerHasVerifiedBadge && (
                      <p className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-100">
                        <BadgeCheck size={13} className="fill-emerald-50" /> Verified Farmer
                      </p>
                    )}
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 leading-tight">{name}</h1>
                </div>
              </div>

                <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      <Star size={14} className="fill-current" />
                    </div>
                    <span className="font-semibold text-slate-800">{averageRating} Farmer Rating</span>
                    <span>({reviewCount} {reviewLabel})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                  <MapPin size={14} />
                  <span>{location}</span>
                </div>
              </div>

              <div className="mt-6 p-5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Price</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">P {price.toLocaleString()}</p>
                <p className="text-sm text-slate-500">per {unit}</p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-6 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Available</p>
                  <p className="font-semibold text-slate-800">{stock.toLocaleString()} {unit}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Quantity</p>
                  <div className="mt-1 inline-flex items-center rounded-lg border border-slate-200 overflow-hidden">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 grid place-items-center text-slate-600 hover:bg-slate-50">
                      <Minus size={14} />
                    </button>
                    <span className="w-11 text-center text-sm font-semibold">{qty}</span>
                    <button onClick={() => setQty((q) => Math.min(stock || 1, q + 1))} className="w-9 h-9 grid place-items-center text-slate-600 hover:bg-slate-50">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={async () => {
                    const pObj: Product = {
                      id: toNumber(product.p_id),
                      name,
                      price,
                      unit,
                      seller: farmerName,
                      sellerUserId: farmerId > 0 ? farmerId : undefined,
                      location,
                      stock,
                      image: imageUrl,
                      category,
                    };
                    const result = await cartService.addToCart(pObj, qty);
                    if (result.success) {
                      if (result.message) {
                        showInfo(result.message);
                      } else {
                        showSuccess(`${name} added to cart.`);
                      }
                    } else {
                      showError(result.message || 'Failed to add to cart.');
                    }
                  }}
                  disabled={isOutOfStock || isOwnListing || isAdmin}
                  className="h-11 px-5 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold inline-flex items-center gap-2"
                >
                  <ShoppingCart size={16} /> {isOutOfStock ? 'Out of Stock' : isOwnListing ? 'Your Listing' : isAdmin ? 'Admin View' : 'Add to Cart'}
                </button>

                <button
                  onClick={handleChatFarmer}
                  disabled={isOwnListing || isAdmin}
                  className="h-11 px-5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 text-sm font-semibold inline-flex items-center gap-2"
                >
                  <MessageSquare size={16} /> {isOwnListing ? 'Your Listing' : isAdmin ? 'Admin View' : 'Message Farmer'}
                </button>

                <button
                  onClick={handleViewFarmerOnMap}
                  disabled={isAdmin || isOwnListing}
                  className="h-11 px-5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 text-sm font-semibold inline-flex items-center gap-2"
                >
                  <MapPin size={16} /> {isOwnListing ? 'Your Listing' : isAdmin ? 'Map Disabled' : 'View on Map'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <button
            type="button"
            onClick={handleOpenFarmerProfile}
            disabled={!canOpenFarmerProfile}
            className="flex items-center gap-4 text-left disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 grid place-items-center overflow-hidden border border-slate-100">
              {farmerProfile?.profile_image ? (
                <img 
                  src={getFullImageUrl(farmerProfile.profile_image)} 
                  alt={farmerName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold tracking-wide">{farmerInitials}</span>
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold ${canOpenFarmerProfile ? 'text-slate-900 hover:text-green-700' : 'text-slate-900'}`}>{farmerName}</p>
              <p className="text-xs text-slate-500">{[farmerCity, farmerProvince].filter(Boolean).join(', ') || 'Location not provided'}</p>
            </div>
          </button>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Farm Name</p>
              <p className="font-medium text-slate-800">{asText(farmerProfile?.farm_name, 'Not provided')}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Location</p>
              <p className="font-medium text-slate-800">{[farmerCity, farmerProvince].filter(Boolean).join(', ') || location}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Rating</p>
              <p className="font-medium text-slate-800">
                {farmerRating.toFixed(1)} ({farmerRatingCount} {farmerRatingCount === 1 ? 'review' : 'reviews'})
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Completed Sales</p>
              <p className="font-medium text-slate-800">{farmerSalesCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-4">
            {(['overview', 'reviews', 'farmer'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`h-12 px-4 text-sm font-semibold border-b-2 transition ${
                  activeTab === tab
                    ? 'text-green-700 border-green-600'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                {tab === 'overview' ? 'Overview' : tab === 'reviews' ? `Farmer Reviews (${reviewCount})` : 'Farmer'}
              </button>
            ))}
          </div>

          <div className="p-5 lg:p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">Description</p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {asText(product.p_description, 'No description provided for this product yet.')}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Category</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{category}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Unit</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{unit}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Demand Score</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{demandScore.toFixed(2)} {unit}/day</p>
                    <p className="mt-1 text-xs text-slate-500">Formula: sold in 30 days / 30</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Demand Level</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{demandLevel}</p>
                    <p className="mt-1 text-xs text-slate-500">{completedOrders30d} completed orders in 30 days</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Sold Quantity</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{sold7d.toLocaleString()} {unit} / 7d</p>
                    <p className="mt-1 text-xs text-slate-500">{sold14d.toLocaleString()} / 14d, {sold30d.toLocaleString()} / 30d</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Stock Level</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{stockLevel}</p>
                    <p className="mt-1 text-xs text-slate-500">{stockPercent.toFixed(1)}% of original stock remaining</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <p className="text-sm font-semibold text-slate-800">Farmer service reviews</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Reviews come from completed orders and are counted as farmer vouches.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl font-bold text-slate-900">{averageRating}</span>
                    <span className="text-sm text-slate-500">/ 5</span>
                  </div>
                  <div className="space-y-2">
                    {ratingBreakdown.map((row) => {
                      const pct = reviews.length > 0 ? (row.count / reviews.length) * 100 : 0;
                      return (
                        <div key={row.stars} className="flex items-center gap-3">
                          <span className="w-10 text-xs text-slate-500">{row.stars} star</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-6 text-right text-xs text-slate-500">{row.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {reviews.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    No farmer reviews yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.fsr_id ?? review.req_id} className="rounded-xl border border-slate-100 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {asText(`${review.first_name} ${review.last_name}`, 'Anonymous')}
                            </p>
                            <div className="mt-1 flex items-center gap-1 text-amber-500">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={14} className={i < toNumber(review.rating) ? 'fill-current' : ''} />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">
                            {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                          </p>
                        </div>
                        {review.product_name_snapshot && (
                          <p className="mt-2 text-xs text-slate-500">
                            {review.product_name_snapshot.includes(',') ? 'Ordered items: ' : 'Ordered item: '}
                            {review.product_name_snapshot}
                          </p>
                        )}
                        <p className="mt-2 text-sm text-slate-700 leading-relaxed">{asText(review.comment, 'No written comment.')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'farmer' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Name</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{farmerName}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Farm Name</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{asText(farmerProfile?.farm_name, 'Not provided')}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Role</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{farmerRoleLabel}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Location</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{[farmerCity, farmerProvince].filter(Boolean).join(', ') || 'Not provided'}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Average Rating</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {farmerRating.toFixed(1)} ({farmerRatingCount} {farmerRatingCount === 1 ? 'review' : 'reviews'})
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Completed Orders</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{farmerSalesCount}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Status</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {farmerHasVerifiedBadge ? 'Verified Farmer (Barangay Certified)' : 'Verification pending'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleChatFarmer}
                    disabled={isOwnListing || isAdmin}
                    className="h-10 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center gap-2"
                  >
                    <MessageSquare size={14} />
                    {isOwnListing ? 'Your Listing' : isAdmin ? 'Admin View' : 'Message Farmer'}
                  </button>
                  {farmerId > 0 && (
                    <button
                      onClick={() => navigate(`/profile/${farmerId}`)}
                      className="h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-2"
                    >
                      <User size={14} />
                      View Full Farmer Profile
                    </button>
                  )}
                  <button
                    onClick={handleViewFarmerOnMap}
                    disabled={isAdmin || isOwnListing}
                    className="h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 text-xs font-semibold inline-flex items-center gap-2"
                  >
                    <MapPin size={14} />
                    {isOwnListing ? 'Your Listing' : isAdmin ? 'Map Disabled' : 'View on Map'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 md:hidden border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-3 flex items-center gap-2">
          <button
            onClick={handleChatFarmer}
            disabled={isOwnListing || isAdmin}
            className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <MessageSquare size={14} /> {isAdmin ? 'Admin' : 'Message'}
          </button>
          <button
            onClick={handleViewFarmerOnMap}
            disabled={isAdmin || isFarmer}
            className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <MapPin size={14} /> {isAdmin || isFarmer ? 'Map Disabled' : 'Map'}
          </button>
          <button
            onClick={async () => {
              const pObj: Product = {
                id: toNumber(product.p_id),
                name,
                price,
                unit,
                seller: farmerName,
                sellerUserId: farmerId > 0 ? farmerId : undefined,
                location,
                stock,
                image: imageUrl,
                category,
              };
              const result = await cartService.addToCart(pObj, qty);
              if (result.success) {
                if (result.message) {
                  showInfo(result.message);
                } else {
                  showSuccess(`${name} added to cart.`);
                }
              } else {
                showError(result.message || 'Failed to add to cart.');
              }
            }}
            disabled={isOutOfStock || isOwnListing || isAdmin}
            className="h-10 px-3 rounded-lg bg-green-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={14} /> {isOutOfStock ? 'Out of Stock' : isOwnListing ? 'Your Listing' : isAdmin ? 'Admin' : 'Add to Cart'}
          </button>
          <div className="ml-auto text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Price</p>
            <p className="text-sm font-semibold text-slate-900">P {price.toLocaleString()} / {unit}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
