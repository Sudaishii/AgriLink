import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, MapPin, MessageCircle, Phone, ShieldCheck, User } from 'lucide-react';
import { API_BASE_URL, getFullImageUrl } from '../../../api/apiConfig';

type BuyerProfile = {
  id: number;
  first_name?: string;
  last_name?: string;
  role?: string;
  profile_image?: string;
  image_path?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  zip_code?: string;
  onboarding_completed?: number | boolean;
  is_verified?: number | boolean;
};

const BuyerPublicProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userRole = (localStorage.getItem('agrilink_role') || '').toLowerCase();
  const isAdminOrOfficial = ['admin', 'brgy_official', 'lgu_official'].includes(userRole);

  useEffect(() => {
    let isMounted = true;
    const id = Number(userId);
    if (!Number.isFinite(id) || id <= 0) {
      setError('Invalid buyer profile.');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('agrilink_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    fetch(`${API_BASE_URL}/users/contact/${id}`, { headers })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || 'Unable to load buyer profile.');
        }
        return res.json();
      })
      .then((data: BuyerProfile) => {
        if (!isMounted) return;
        setProfile(data);
        setError('');
      })
      .catch((err: Error) => {
        if (!isMounted) return;
        setError(err.message || 'Unable to load buyer profile.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const displayName = useMemo(() => {
    if (!profile) return 'Buyer';
    const first = String(profile.first_name || '').trim();
    const last = String(profile.last_name || '').trim();
    return `${first} ${last}`.trim() || 'Buyer';
  }, [profile]);

  const location = useMemo(() => {
    if (!profile) return 'Location not set';
    const city = String(profile.city || '').trim();
    const province = String(profile.province || '').trim();
    return [city, province].filter(Boolean).join(', ') || 'Location not set';
  }, [profile]);

  if (loading) {
    return <div className="h-full min-h-[60vh] grid place-items-center text-sm text-slate-500">Loading buyer profile...</div>;
  }

  if (!profile || error) {
    return (
      <div className="h-full min-h-[60vh] grid place-items-center px-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-center">
          <p className="font-semibold text-rose-700">{error || 'Buyer profile not found.'}</p>
          <button
            type="button"
            onClick={() => navigate('/messages')}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Messages
          </button>
        </div>
      </div>
    );
  }

  const image = profile.profile_image || profile.image_path || '';
  const hasPhone = Boolean(String(profile.phone || '').trim());
  const hasAddress = Boolean(String(profile.address || '').trim());
  const hasPhoto = Boolean(String(image || '').trim());
  const isVerified = profile.is_verified === 1 || profile.is_verified === true;
  const isOnboarded = profile.onboarding_completed === 1 || profile.onboarding_completed === true;
  const trustChecks = [
    { label: 'Email Verified', ok: isVerified },
    { label: 'Onboarding Complete', ok: isOnboarded },
    { label: 'Profile Photo', ok: hasPhoto },
    { label: 'Contact Number', ok: hasPhone },
    { label: 'Address on File', ok: hasAddress },
  ];
  const passedChecks = trustChecks.filter((c) => c.ok).length;
  const trustPercent = Math.round((passedChecks / trustChecks.length) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
      <button
        type="button"
        onClick={() => {
          const params = new URLSearchParams({
            contactId: String(profile.id),
            contactName: displayName,
            contactImage: String(image || ''),
            contactRole: String(profile.role || 'buyer'),
          });
          navigate(`/messages?${params.toString()}`);
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Chat
      </button>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#4a9407] via-[#5ba409] to-[#76bf1a] px-6 py-8 border-b border-[#4a9407]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-20 w-20 rounded-2xl border border-white/40 bg-white/20 overflow-hidden flex items-center justify-center text-white/80">
              {image ? (
                <img src={getFullImageUrl(image)} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-white truncate">{displayName}</h1>
              <p className="text-sm font-semibold text-white/90 mt-1 capitalize">{String(profile.role || 'buyer').replace('_', ' ')}</p>
              <p className="text-sm text-white/90 mt-1 inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-white/90" />
                {location}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3 py-1.5">
                <ShieldCheck className="h-4 w-4 text-white" />
                <span className="text-xs font-bold text-white">{trustPercent}% Buyer Trust Profile</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.1em] text-emerald-700 font-bold">Identity Checks</p>
              <p className="text-xs font-semibold text-emerald-700">{passedChecks}/{trustChecks.length} passed</p>
            </div>
            <div className="mt-2 h-2 rounded-full bg-emerald-100 overflow-hidden">
              <div className="h-full bg-emerald-600 transition-all" style={{ width: `${trustPercent}%` }} />
            </div>
            <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {trustChecks.map((check) => (
                <div
                  key={check.label}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold inline-flex items-center gap-2 ${
                    check.ok ? 'border-emerald-200 bg-white text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {check.label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500 font-semibold">Address</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{profile.address || 'Address not provided'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500 font-semibold">Contact Number</p>
            <p className="mt-2 text-sm font-semibold text-slate-800 inline-flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-600" />
              {profile.phone || 'Phone not provided'}
            </p>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={() => {
              if (isAdminOrOfficial) return;
              const params = new URLSearchParams({
                contactId: String(profile.id),
                contactName: displayName,
                contactImage: String(image || ''),
                contactRole: String(profile.role || 'buyer'),
              });
              navigate(`/messages?${params.toString()}`);
            }}
            disabled={isAdminOrOfficial}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              isAdminOrOfficial
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            {isAdminOrOfficial ? 'Admin View Only' : 'Message Buyer'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default BuyerPublicProfilePage;
