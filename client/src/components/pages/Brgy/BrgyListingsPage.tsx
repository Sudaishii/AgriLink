import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ShieldCheck,
  Users,
  CheckCircle,
  AlertCircle,
  MapPin,
  ShoppingBag,
  Package,
  RefreshCw,
  XCircle,
  BadgeCheck,
  CalendarDays,
  ShieldOff,
} from 'lucide-react';
import { API_BASE_URL, getFullImageUrl } from '../../../api/apiConfig';
import { useToast } from '../../ui/Toast';
import Modal from '../../ui/Modal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FarmerBadge {
  id: number;
  badge_type: string;
  badge_label: string;
  notes?: string;
  issued_at: string;
  issuer_first?: string;
  issuer_last?: string;
}

interface Farmer {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  city: string;
  province: string;
  address: string;
  profile_image: string;
  created_at: string;
  completed_orders: number;
  active_listings: number;
  badges: FarmerBadge[];
}

// ─── Helper ──────────────────────────────────────────────────────────────────

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Today';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

// ─── Main Component ──────────────────────────────────────────────────────────

const BrgyListingsPage: React.FC = () => {
  const toast = useToast();
  const token = localStorage.getItem('agrilink_token');

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [brgyName, setBrgyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'certified' | 'pending'>('all');
  const [brgyFilter, setBrgyFilter] = useState('all');

  // Award / Revoke modal
  const [awardTarget, setAwardTarget] = useState<Farmer | null>(null);
  const [notes, setNotes] = useState('');
  const [isAwarding, setIsAwarding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [revokingBadgeId, setRevokingBadgeId] = useState<number | null>(null);
  const [notesError, setNotesError] = useState<string>('');

  // ── Fetch farmers ──────────────────────────────────────────────────────────

  const fetchFarmers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/badges/farmers-by-brgy`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFarmers(Array.isArray(data.farmers) ? data.farmers : []);
        setBrgyName(data.brgy || '');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to load farmers.');
      }
    } catch {
      toast.error('Network error while loading farmers.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchFarmers(); }, [fetchFarmers]);

  // ── Award badge ────────────────────────────────────────────────────────────

  const handleAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardTarget || !token) return;

    if (!notes.trim()) {
      setNotesError('Verification notes are required before issuing certification.');
      return;
    }
    setNotesError('');
    setIsAwarding(true);
    try {
      const res = await fetch(`${API_BASE_URL}/badges/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          farmer_id: awardTarget.id,
          badge_type: 'verified_farmer',
          badge_label: 'Verified Farmer',
          notes,
        }),
      });
      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setAwardTarget(null);
          setNotes('');
          fetchFarmers();
        }, 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to award badge.');
      }
    } catch {
      toast.error('Network error while awarding badge.');
    } finally {
      setIsAwarding(false);
    }
  };

  // ── Revoke badge ───────────────────────────────────────────────────────────

  const handleRevoke = async (badgeId: number) => {
    if (!token) return;
    setRevokingBadgeId(badgeId);
    try {
      const res = await fetch(`${API_BASE_URL}/badges/${badgeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Certification revoked.');
        fetchFarmers();
      } else {
        toast.error('Failed to revoke certification.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setRevokingBadgeId(null);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const availableBarangays = Array.from(new Set(
    farmers.map(f => f.city?.trim() || 'Minglanilla')
  )).sort();

  const farmersInScope = brgyFilter === 'all' 
    ? farmers 
    : farmers.filter(f => (f.city?.trim() || 'Minglanilla').toLowerCase() === brgyFilter.toLowerCase());

  const certifiedCount = farmersInScope.filter(f => f.badges.length > 0).length;
  const pendingCount = farmersInScope.filter(f => f.badges.length === 0).length;

  const filtered = farmersInScope.filter(f => {
    const city = f.city?.trim() || 'Minglanilla';
    const matchSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'certified') return matchSearch && f.badges.length > 0;
    if (filter === 'pending') return matchSearch && f.badges.length === 0;
    return matchSearch;
  });

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F6F8FA]">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#5ba409] uppercase tracking-widest">
                {brgyName ? `Barangay ${brgyName}` : 'Barangay Certification'}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Farmer Certification
            </h1>
            <p className="text-sm text-gray-500">
              Certify verified farmers in your barangay. The{' '}
              <span className="font-semibold text-blue-600">Verified Farmer</span> badge is visible on their marketplace profile.
            </p>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-6 sm:px-10 pt-12 pb-10">

        {/* Toolbar: stat pills + search + filter tabs all in one row */}
        <div className="flex flex-wrap items-center gap-3 mb-10">

          {/* Compact stat pills */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users size={12} className="text-gray-500" />
            </div>
            <span className="text-sm font-extrabold text-gray-900">{farmersInScope.length}</span>
            <span className="text-xs font-semibold text-gray-400">Total</span>
          </div>

          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 shadow-sm">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck size={12} className="text-white" />
            </div>
            <span className="text-sm font-extrabold text-blue-700">{certifiedCount}</span>
            <span className="text-xs font-semibold text-blue-400">Certified</span>
          </div>

          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 shadow-sm">
            <div className="w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center">
              <AlertCircle size={12} className="text-white" />
            </div>
            <span className="text-sm font-extrabold text-amber-700">{pendingCount}</span>
            <span className="text-xs font-semibold text-amber-400">Pending</span>
          </div>

          <button
            onClick={fetchFarmers}
            className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#5ba409] hover:border-[#5ba409] transition-colors bg-white shadow-sm"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>

          {/* Spacer */}
          <div className="flex-1" />



          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name..."
              className="w-60 pl-11 pr-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none transition focus:border-[#5ba409]/50 focus:ring-2 focus:ring-[#5ba409]/10 shadow-sm placeholder:text-gray-300"
            />
          </div>


        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-pulse">
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
                    <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                    <div className="h-3 bg-gray-100 rounded-lg w-1/3" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="h-16 bg-gray-100 rounded-2xl" />
                  <div className="h-16 bg-gray-100 rounded-2xl" />
                </div>
                <div className="h-12 bg-gray-100 rounded-2xl" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm py-32 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Users size={32} className="text-gray-200" />
            </div>
            <p className="font-bold text-gray-300 text-lg">
              {searchTerm ? 'No farmers match your search.' : `No ${filter === 'all' ? '' : filter} farmers found.`}
            </p>
          </div>
        )}

        {/* Farmer Cards Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(farmer => {
              const isCertified = farmer.badges.length > 0;
              const badge = farmer.badges[0]; // only one badge

              return (
                <div
                  key={farmer.id}
                  className={`group relative bg-white rounded-3xl border shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col ${
                    isCertified
                      ? 'border-[#5ba409]/30 hover:border-[#5ba409]/50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {/* Certification ribbon */}
                  {isCertified && (
                    <div className="absolute top-0 right-0 bg-[#5ba409] text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-3xl flex items-center gap-1.5 shadow-lg shadow-[#5ba409]/30 z-10">
                      <ShieldCheck size={14} className="animate-pulse" />
                      Verified
                    </div>
                  )}

                  {/* Card body */}
                  <div className="p-7 flex-1 flex flex-col">

                    {/* Avatar + Identity */}
                    <div className="flex items-center gap-5 mb-6 pt-2">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-xl flex-shrink-0 overflow-hidden shadow-inner ${
                        isCertified ? 'bg-green-50 text-[#5ba409] ring-4 ring-green-100' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {farmer.profile_image ? (
                          <img
                            src={getFullImageUrl(farmer.profile_image)}
                            alt={farmer.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          `${farmer.first_name?.[0] ?? ''}${farmer.last_name?.[0] ?? ''}`
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-gray-900 text-base leading-tight truncate">
                          {farmer.name}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium flex items-center gap-1 mt-1">
                          <MapPin size={11} /> {farmer.city || 'Minglanilla'}{farmer.province ? `, ${farmer.province}` : ''}
                        </p>
                        <p className="text-xs text-gray-300 font-medium mt-0.5 flex items-center gap-1">
                          <CalendarDays size={11} /> Joined {timeAgo(farmer.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-gray-50 rounded-2xl p-4 text-center">
                        <div className="flex items-center justify-center mb-1 text-gray-400">
                          <ShoppingBag size={15} />
                        </div>
                        <p className="text-xl font-extrabold text-gray-900">{farmer.completed_orders}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">Completed Orders</p>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-4 text-center">
                        <div className="flex items-center justify-center mb-1 text-gray-400">
                          <Package size={15} />
                        </div>
                        <p className="text-xl font-extrabold text-gray-900">{farmer.active_listings}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">Active Listings</p>
                      </div>
                    </div>

                    {/* Badge status card */}
                    {isCertified && badge ? (
                      <div className="bg-gradient-to-br from-green-50 to-[#5ba409]/10 border border-[#5ba409]/30 rounded-3xl p-5 mb-5 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
                            <ShieldCheck size={80} />
                        </div>
                        <div className="flex items-start gap-4 relative z-10">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#5ba409] to-green-700 rounded-2xl flex items-center justify-center shadow-lg shadow-[#5ba409]/30 flex-shrink-0">
                            <ShieldCheck size={24} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-green-800 uppercase tracking-widest">Verified Farmer</p>
                            <p className="text-xs text-green-700 font-bold mt-1">
                              Certified {formatDate(badge.issued_at)}
                            </p>
                            {badge.issuer_first && (
                              <p className="text-[10px] text-green-600/80 font-semibold mt-0.5 uppercase tracking-wider">
                                By Official {badge.issuer_first} {badge.issuer_last}
                              </p>
                            )}
                          </div>
                          <BadgeCheck size={20} className="text-[#5ba409] flex-shrink-0 mt-1 drop-shadow-sm" />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
                        <div className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                          <ShieldCheck size={16} className="text-gray-300" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400">Not yet certified</p>
                          <p className="text-[10px] text-gray-300 font-medium mt-0.5">Award the Verified Farmer badge below</p>
                        </div>
                      </div>
                    )}

                    {/* Action button */}
                    <div className="mt-auto">
                      {isCertified && badge ? (
                        <button
                          onClick={() => handleRevoke(badge.id)}
                          disabled={revokingBadgeId === badge.id}
                          className="w-full py-3 border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {revokingBadgeId === badge.id ? (
                            <><RefreshCw size={15} className="animate-spin" /> Revoking...</>
                          ) : (
                            <><ShieldOff size={15} /> Revoke Certification</>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setAwardTarget(farmer); setNotes(''); setNotesError(''); }}
                          className="w-full py-3.5 bg-[#5ba409] hover:bg-[#4d8f08] text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-[#5ba409]/20 hover:shadow-lg hover:shadow-[#5ba409]/30"
                        >
                          <ShieldCheck size={15} />
                          Certify as Verified Farmer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Certify Modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!awardTarget}
        onClose={() => { setAwardTarget(null); setShowSuccess(false); }}
        maxWidth="max-w-md"
      >
        {showSuccess ? (
          <div className="text-center py-14">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
              <CheckCircle size={44} className="text-[#5ba409]" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">Certified!</h2>
            <p className="text-sm text-gray-500 mt-2">
              <strong>{awardTarget?.name}</strong> is now a <span className="text-[#5ba409] font-bold">Verified Farmer</span>.
            </p>
          </div>
        ) : (
          <div className="p-1">
            {/* Modal title */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#5ba409] rounded-2xl flex items-center justify-center shadow-lg shadow-[#5ba409]/40">
                <ShieldCheck size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">Issue Verification</h2>
                <p className="text-sm text-gray-400 font-medium">Verified Farmer Certification</p>
              </div>
            </div>

            {/* Farmer preview */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-[#5ba409] font-extrabold text-base flex-shrink-0 overflow-hidden">
                {awardTarget?.profile_image ? (
                  <img src={getFullImageUrl(awardTarget.profile_image)} alt={awardTarget.name} className="w-full h-full object-cover" />
                ) : (
                  `${awardTarget?.first_name?.[0] ?? ''}${awardTarget?.last_name?.[0] ?? ''}`
                )}
              </div>
              <div>
                <p className="font-extrabold text-gray-900">{awardTarget?.name}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={11} /> {awardTarget?.city || 'Minglanilla'}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs font-bold text-gray-400">{awardTarget?.completed_orders} orders</p>
                <p className="text-xs text-gray-300 font-medium">{awardTarget?.active_listings} listings</p>
              </div>
            </div>

            {/* What this means */}
            <div className="bg-green-50 border border-[#5ba409]/20 rounded-2xl p-4 mb-5 flex items-start gap-3">
              <BadgeCheck size={16} className="text-[#5ba409] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-extrabold text-green-800">What this certification means</p>
                <p className="text-xs text-green-700 font-medium mt-1 leading-relaxed">
                  You confirm that <strong>{awardTarget?.name}</strong> is a legitimate local farmer in your barangay.
                  This badge is displayed publicly on their marketplace profile and builds community trust.
                </p>
              </div>
            </div>

            <form onSubmit={handleAward} className="space-y-4">
              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                  Verification Notes <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => { setNotes(e.target.value); if (e.target.value.trim()) setNotesError(''); }}
                  rows={3}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-medium text-gray-700 outline-none transition resize-none placeholder:text-gray-300 focus:bg-white ${
                    notesError ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-gray-200 focus:border-[#5ba409]/50 focus:ring-2 focus:ring-[#5ba409]/10'
                  }`}
                  placeholder="e.g. Physically visited the farm. Documents verified. Known local farmer for 3 years."
                />
                {notesError && (
                  <p className="text-red-500 text-xs font-semibold mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {notesError}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setAwardTarget(null)}
                  className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAwarding}
                  className="flex-[2] py-3 bg-[#5ba409] hover:bg-[#4d8f08] text-white rounded-xl text-sm font-bold shadow-md shadow-[#5ba409]/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAwarding ? (
                    <><RefreshCw size={14} className="animate-spin" /> Processing...</>
                  ) : (
                    <><ShieldCheck size={14} /> Issue Certification</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BrgyListingsPage;
