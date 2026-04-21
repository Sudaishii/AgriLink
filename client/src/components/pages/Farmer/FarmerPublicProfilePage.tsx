import React, { useEffect, useMemo, useState } from 'react';
import { Award, Map as MapIcon, MapPin, Package, Phone, Star, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL, getFullImageUrl } from '../../../api/apiConfig';

type PublicFarmerProfile = {
  id: number;
  first_name: string;
  last_name: string;
  role?: string;
  phone?: string;
  profile_image?: string;
  address?: string;
  city?: string;
  province?: string;
  zip_code?: string;
  created_at?: string;
  bio?: string;
  farm_name?: string;
  farm_address?: string;
  farm_city?: string;
  farm_province?: string;
  farm_zip_code?: string;
  farm_latitude?: number | string;
  farm_longitude?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  resolved_farm_address?: string;
  resolved_farm_city?: string;
  resolved_farm_province?: string;
  resolved_farm_zip_code?: string;
  resolved_latitude?: number | null;
  resolved_longitude?: number | null;
  farm_image?: string;
  farm_gallery_images?: string[];
  rating?: {
    average: number;
    count: number;
  };
  sales?: {
    completed_orders: number;
    completed_units: number;
  };
  reviews?: Array<{
    fsr_id?: number;
    req_id?: number;
    r_id?: number;
    rating: number;
    comment?: string;
    created_at?: string;
    product_name?: string;
    first_name?: string;
    last_name?: string;
  }>;
  badge?: {
    implemented: boolean;
    label: string;
    status: string;
    description: string;
  };
  badges?: Array<{
    badge_label: string;
    badge_type: string;
    notes?: string;
    issuer_first?: string;
    issuer_last?: string;
    issued_at?: string;
  }>;
};

const FarmerPublicProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<PublicFarmerProfile | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!userId) {
        setError('Invalid profile.');
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('agrilink_token');
        const [profileRes, productsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/users/public/${userId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
          fetch(`${API_BASE_URL}/products/farmer/${userId}`),
        ]);

        if (!profileRes.ok) {
          const data = await profileRes.json().catch(() => ({}));
          throw new Error(data.message || 'Unable to load farmer profile.');
        }

        const profileData = await profileRes.json();
        setProfile(profileData);

        if (productsRes.ok) {
          const pData = await productsRes.json().catch(() => ({}));
          setProducts(Array.isArray(pData.products) ? pData.products : []);
        }

        setError('');
      } catch (err: any) {
        setError(err.message || 'Unable to load farmer profile.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [userId]);

  const displayName = useMemo(() => {
    if (!profile) return 'Farmer';
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Farmer';
  }, [profile]);

  const sessionUserId = useMemo(() => {
    const raw = localStorage.getItem('agrilink_id') || localStorage.getItem('agrilink_userId') || '';
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }, []);

  const isOwnProfile = useMemo(() => {
    const targetId = Number(profile?.id || 0);
    return sessionUserId > 0 && targetId > 0 && sessionUserId === targetId;
  }, [profile?.id, sessionUserId]);

  const mapRoute = useMemo(() => {
    const role = (localStorage.getItem('agrilink_role') || '').toLowerCase();
    return role === 'farmer' ? '/farmer/map' : '/buyer/map';
  }, []);

  const userRole = (localStorage.getItem('agrilink_role') || '').toLowerCase();
  const isAdminOrOfficial = ['admin', 'brgy_official', 'lgu_official'].includes(userRole);

  const handleMessageFarmer = () => {
    if (!profile?.id || isOwnProfile || isAdminOrOfficial) return;

    const params = new URLSearchParams({
      contactId: String(profile.id),
      contactName: displayName,
      contactImage: String(profile.profile_image || ''),
      contactRole: String(profile.role || 'farmer'),
      startConversation: '1',
    });

    navigate(`/messages?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] pt-20">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-52 bg-gray-200 rounded-3xl" />
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] pt-20">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 text-sm">{error || 'Profile not found.'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] pt-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 shadow-sm bg-white mb-6">
          <div className="h-56 md:h-64 bg-gradient-to-r from-[#0f2f0f] via-[#1f5c1b] to-[#2f7a24]">
            {profile.farm_image && (
              <img src={getFullImageUrl(profile.farm_image)} alt="Farm banner" className="h-full w-full object-cover opacity-45" />
            )}
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl border border-gray-200 bg-white overflow-hidden shrink-0">
                {profile.profile_image ? (
                  <img src={getFullImageUrl(profile.profile_image)} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-lg font-black text-gray-500">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900">{displayName}</h1>
                <p className="text-sm text-gray-600 mt-1">{profile.farm_name || 'Local Farmer'}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600 font-semibold">
              <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" />{[profile.resolved_farm_city || profile.farm_city || profile.city, profile.resolved_farm_province || profile.farm_province || profile.province].filter(Boolean).join(', ') || 'Location not set'}</span>
              {profile.phone && <span className="inline-flex items-center gap-1"><Phone className="w-4 h-4" />{profile.phone}</span>}
              <span className="inline-flex items-center gap-1"><Star className="w-4 h-4 text-amber-500" />{Number(profile.rating?.average || 0).toFixed(1)} ({profile.rating?.count || 0} reviews)</span>
              <span className="inline-flex items-center gap-1"><Package className="w-4 h-4 text-[#5ba409]" />{profile.sales?.completed_orders || 0} completed sales</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-gray-900 mb-3">Farm Details</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{profile.bio || 'This farmer has not added a farm introduction yet.'}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-gray-200 p-3"><span className="text-gray-500">Farm Barangay / Landmark</span><p className="font-semibold text-gray-800 mt-1">{profile.resolved_farm_address || profile.farm_address || profile.address || 'Not specified'}</p></div>
              <div className="rounded-xl border border-gray-200 p-3"><span className="text-gray-500">Farm City</span><p className="font-semibold text-gray-800 mt-1">{profile.resolved_farm_city || profile.farm_city || profile.city || 'Not specified'}</p></div>
              <div className="rounded-xl border border-gray-200 p-3"><span className="text-gray-500">Farm Province</span><p className="font-semibold text-gray-800 mt-1">{profile.resolved_farm_province || profile.farm_province || profile.province || 'Not specified'}</p></div>
              <div className="rounded-xl border border-gray-200 p-3"><span className="text-gray-500">ZIP Code</span><p className="font-semibold text-gray-800 mt-1">{profile.resolved_farm_zip_code || profile.farm_zip_code || profile.zip_code || 'Not specified'}</p></div>
            </div>
          </section>

          <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-gray-800 mb-3">Trust Badges</h3>
            <div className="space-y-3">
               {profile.badges && profile.badges.length > 0 ? (
                profile.badges.map((b, i) => (
                  <div key={i} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="inline-flex items-center gap-2 text-emerald-700 font-bold text-sm">
                      <Award className="w-4 h-4" />
                      {b.badge_label}
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 mt-2">Active Certification</p>
                    {b.notes && <p className="text-sm text-emerald-900 mt-2">{b.notes}</p>}
                    <p className="text-[10px] text-emerald-600/70 mt-2">Issued by {b.issuer_first} {b.issuer_last}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="inline-flex items-center gap-2 text-emerald-700 font-bold text-sm"><Award className="w-4 h-4" />{profile.badge?.label || 'Farmer Verification Badge'}</div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 mt-2">{profile.badge?.status || 'Coming soon'}</p>
                  <p className="text-sm text-emerald-900 mt-2">{profile.badge?.description || 'Badge system is not yet implemented.'}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleMessageFarmer}
              disabled={isOwnProfile || isAdminOrOfficial}
              className={`mt-4 w-full py-2.5 rounded-xl text-white text-xs font-black uppercase tracking-[0.14em] transition ${
                (isOwnProfile || isAdminOrOfficial)
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-emerald-700 hover:bg-emerald-600'
              }`}
            >
              {isOwnProfile ? 'This is your profile' : isAdminOrOfficial ? 'Admin View Only' : 'Message Farmer'}
            </button>
            <button
              onClick={() => navigate(mapRoute)}
              className="mt-3 w-full py-2.5 rounded-xl border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-black uppercase tracking-[0.14em] inline-flex items-center justify-center gap-2"
            >
              <MapIcon className="w-4 h-4" />
              Go to AgriLink Map
            </button>
          </aside>
        </div>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-black text-gray-900">Farm Gallery</h2>
            <span className="text-xs font-semibold text-gray-500">{profile.farm_gallery_images?.length || 0} photos</span>
          </div>
          {profile.farm_gallery_images && profile.farm_gallery_images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {profile.farm_gallery_images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveGalleryIndex(idx)}
                  className="aspect-[4/3] rounded-xl overflow-hidden border border-emerald-200 bg-emerald-50/20 hover:opacity-90 hover:border-emerald-300 transition"
                >
                  <img src={getFullImageUrl(img)} alt={`Farm gallery ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-sm text-gray-500 text-center">No farm gallery images uploaded yet.</div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-black text-gray-900 inline-flex items-center gap-2"><Package className="w-5 h-5 text-[#5ba409]" />Current Listings</h2>
            <span className="text-xs font-semibold text-gray-500">{products.length} total</span>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products
                .filter((p) => p.p_status === 'active')
                .slice(0, 6)
                .map((p) => (
                  <button
                    key={p.p_id}
                    type="button"
                    onClick={() => navigate(`/buyer/product/${p.p_id}`)}
                    className="rounded-2xl border border-emerald-200 overflow-hidden bg-white text-left hover:shadow-md hover:border-emerald-300 transition"
                  >
                    <div className="h-28 bg-gray-100">
                      {p.p_image ? (
                        <img src={getFullImageUrl(p.p_image)} alt={p.p_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-gray-400 text-xs font-semibold">No image</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-gray-900 text-sm truncate">{p.p_name}</p>
                      <p className="text-xs text-gray-500 mt-1">{p.cat_name || 'Uncategorized'}</p>
                      <p className="text-xs text-gray-500 mt-1">PHP {Number(p.p_price || 0).toLocaleString()} / {p.p_unit}</p>
                      <p className="text-xs text-gray-500">Stock: {p.p_quantity}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.p_description || 'No description yet.'}</p>
                      {p.harvest_date && <p className="text-xs text-gray-500 mt-1">Harvest: {String(p.harvest_date).slice(0, 10)}</p>}
                      <p className="text-[11px] font-bold text-emerald-700 mt-2 uppercase tracking-wider">View Product</p>
                    </div>
                  </button>
                ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-sm text-gray-500 text-center">No active listings available.</div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-black text-gray-900 inline-flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" />Farmer Reviews</h2>
            <span className="text-xs font-semibold text-gray-500">{profile.reviews?.length || 0} shown</span>
          </div>

          {profile.reviews && profile.reviews.length > 0 ? (
            <div className="space-y-3">
              {profile.reviews.map((review) => (
                <div key={String(review.fsr_id || review.r_id || review.req_id || Math.random())} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {`${review.first_name || ''} ${review.last_name || ''}`.trim() || 'Buyer'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Service review{review.req_id ? ` • Order #${review.req_id}` : ''}{review.product_name ? ` • ${review.product_name}` : ''}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      {Number(review.rating || 0).toFixed(1)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-3">{review.comment?.trim() || 'No written comment provided.'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-sm text-gray-500 text-center">No reviews yet.</div>
          )}
        </section>
      </div>
      {activeGalleryIndex !== null && profile.farm_gallery_images && profile.farm_gallery_images.length > 0 && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setActiveGalleryIndex(null)}
            className="absolute top-5 right-5 grid h-10 w-10 place-items-center rounded-full bg-emerald-700/90 text-white hover:bg-emerald-600"
            aria-label="Close gallery viewer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={getFullImageUrl(profile.farm_gallery_images[activeGalleryIndex])}
            alt={`Farm gallery ${activeGalleryIndex + 1}`}
            className="max-h-[88vh] max-w-[92vw] object-contain rounded-2xl border border-white/15"
          />
        </div>
      )}
    </div>
  );
};

export default FarmerPublicProfilePage;
