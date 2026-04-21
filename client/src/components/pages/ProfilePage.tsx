import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Camera,
  Clock,
  Globe2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  Trash2,
  Search,
  SlidersHorizontal,
  User as UserIcon,
  Heart,
  ShoppingCart,
  Star,
  X,
  Compass,
  Award,
} from 'lucide-react';
import MapGL, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL, getFullImageUrl } from '../../api/apiConfig';
import { useToast } from '../ui/Toast';
import LogoutConfirmationModal from '../ui/LogoutConfirmationModal';
import ReviewModal from '../modals/ReviewModal';
import ProductCard from '../ui/ProductCard';
import Modal from '../ui/Modal';
import OrderInvoiceModal from '../ui/OrderInvoiceModal';
import type { UserProfile, Product } from '../../types';

type OrderRow = {
  req_id: number;
  product_id?: number | string;
  farmer_id?: number | string;
  req_status: string;
  req_date?: string;
  created_at?: string;
  quantity: number;
  p_name?: string;
  p_price?: number;
  p_image?: string;
  p_id?: number | string;
  farmer_first?: string;
  farmer_last?: string;
  buyer_first?: string;
  buyer_last?: string;
  invoice_number?: string;
  completed_at?: string;
  has_farmer_review?: number | boolean;
};

const statusClasses: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  processing: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  canceled: 'bg-rose-100 text-rose-700 border-rose-200',
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';

const sectionClass =
  'rounded-2xl border border-slate-200 bg-white shadow-sm';

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
};

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, ariaLabel }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? 'bg-[#5ba409]' : 'bg-slate-300'
        }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${checked ? 'translate-x-6' : 'translate-x-1'
          }`}
      />
    </button>
  );
};

const parseMaybeNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

interface ProfilePageProps {
  onLogout?: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [activeSection, setActiveSection] = useState(() => {
    const tab = (searchParams.get('tab') || 'info').toLowerCase();
    return tab === 'farm' ? 'info' : tab;
  });
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [alertsSaving, setAlertsSaving] = useState(false);
  const [removingOrderId, setRemovingOrderId] = useState<number | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [orderPendingRemoval, setOrderPendingRemoval] = useState<OrderRow | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<OrderRow | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<OrderRow | null>(null);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [pendingProfileImageFile, setPendingProfileImageFile] = useState<File | null>(null);
  const [pendingProfileImagePreview, setPendingProfileImagePreview] = useState<string | null>(null);
  const [pendingFarmImageFile, setPendingFarmImageFile] = useState<File | null>(null);
  const [pendingFarmImagePreview, setPendingFarmImagePreview] = useState<string | null>(null);
  const [pendingFarmGalleryFiles, setPendingFarmGalleryFiles] = useState<File[]>([]);
  const [pendingFarmGalleryPreviews, setPendingFarmGalleryPreviews] = useState<string[]>([]);
  const [isFarmSaveConfirmOpen, setIsFarmSaveConfirmOpen] = useState(false);
  const personalSnapshotRef = useRef<string>('');
  const farmSnapshotRef = useRef<string>('');

  const token = localStorage.getItem('agrilink_token');
  const userId = localStorage.getItem('agrilink_id') || localStorage.getItem('agrilink_userId');
  const storedRole = (
    localStorage.getItem('agrilink_role') ||
    localStorage.getItem('agrilink_userType') ||
    'buyer'
  ).toLowerCase();

  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    zipCode: '',
    userType: 'buyer',
    bio: '',
    farmImage: '',
    farmGalleryImages: [],
    farmAddressSameAsHome: true,
    badges: [],
  });

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [myOrders, setMyOrders] = useState<OrderRow[]>([]);
  const [orderScope, setOrderScope] = useState<'sales' | 'purchases'>('sales');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSort, setOrderSort] = useState<'latest' | 'oldest'>('latest');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    orders: true,
    messages: true,
  });
  const [appSettings, setAppSettings] = useState({
    language: 'en-PH',
    compactOrders: false,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const isFarmer = (profile.userType || storedRole) === 'farmer';
  const isBrgy = (profile.userType || storedRole) === 'brgy_official';
  const isAdmin = (profile.userType || storedRole) === 'admin';

  const hydrateOrdersWithProductImages = async (rows: OrderRow[]): Promise<OrderRow[]> => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const missingImageProductIds = Array.from(
      new Set(
        safeRows
          .filter((row) => !String(row.p_image || '').trim())
          .map((row) => Number(row.product_id ?? row.p_id))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    );

    if (missingImageProductIds.length === 0) return safeRows;

    const imageByProductId = new Map<number, string>();

    await Promise.all(
      missingImageProductIds.map(async (productId) => {
        try {
          const res = await fetch(`${API_BASE_URL}/products/${productId}`);
          if (!res.ok) return;
          const data = await res.json().catch(() => ({}));
          const image = String(data?.product?.p_image || '').trim();
          if (image) imageByProductId.set(productId, image);
        } catch {
          // Keep row as-is if hydration fails
        }
      })
    );

    return safeRows.map((row) => {
      const current = String(row.p_image || '').trim();
      if (current) return row;
      const productId = Number(row.product_id ?? row.p_id);
      const hydrated = imageByProductId.get(productId);
      return hydrated ? { ...row, p_image: hydrated } : row;
    });
  };

  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`profile_alerts_${userId}`);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      setNotificationSettings((prev) => ({
        ...prev,
        orders: !!parsed.orders,
        messages: !!parsed.messages,
      }));
    } catch {
      // ignore malformed local settings
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`profile_settings_${userId}`);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      setAppSettings((prev) => ({
        ...prev,
        language: String(parsed.language || prev.language),
        compactOrders: !!parsed.compactOrders,
      }));
    } catch {
      // ignore malformed local settings
    }
  }, [userId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token || !userId) {
          navigate('/login');
          return;
        }

        const baseHeaders = { Authorization: `Bearer ${token}` };
        const profilePromise = fetch(`${API_BASE_URL}/users/${userId}`, {
          headers: baseHeaders,
        });
        const salesOrdersPromise = fetch(`${API_BASE_URL}/purchases/farmer/${userId}`, {
          headers: baseHeaders,
        });
        const buyerOrdersPromise = fetch(`${API_BASE_URL}/purchases/buyer/${userId}`, {
          headers: baseHeaders,
        });

        const [profileRes, salesOrdersRes, buyerOrdersRes] = await Promise.all([
          profilePromise,
          salesOrdersPromise,
          buyerOrdersPromise,
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          const fallbackFirstName = localStorage.getItem('agrilink_firstName') || '';
          const fallbackLastName = localStorage.getItem('agrilink_lastName') || '';
          const nextProfile: UserProfile = {
            id: String(data.id || ''),
            firstName: data.first_name || fallbackFirstName,
            lastName: data.last_name || fallbackLastName,
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            province: data.province || '',
            zipCode: data.zip_code || '',
            latitude: parseMaybeNumber(data.latitude),
            longitude: parseMaybeNumber(data.longitude),
            userType: (data.role || storedRole || 'buyer') as UserProfile['userType'],
            bio: data.bio || '',
            profileImage: data.profile_image || data.image_path || '',
            farmName: data.farm_name || '',
            farmAddress: data.farm_address || '',
            farmCity: data.farm_city || '',
            farmProvince: data.farm_province || '',
            farmZipCode: data.farm_zip_code || '',
            farmLatitude: parseMaybeNumber(data.farm_latitude),
            farmLongitude: parseMaybeNumber(data.farm_longitude),
            farmAddressSameAsHome: data.farm_address_same_as_home !== 0,
            farmImage: data.farm_image || '',
            farmGalleryImages: Array.isArray(data.farm_gallery_images)
              ? data.farm_gallery_images
              : [],
            badges: Array.isArray(data.badges) ? data.badges : [],
          };
          setProfile(nextProfile);
          personalSnapshotRef.current = buildPersonalSignature(nextProfile);
          farmSnapshotRef.current = buildFarmSignature(nextProfile);
        } else {
          toast.error('Failed to load profile data.');
        }

        if (salesOrdersRes.ok) {
          const data = await salesOrdersRes.json();
          const hydrated = await hydrateOrdersWithProductImages(Array.isArray(data.orders) ? data.orders : []);
          setOrders(hydrated);
        } else {
          setOrders([]);
        }

        if (buyerOrdersRes.ok) {
          const data = await buyerOrdersRes.json();
          const hydrated = await hydrateOrdersWithProductImages(Array.isArray(data.orders) ? data.orders : []);
          setMyOrders(hydrated);
        } else {
          setMyOrders([]);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Unable to load profile at the moment.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Removed navigate, toast, and storedRole from dependencies to prevent infinite loading loops
    // navigate and toast from hooks are often unstable and storedRole is derived from localStorage
  }, [token, userId]);

  // Sync farm info if same as home
  useEffect(() => {
    if (profile.farmAddressSameAsHome) {
      setProfile(prev => ({
        ...prev,
        farmAddress: prev.address,
        farmCity: prev.city,
        farmProvince: prev.province,
        farmZipCode: prev.zipCode,
        farmLatitude: prev.latitude,
        farmLongitude: prev.longitude
      }));
    }
  }, [
    profile.farmAddressSameAsHome,
    profile.address,
    profile.city,
    profile.province,
    profile.zipCode,
    profile.latitude,
    profile.longitude
  ]);

  useEffect(() => {
    if (activeSection === 'market' && !isFarmer) {
      fetchWishlist();
    }
  }, [activeSection, isFarmer]);

  const fetchWishlist = async () => {
    if (!token) return;
    setWishlistLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data.favorites) ? data.favorites : [];
        const mapped: Product[] = raw.map((p: any) => ({
          id: Number(p.p_id ?? p.product_id),
          name: p.p_name || 'Unnamed Product',
          price: parseFloat(p.p_price) || 0,
          unit: p.p_unit || 'unit',
          seller: p.seller_first_name ? `${p.seller_first_name} ${p.seller_last_name || ''}` : 'Local Farm',
          location: p.seller_city || 'Local Farm',
          stock: parseFloat(p.p_quantity) || 0,
          image: p.p_image || '',
          category: p.cat_name || 'Others',
          sellerUserId: Number(p.sellerUserId || 0),
        })).filter((p: Product) => Number.isFinite(Number(p.id)));
        setWishlist(mapped);
      }
    } catch {
      console.error('Failed to fetch wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  useEffect(() => {
    if (!isFarmer) {
      fetchWishlist();
    }
  }, [isFarmer, token]);

  useEffect(() => {
    return () => {
      if (pendingProfileImagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(pendingProfileImagePreview);
      }
    };
  }, [pendingProfileImagePreview]);

  useEffect(() => {
    return () => {
      if (pendingFarmImagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(pendingFarmImagePreview);
      }
    };
  }, [pendingFarmImagePreview]);

  useEffect(() => {
    return () => {
      pendingFarmGalleryPreviews.forEach((preview) => {
        if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
      });
    };
  }, [pendingFarmGalleryPreviews]);

  const toggleFavorite = async (productId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) {
      toast.info('Please sign in.');
      return;
    }
    const isFav = wishlist.some((p) => Number(p.id) === productId);
    try {
      const method = isFav ? 'DELETE' : 'POST';
      const url = isFav ? `${API_BASE_URL}/favorites/${productId}` : `${API_BASE_URL}/favorites`;
      const body = isFav ? undefined : JSON.stringify({ productId });

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      if (res.ok) {
        if (isFav) {
          setWishlist((prev) => prev.filter((p) => Number(p.id) !== productId));
        } else {
          fetchWishlist();
        }
      }
    } catch {
      toast.error('Failed to update wishlist.');
    }
  };

  const handleOpenReview = (order: OrderRow) => {
    setSelectedOrderForReview(order);
    setIsReviewModalOpen(true);
  };

  const confirmLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('agrilink_role');
      localStorage.removeItem('agrilink_isLoggedIn');
      localStorage.removeItem('agrilink_token');
      localStorage.removeItem('agrilink_id');
      localStorage.removeItem('agrilink_firstName');
      localStorage.removeItem('agrilink_lastName');
      localStorage.removeItem('agrilink_onboarding_completed');
      localStorage.removeItem('agrilink_userId');
      window.dispatchEvent(new Event('agrilink-auth-changed'));
      navigate('/login');
    }
  };

  const activeOrders = useMemo(() => {
    if (isFarmer) {
      return orderScope === 'purchases' ? myOrders : orders;
    }
    return myOrders;
  }, [isFarmer, myOrders, orderScope, orders]);

  const ordersBadgeCount = useMemo(
    () => activeOrders.length,
    [activeOrders.length]
  );

  const orderStatuses = useMemo(() => {
    const set = new Set<string>();
    activeOrders.forEach((o) => set.add((o.req_status || 'Unknown').trim()));
    return ['all', ...Array.from(set)];
  }, [activeOrders]);

  useEffect(() => {
    if (orderStatusFilter === 'all') return;
    const exists = activeOrders.some(
      (order) => (order.req_status || '').toLowerCase() === orderStatusFilter.toLowerCase()
    );
    if (!exists) {
      setOrderStatusFilter('all');
    }
  }, [activeOrders, orderStatusFilter]);

  const highlightedInvoice = (searchParams.get('invoice') || '').trim();

  const filteredOrders = useMemo(() => {
    const base = activeOrders.filter((order) => {
      if (orderStatusFilter === 'all') return true;
      return (order.req_status || '').toLowerCase() === orderStatusFilter.toLowerCase();
    });

    return [...base].sort((a, b) => {
      const aTime = new Date(a.req_date || a.created_at || 0).getTime();
      const bTime = new Date(b.req_date || b.created_at || 0).getTime();
      return orderSort === 'latest' ? bTime - aTime : aTime - bTime;
    });
  }, [activeOrders, orderStatusFilter, orderSort]);

  const buildPersonalPayload = () => ({
    first_name: profile.firstName,
    last_name: profile.lastName,
    phone: profile.phone,
    address: profile.address,
    city: 'Minglanilla',
    province: 'Cebu',
    zip_code: '6046',
    latitude: profile.latitude,
    longitude: profile.longitude,
    bio: profile.bio,
    // Include farm info too so it doesn't get wiped if isSameAsHome is true
    farm_name: profile.farmName,
    farm_address: profile.farmAddressSameAsHome ? profile.address : profile.farmAddress,
    farm_city: 'Minglanilla',
    farm_province: 'Cebu',
    farm_zip_code: '6046',
    farm_latitude: profile.farmAddressSameAsHome ? profile.latitude : profile.farmLatitude,
    farm_longitude: profile.farmAddressSameAsHome ? profile.longitude : profile.farmLongitude,
    farm_address_same_as_home: profile.farmAddressSameAsHome,
  });

  const buildFarmPayload = () => ({
    first_name: profile.firstName,
    last_name: profile.lastName,
    phone: profile.phone,
    address: profile.address, // Include home address so same_as_home logic works on backend
    city: 'Minglanilla',
    province: 'Cebu',
    zip_code: '6046',
    latitude: profile.latitude,
    longitude: profile.longitude,
    farm_name: profile.farmName,
    farm_address: profile.farmAddress,
    farm_city: 'Minglanilla',
    farm_province: 'Cebu',
    farm_zip_code: '6046',
    farm_latitude: profile.farmLatitude,
    farm_longitude: profile.farmLongitude,
    farm_address_same_as_home: profile.farmAddressSameAsHome,
  });

  const buildPersonalSignature = (source: Partial<UserProfile>) =>
    JSON.stringify({
      firstName: source.firstName || '',
      lastName: source.lastName || '',
      phone: source.phone || '',
      address: source.address || '',
      city: source.city || '',
      province: source.province || '',
      zipCode: source.zipCode || '',
      latitude: source.latitude ?? '',
      longitude: source.longitude ?? '',
      bio: source.bio || '',
    });

  const buildFarmSignature = (source: Partial<UserProfile>) =>
    JSON.stringify({
      farmName: source.farmName || '',
      farmAddress: source.farmAddress || '',
      farmCity: source.farmCity || '',
      farmProvince: source.farmProvince || '',
      farmZipCode: source.farmZipCode || '',
      farmLatitude: source.farmLatitude ?? '',
      farmLongitude: source.farmLongitude ?? '',
      farmAddressSameAsHome: source.farmAddressSameAsHome ?? true,
    });

  const performSavePersonalInfo = async () => {
    if (!token || !userId) {
      toast.error('Session expired. Please sign in again.');
      navigate('/login');
      return;
    }

    const hasPendingImage = !!pendingProfileImageFile;
    const hasProfileChanges = buildPersonalSignature(profile) !== personalSnapshotRef.current;
    if (!hasPendingImage && !hasProfileChanges) {
      toast.info('Nothing to update.');
      return;
    }

    setSaveLoading(true);
    try {
      const form = new FormData();
      const payload = buildPersonalPayload() as Record<string, unknown>;
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          form.append(key, '');
        } else {
          form.append(key, String(value));
        }
      });
      if (pendingProfileImageFile) {
        form.append('profile_image', pendingProfileImageFile);
      }

      const response = await fetch(`${API_BASE_URL}/users/${userId}/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.message || 'Failed to save profile.');
        return;
      }

      const data = await response.json().catch(() => ({}));
      const savedProfileImage = data?.profile_image || data?.image_path || '';

      // Update localStorage with newest profile info
      localStorage.setItem('agrilink_firstName', profile.firstName || '');
      localStorage.setItem('agrilink_lastName', profile.lastName || '');
      if (savedProfileImage) {
        localStorage.setItem('agrilink_profileImage', savedProfileImage);
      }

      setProfile((prev) => ({
        ...prev,
        profileImage: savedProfileImage || prev.profileImage,
        badges: Array.isArray(data?.badges) ? data.badges : prev.badges,
      }));

      personalSnapshotRef.current = buildPersonalSignature(profile);
      setPendingProfileImageFile(null);

      // Trigger global update event for Navbar/Sidebar/etc.
      window.dispatchEvent(new Event('agrilink-profile-updated'));
      if (savedProfileImage && pendingProfileImagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(pendingProfileImagePreview);
        setPendingProfileImagePreview(null);
      }
      toast.success('Personal information updated successfully.');
    } catch {
      toast.error('Network error while saving personal information.');
    } finally {
      setSaveLoading(false);
    }
  };

  const performSaveFarmDetails = async () => {
    if (!token || !userId) {
      toast.error('Session expired. Please sign in again.');
      navigate('/login');
      return;
    }

    const hasPendingFarmMedia = !!pendingFarmImageFile || pendingFarmGalleryFiles.length > 0;
    const hasFarmChanges = buildFarmSignature(profile) !== farmSnapshotRef.current;
    if (!hasPendingFarmMedia && !hasFarmChanges) {
      toast.info('No farm changes to update.');
      return;
    }

    if (!profile.farmAddressSameAsHome) {
      const missing: string[] = [];
      if (!String(profile.farmAddress || '').trim()) missing.push('farm address');
      if (!String(profile.farmCity || '').trim()) missing.push('farm city');
      if (!String(profile.farmProvince || '').trim()) missing.push('farm province');

      if (missing.length > 0) {
        toast.error(`Please provide ${missing.join(', ')} when farm address is different from home.`);
        return;
      }
    }

    setSaveLoading(true);
    try {
      const form = new FormData();
      const payload = buildFarmPayload() as Record<string, unknown>;
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          form.append(key, '');
        } else {
          form.append(key, String(value));
        }
      });
      if (pendingFarmImageFile) {
        form.append('farm_image', pendingFarmImageFile);
      }
      pendingFarmGalleryFiles.forEach((file) => {
        form.append('farm_gallery_images', file);
      });

      const response = await fetch(`${API_BASE_URL}/users/${userId}/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.message || 'Failed to save farm details.');
        return;
      }

      const data = await response.json().catch(() => ({}));
      const savedFarmImage = data?.farm_image || '';
      const savedFarmGallery = Array.isArray(data?.farm_gallery_images)
        ? data.farm_gallery_images
        : profile.farmGalleryImages || [];

      setProfile((prev) => ({
        ...prev,
        farmImage: savedFarmImage || prev.farmImage,
        farmGalleryImages: savedFarmGallery,
        badges: Array.isArray(data?.badges) ? data.badges : prev.badges,
      }));

      farmSnapshotRef.current = buildFarmSignature(profile);
      setPendingFarmImageFile(null);
      setPendingFarmGalleryFiles([]);
      if (savedFarmImage && pendingFarmImagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(pendingFarmImagePreview);
      }
      setPendingFarmImagePreview(null);
      pendingFarmGalleryPreviews.forEach((preview) => {
        if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
      });
      setPendingFarmGalleryPreviews([]);

      toast.success('Farm details updated successfully.');
    } catch {
      toast.error('Network error while saving farm details.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSavePersonalInfo = () => {
    const hasPendingImage = !!pendingProfileImageFile;
    const hasProfileChanges = buildPersonalSignature(profile) !== personalSnapshotRef.current;

    if (!hasPendingImage && !hasProfileChanges) {
      toast.info('Nothing to update.');
      return;
    }

    performSavePersonalInfo();
  };

  const handleSaveFarmDetails = () => {
    const hasPendingFarmMedia = !!pendingFarmImageFile || pendingFarmGalleryFiles.length > 0;
    const hasFarmChanges = buildFarmSignature(profile) !== farmSnapshotRef.current;

    if (!hasPendingFarmMedia && !hasFarmChanges) {
      toast.info('No farm changes to update.');
      return;
    }

    setIsFarmSaveConfirmOpen(true);
  };

  const handleSaveAlerts = async () => {
    if (!userId) return;
    setAlertsSaving(true);
    try {
      localStorage.setItem(`profile_alerts_${userId}`, JSON.stringify(notificationSettings));
      toast.success('Alert preferences saved.');
    } catch {
      toast.error('Unable to save alert preferences.');
    } finally {
      setAlertsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!userId) return;
    setSettingsSaving(true);
    try {
      localStorage.setItem(`profile_settings_${userId}`, JSON.stringify(appSettings));
      toast.success('Settings saved.');
    } catch {
      toast.error('Unable to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Fill in all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords must match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.message || 'Error updating password.');
        return;
      }

      toast.success('Password updated successfully.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      toast.error('Network error while updating password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const isValidImageFile = (file: File): boolean => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
    return allowed.includes(file.type);
  };

  const handleProfileImageSelect = (file: File) => {
    if (!isValidImageFile(file)) {
      toast.error('Only image files are allowed (JPG, PNG, WEBP, GIF).');
      return;
    }
    if (pendingProfileImagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(pendingProfileImagePreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingProfileImageFile(file);
    setPendingProfileImagePreview(previewUrl);
    setProfile((prev) => ({
      ...prev,
      profileImage: previewUrl,
    }));
  };

  const handleFarmImageSelect = (file: File) => {
    if (!isValidImageFile(file)) {
      toast.error('Only image files are allowed (JPG, PNG, WEBP, GIF).');
      return;
    }
    if (pendingFarmImagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(pendingFarmImagePreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingFarmImageFile(file);
    setPendingFarmImagePreview(previewUrl);
    setProfile((prev) => ({
      ...prev,
      farmImage: previewUrl,
    }));
  };

  const handleFarmGallerySelect = (files: FileList | File[]) => {
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) return;

    const invalid = selectedFiles.find((file) => !isValidImageFile(file));
    if (invalid) {
      toast.error('Only image files are allowed (JPG, PNG, WEBP, GIF).');
      return;
    }

    const nextPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPendingFarmGalleryFiles((prev) => [...prev, ...selectedFiles]);
    setPendingFarmGalleryPreviews((prev) => [...prev, ...nextPreviews]);
    toast.success(`${selectedFiles.length} image${selectedFiles.length === 1 ? '' : 's'} selected. Click update to save.`);
  };

  const handleRemovePendingGalleryImage = (pendingIndex: number) => {
    setPendingFarmGalleryFiles((prev) => prev.filter((_, idx) => idx !== pendingIndex));
    setPendingFarmGalleryPreviews((prev) => {
      const removed = prev[pendingIndex];
      if (removed?.startsWith('blob:')) {
        URL.revokeObjectURL(removed);
      }
      return prev.filter((_, idx) => idx !== pendingIndex);
    });
  };

  const handleRemoveCancelledOrder = async (reqId: number) => {
    if (!token) {
      toast.error('Session expired. Please sign in again.');
      navigate('/login');
      return;
    }

    setRemovingOrderId(reqId);
    try {
      const response = await fetch(`${API_BASE_URL}/purchases/cancelled/${reqId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.message || 'Unable to remove cancelled order.');
        return;
      }

      setOrders((prev) => prev.filter((order) => order.req_id !== reqId));
      setMyOrders((prev) => prev.filter((order) => order.req_id !== reqId));
      toast.success('Cancelled order removed.');
    } catch {
      toast.error('Network error while removing cancelled order.');
    } finally {
      setRemovingOrderId(null);
    }
  };

  const heroStyle: React.CSSProperties =
    isFarmer && profile.farmImage
      ? {
        backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.45)), url(${getFullImageUrl(profile.farmImage)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : isFarmer
        ? {
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        }
        : {
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        };

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || 'Your Name';
  const displayLocation = [profile.city, profile.province].filter(Boolean).join(', ') || 'Set your location';
  const personalUpdateLabel = 'Update Personal Information';
  const farmUpdateLabel = 'Update Farm Details';
  const displayedFarmGalleryImages = [
    ...(profile.farmGalleryImages || []).map((path) => ({
      path,
      isPending: false,
      pendingIndex: -1,
    })),
    ...pendingFarmGalleryPreviews.map((path, idx) => ({
      path,
      isPending: true,
      pendingIndex: idx,
    })),
  ];
  const hasUnsavedPersonalChanges =
    !!pendingProfileImageFile || buildPersonalSignature(profile) !== personalSnapshotRef.current;
  const hasUnsavedFarmChanges =
    !!pendingFarmImageFile ||
    pendingFarmGalleryFiles.length > 0 ||
    buildFarmSignature(profile) !== farmSnapshotRef.current;
  const hasUnsavedProfileChanges = hasUnsavedPersonalChanges || hasUnsavedFarmChanges;

  useEffect(() => {
    if (!hasUnsavedProfileChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedProfileChanges]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 pt-20 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <section
          className="relative overflow-hidden rounded-2xl border border-slate-200/70 shadow-sm"
          style={heroStyle}
        >
          <div className="p-6 md:p-8 lg:p-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="flex items-end gap-4">
                <label className="relative h-24 w-24 rounded-2xl border-4 border-white/90 bg-white/95 shadow-xl overflow-hidden grid place-items-center cursor-pointer transition-all">
                  {profile.profileImage ? (
                    <img src={getFullImageUrl(profile.profileImage)} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="w-10 h-10 text-slate-400" />
                  )}
                  {pendingProfileImageFile && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg animate-pulse">
                        SELECTED
                      </div>
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full border border-white/75 bg-slate-900/80 text-white">
                    <Camera size={12} />
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={saveLoading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProfileImageSelect(file);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>

                <div className="text-white pb-1">
                  <h1 className="text-2xl md:text-3xl font-bold capitalize flex items-center gap-2">
                    {displayName}
                    {isFarmer && profile.badges && profile.badges.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                        <Award size={12} className="fill-emerald-400" />
                        Verified
                      </span>
                    )}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/82">
                    {isFarmer
                      ? 'Manage your storefront identity, contact details, farm presentation, and order activity in one place.'
                      : 'Keep your buyer profile polished, your account secure, and your wishlist items ready for harvest.'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 uppercase tracking-wide">
                      {profile.userType}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-1">
                      <MapPin size={12} />
                      {displayLocation}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {!isBrgy && (
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                    <label className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-black/30 px-4 py-2.5 text-sm font-semibold text-white cursor-pointer hover:bg-black/45 transition">
                      <Camera size={15} />
                      {pendingProfileImageFile ? 'Photo Selected' : 'Choose Profile Photo'}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={saveLoading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProfileImageSelect(file);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                    <button
                      onClick={handleSavePersonalInfo}
                      disabled={saveLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#5ba409] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d8f08] disabled:opacity-60 shadow-lg shadow-[#3f7606]/20 transition-all active:scale-95"
                    >
                      {saveLoading ? 'Updating...' : 'Update Profile Photo'}
                    </button>
                  </div>
                )}
                {isBrgy && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/60 border border-white/20 bg-white/10 px-3 py-1.5 rounded-lg">
                    <Lock size={11} /> Read Only — Contact admin to update profile
                  </span>
                )}
                {!isBrgy && pendingProfileImageFile && (
                  <p className="text-xs font-semibold text-white/75 text-right">
                    Click "Update Profile Photo" to save your selected photo
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-1 gap-5 md:items-start md:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:sticky md:top-24">
            <div className="space-y-2">
              {[
                { id: 'info', label: 'My Profile', icon: UserIcon },
                ...(!isFarmer && !isBrgy && !isAdmin ? [{ id: 'market', label: 'Wishlist', icon: Heart, badge: wishlist.length }] : []),
                ...(!isBrgy && !isAdmin ? [{ id: 'history', label: 'Orders', icon: Clock, badge: ordersBadgeCount }] : []),
                { id: 'password', label: 'Security', icon: Lock },
                ...(!isBrgy && !isAdmin ? [{ id: 'alerts', label: 'Notifications', icon: Bell }] : []),
                ...(!isBrgy && !isAdmin ? [{ id: 'settings', label: 'Settings', icon: SlidersHorizontal }] : []),
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${activeSection === tab.id
                      ? 'bg-[#5ba409] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <tab.icon size={16} />
                  <span className="flex-1">{tab.label}</span>
                  {Number((tab as any).badge || 0) > 0 && (
                    <span
                      className={`inline-flex min-w-[20px] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${activeSection === tab.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                        }`}
                    >
                      {(tab as any).badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </aside>

          <main className="space-y-5">
            {activeSection === 'info' && (
              <section className={sectionClass}>
                {isAdmin ? (
                  <div className="flex flex-col items-center justify-center py-14 px-8 text-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-[#5ba409]/10 flex items-center justify-center">
                      <Lock size={28} className="text-[#5ba409]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">AgriLink Administrator</h2>
                      <p className="text-sm text-slate-500 mt-1">Admin profiles cannot be edited from this panel.</p>
                    </div>
                    <div className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Name</p>
                        <p className="text-sm font-semibold text-slate-700">{[profile.firstName, profile.lastName].filter(Boolean).join(' ') || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</p>
                        <p className="text-sm font-semibold text-slate-700">{profile.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role</p>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5ba409] bg-[#5ba409]/10 px-3 py-1 rounded-full uppercase tracking-widest">
                          AgriLink Admin
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">My Info</h2>
                    <p className="text-sm text-slate-500">Manage your personal and contact details.</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isBrgy ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-lg">
                        <Lock size={11} /> Profile is read-only
                      </span>
                    ) : (
                      <>
                        {hasUnsavedPersonalChanges && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Click "{personalUpdateLabel}" to save changes
                          </p>
                        )}
                        <button
                          onClick={handleSavePersonalInfo}
                          disabled={saveLoading}
                          className="rounded-xl bg-[#5ba409] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d8f08] disabled:opacity-60"
                        >
                          {saveLoading ? 'Updating...' : personalUpdateLabel}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-slate-500">First Name</span>
                    <input className={isBrgy ? `${inputClass} bg-slate-100 text-slate-500 cursor-not-allowed` : inputClass} placeholder="Enter first name" value={profile.firstName} readOnly={isBrgy} disabled={isBrgy} onChange={(e) => !isBrgy && setProfile({ ...profile, firstName: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-slate-500">Last Name</span>
                    <input className={isBrgy ? `${inputClass} bg-slate-100 text-slate-500 cursor-not-allowed` : inputClass} placeholder="Enter last name" value={profile.lastName} readOnly={isBrgy} disabled={isBrgy} onChange={(e) => !isBrgy && setProfile({ ...profile, lastName: e.target.value })} />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium text-slate-500">Email</span>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className={`${inputClass} pl-9 bg-slate-100 text-slate-500 cursor-not-allowed`}
                        value={profile.email}
                        readOnly
                        disabled
                        aria-readonly="true"
                        placeholder="No email set"
                      />
                    </div>
                  </label>

                  {!isBrgy && (
                    <>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-500">Phone</span>
                        <div className="relative">
                          <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input className={`${inputClass} pl-9`} placeholder="09xx xxx xxxx" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                        </div>
                      </label>

                      <label className="space-y-1 md:col-span-2">
                        <span className="text-xs font-medium text-slate-500">Home Barangay / Landmark</span>
                        <input className={inputClass} placeholder="e.g. Brgy. Ward 1, Near Church" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-500">City</span>
                        <input className={inputClass} value={profile.city || ''} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="e.g. Minglanilla" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-500">Province</span>
                        <input className={inputClass} value={profile.province || ''} onChange={(e) => setProfile({ ...profile, province: e.target.value })} placeholder="e.g. Cebu" />
                      </label>
                      <label className="space-y-1 md:max-w-[240px]">
                        <span className="text-xs font-medium text-slate-500">ZIP Code</span>
                        <input className={inputClass} value={profile.zipCode || ''} onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })} placeholder="e.g. 6046" />
                      </label>

                      <label className="space-y-1 md:col-span-2">
                        <span className="text-xs font-medium text-slate-500">Bio</span>
                        <textarea
                          rows={4}
                          className={inputClass}
                          value={profile.bio || ''}
                          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                          placeholder="Tell buyers and the community about you..."
                        />
                      </label>
                    </>
                  )}
                </div>
                  </>
                )}
              </section>
            )}

            {activeSection === 'market' && !isFarmer && (
              <section className={sectionClass}>
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Wishlist</h2>
                    <p className="text-sm text-slate-500">Your saved products for future harvests.</p>
                  </div>
                  <button
                    onClick={() => navigate('/buyer/marketplace')}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ShoppingCart size={15} />
                    Explore Market
                  </button>
                </div>

                <div className="p-6">
                  {wishlistLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                      <p className="text-xs text-slate-400 font-medium">Updating Wishlist...</p>
                    </div>
                  ) : wishlist.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                        <Heart size={32} />
                      </div>
                      <h3 className="text-base font-bold text-slate-900">Your wishlist is empty</h3>
                      <p className="text-sm text-slate-500 mt-1 max-w-[240px]">Save some products to see them here later!</p>
                      <button
                        onClick={() => navigate('/buyer/marketplace')}
                        className="mt-6 rounded-xl bg-[#5ba409] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#3f7606]/10 hover:bg-[#4d8f08] transition-all hover:-translate-y-0.5"
                      >
                        Shop Now
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                      {wishlist.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          isFavorited={true}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeSection === 'password' && (
              <section className={`${sectionClass} space-y-4 p-6`}>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
                  <p className="text-sm text-slate-500">Use a strong password with at least 8 characters.</p>
                </div>
                <input className={inputClass} type="password" placeholder="Current password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} />
                <input className={inputClass} type="password" placeholder="New password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} />
                <input className={inputClass} type="password" placeholder="Confirm new password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
                <button onClick={handleUpdatePassword} disabled={passwordLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </section>
            )}

            {activeSection === 'alerts' && (
              <section className={`${sectionClass} space-y-4 p-6`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Alerts</h2>
                    <p className="text-sm text-slate-500">Choose your notification preferences.</p>
                  </div>
                  <button onClick={handleSaveAlerts} disabled={alertsSaving} className="rounded-xl bg-[#5ba409] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d8f08] disabled:opacity-60">
                    {alertsSaving ? 'Saving...' : 'Save Alerts'}
                  </button>
                </div>

                {[
                  { id: 'orders', label: isFarmer ? 'New Orders' : 'Order Approved', desc: isFarmer ? 'Alert me when someone places an order.' : 'Alert me when a farmer approves my order.' },
                  { id: 'messages', label: 'Messages', desc: 'Alert me when I receive a new message.' },
                ].map((item) => (
                  <label key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <ToggleSwitch
                      checked={(notificationSettings as Record<string, boolean>)[item.id]}
                      onChange={(next) => setNotificationSettings((prev) => ({ ...prev, [item.id]: next }))}
                      ariaLabel={`${item.label} toggle`}
                    />
                  </label>
                ))}
              </section>
            )}

            {activeSection === 'info' && isFarmer && (
              <section className={sectionClass}>
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">My Farm</h2>
                    <p className="text-sm text-slate-500">Manage your farm details and banner image.</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {hasUnsavedFarmChanges && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Click "{farmUpdateLabel}" to save changes
                      </p>
                    )}
                    <button onClick={handleSaveFarmDetails} disabled={saveLoading} className="rounded-xl bg-[#5ba409] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d8f08] disabled:opacity-60">
                      {saveLoading ? 'Updating...' : farmUpdateLabel}
                    </button>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative h-20 w-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                      {profile.farmImage ? (
                        <img src={getFullImageUrl(profile.farmImage)} alt="Farm" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-xs text-slate-400">No image</div>
                      )}
                      {pendingFarmImageFile && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                          <span className="rounded-full bg-[#5ba409] px-2 py-0.5 text-[10px] font-bold text-white">SELECTED</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-emerald-900">Farm Banner</p>
                      <p className="text-xs text-slate-500 mb-2">Upload a farm image shown on your profile header.</p>
                      <label className="inline-flex items-center gap-2 rounded-lg bg-[#4d8f08] px-3 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-[#5ba409]">
                        <Camera size={14} />
                        {pendingFarmImageFile ? 'Change Farm Image' : 'Select Farm Image'}
                        <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={saveLoading} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFarmImageSelect(file); e.currentTarget.value = ''; }} />
                      </label>
                      {pendingFarmImageFile && (
                        <p className="mt-2 text-[11px] font-medium text-emerald-700">
                          Selected: {pendingFarmImageFile.name}. Click "{farmUpdateLabel}" to apply.
                        </p>
                      )}
                    </div>
                  </div>

                  {isFarmer && (
                    <div className="md:col-span-2 rounded-xl border border-emerald-200/60 bg-emerald-50/20 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Award className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-sm font-bold text-emerald-900">Official Certifications & Badges</h3>
                      </div>
                      {profile.badges && profile.badges.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {profile.badges.map((badge, idx) => (
                            <div key={idx} className="rounded-xl bg-white border border-emerald-100 p-3 shadow-sm flex items-start gap-3">
                              <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                                <Award size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{badge.badge_label}</p>
                                <p className="text-[11px] text-slate-500 font-medium">Issued by {badge.issuer_first} {badge.issuer_last}</p>
                                {badge.notes && <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">"{badge.notes}"</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 rounded-xl bg-white/50 border border-slate-200 border-dashed">
                          <p className="text-xs text-slate-500">You don't have any official trust badges yet.</p>
                          <p className="text-[10px] text-slate-400 mt-1">Local officials verify farms and award badges based on trust and quality.</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="md:col-span-2 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-emerald-900">Farm Gallery</p>
                        <p className="text-xs text-slate-500">Upload multiple farm photos for your public profile.</p>
                      </div>
                      <label className="inline-flex items-center gap-2 rounded-lg bg-[#4d8f08] px-3 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-[#5ba409]">
                        <Camera size={14} />
                        {pendingFarmGalleryFiles.length > 0 ? 'Add More Images' : 'Select Gallery Images'}
                        <input
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          disabled={saveLoading}
                          onChange={(e) => {
                            if (e.target.files?.length) {
                              handleFarmGallerySelect(e.target.files);
                            }
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>

                    {pendingFarmGalleryFiles.length > 0 && (
                      <p className="mb-3 text-[11px] font-medium text-emerald-700">
                        {pendingFarmGalleryFiles.length} selected image{pendingFarmGalleryFiles.length === 1 ? '' : 's'} pending. Click "{farmUpdateLabel}" to apply.
                      </p>
                    )}

                    {displayedFarmGalleryImages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {displayedFarmGalleryImages.map((item, idx) => (
                          <div key={`${item.path}-${idx}-${item.isPending ? 'pending' : 'saved'}`} className="relative aspect-[4/3] rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                            <img src={getFullImageUrl(item.path)} alt={`Farm gallery ${idx + 1}`} className="h-full w-full object-cover" />
                            {item.isPending && (
                              <>
                                <span className="absolute left-1.5 top-1.5 rounded bg-[#5ba409] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  SELECTED
                                </span>
                                <button
                                  type="button"
                                  aria-label="Remove selected image"
                                  onClick={() => handleRemovePendingGalleryImage(item.pendingIndex)}
                                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/65 text-white hover:bg-black/80"
                                >
                                  <X size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                        No gallery images yet. Upload photos of your farm, crops, or operations.
                      </div>
                    )}
                  </div>

                  <label className="space-y-1">
                    <span className="text-xs font-medium text-slate-500">Farm Name</span>
                    <input className={inputClass} placeholder="Enter farm name" value={profile.farmName || ''} onChange={(e) => setProfile({ ...profile, farmName: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-slate-500">Farm Barangay / Landmark</span>
                    <input className={inputClass} placeholder="e.g. Brgy. Cadulawan, Near River" value={profile.farmAddress || ''} onChange={(e) => setProfile({ ...profile, farmAddress: e.target.value })} disabled={profile.farmAddressSameAsHome} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-slate-500">Farm City</span>
                    <input className={inputClass} placeholder="e.g. Minglanilla" value={profile.farmCity || profile.city || ''} onChange={(e) => setProfile({ ...profile, farmCity: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-slate-500">Farm Province</span>
                    <input className={inputClass} placeholder="e.g. Cebu" value={profile.farmProvince || profile.province || ''} onChange={(e) => setProfile({ ...profile, farmProvince: e.target.value })} />
                  </label>
                  <label className="space-y-1 md:max-w-[240px]">
                    <span className="text-xs font-medium text-slate-500">Farm ZIP Code</span>
                    <input className={inputClass} placeholder="e.g. 6046" value={profile.farmZipCode || profile.zipCode || ''} onChange={(e) => setProfile({ ...profile, farmZipCode: e.target.value })} />
                  </label>

                  <div className="md:col-span-2 mt-1 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm text-slate-700">Use home address as farm address</p>
                    <ToggleSwitch
                      checked={profile.farmAddressSameAsHome ?? true}
                      onChange={(next) => setProfile({ ...profile, farmAddressSameAsHome: next })}
                      ariaLabel="Use home address for farm"
                    />
                  </div>

                  {!profile.farmAddressSameAsHome && (
                    <div className="space-y-1 md:col-span-2">
                      <span className="text-xs font-medium text-slate-500">Farm Location Pin</span>
                      <div className="h-[220px] w-full rounded-2xl border border-slate-200 overflow-hidden relative group">
                        <MapGL
                          initialViewState={{
                            longitude: profile.farmLongitude || profile.longitude || 123.792,
                            latitude: profile.farmLatitude || profile.latitude || 10.245,
                            zoom: 14
                          }}
                          mapStyle="mapbox://styles/mapbox/streets-v11"
                          mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                          onClick={(e) => {
                            setProfile({
                              ...profile,
                              farmLatitude: e.lngLat.lat,
                              farmLongitude: e.lngLat.lng
                            });
                          }}
                        >
                          <Marker
                            longitude={profile.farmLongitude || 123.792}
                            latitude={profile.farmLatitude || 10.245}
                            anchor="bottom"
                          >
                            <MapPin className="w-8 h-8 text-emerald-600 fill-white drop-shadow-md" />
                          </Marker>
                        </MapGL>
                        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm pointer-events-none transition-opacity group-hover:opacity-0">
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Click to set pin</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Coordinates: {profile.farmLatitude?.toFixed(6) || '0'}, {profile.farmLongitude?.toFixed(6) || '0'}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeSection === 'history' && (
              <section className={sectionClass}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {isFarmer && orderScope === 'sales' ? 'Product Orders' : 'My Orders'} ({activeOrders.length})
                    </h2>
                    <p className="text-sm text-slate-500">
                      {isFarmer && orderScope === 'sales'
                        ? 'Orders placed for your listed products.'
                        : 'Orders you placed as a buyer account.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFarmer && (
                      <div className="mr-1 inline-flex rounded-lg border border-slate-200 p-0.5">
                        <button
                          type="button"
                          onClick={() => setOrderScope('sales')}
                          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                            orderScope === 'sales'
                              ? 'bg-[#5ba409] text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Product Orders
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderScope('purchases')}
                          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                            orderScope === 'purchases'
                              ? 'bg-[#5ba409] text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          My Orders
                        </button>
                      </div>
                    )}
                    <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>{status === 'all' ? 'All Statuses' : status}</option>
                      ))}
                    </select>
                    <select value={orderSort} onChange={(e) => setOrderSort(e.target.value as 'latest' | 'oldest')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <option value="latest">Latest</option>
                      <option value="oldest">Oldest</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {filteredOrders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">No orders found for the selected filters.</div>
                  ) : (
                    filteredOrders.map((order) => {
                      const status = (order.req_status || 'Unknown').toLowerCase();
                      const isCancelledStatus = status.includes('cancel');
                      const isCompletedStatus = status === 'completed';
                      const hasFarmerServiceReview =
                        Number(order.has_farmer_review || 0) > 0 || order.has_farmer_review === true;
                      const badgeClass = statusClasses[status] || 'bg-slate-100 text-slate-700 border-slate-200';
                      const showingSales = isFarmer && orderScope === 'sales';
                      const counterpart = showingSales
                        ? `${order.buyer_first || ''} ${order.buyer_last || ''}`.trim() || 'Buyer'
                        : `${order.farmer_first || ''} ${order.farmer_last || ''}`.trim() || 'Farmer';
                      const dateText = new Date(order.req_date || order.created_at || '').toLocaleDateString();
                      const amount = Number(order.quantity || 0) * Number(order.p_price || 0);
                      const invoiceNumber = String(order.invoice_number || '').trim();
                      const isInvoiceHighlighted =
                        Boolean(highlightedInvoice) &&
                        Boolean(invoiceNumber) &&
                        highlightedInvoice.toLowerCase() === invoiceNumber.toLowerCase();

                      return (
                        <article
                          key={order.req_id}
                          className={`rounded-xl border border-slate-200 flex cursor-pointer flex-col md:flex-row md:items-center ${appSettings.compactOrders ? 'p-3 gap-3' : 'p-4 gap-4'} hover:border-[#5ba409]/40 hover:bg-[#f8fce8]`}
                          onClick={() => setInvoiceOrder(order)}
                        >
                          <div className="h-16 w-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                            {order.p_image ? (
                              <img src={getFullImageUrl(order.p_image)} alt={order.p_name || 'Product'} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full grid place-items-center text-[10px] text-slate-400">No image</div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{order.p_name || 'Untitled Product'}</p>
                            <p className="text-xs text-slate-500">
                              Order #{order.req_id} - {dateText}
                              {invoiceNumber ? ` - Order ID ${invoiceNumber}` : ''}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {showingSales ? 'Buyer' : 'Farmer'}: <span className="font-medium text-slate-700">{counterpart}</span>
                            </p>
                          </div>

                          <div className="md:text-right space-y-1">
                            <p className="text-sm font-semibold text-slate-900">PHP {amount.toLocaleString()}</p>
                            <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium capitalize ${badgeClass}`}>
                              {order.req_status}
                            </span>
                            {isCancelledStatus && (
                              <div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOrderPendingRemoval(order);
                                  }}
                                  disabled={removingOrderId === order.req_id}
                                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-60"
                                  aria-label={`Remove cancelled order ${order.req_id}`}
                                >
                                  <Trash2 size={12} />
                                  {removingOrderId === order.req_id ? 'Removing...' : 'Remove'}
                                </button>
                              </div>
                            )}

                            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                              {isCompletedStatus && invoiceNumber && (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                                    isInvoiceHighlighted
                                      ? 'border-[#5ba409] bg-[#eaf8d5] text-[#3f7606]'
                                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  }`}
                                >
                                  Order ID {invoiceNumber}
                                </span>
                              )}
                              {isCompletedStatus && (!isFarmer || orderScope === 'purchases') && !hasFarmerServiceReview && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReview(order);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600 hover:bg-amber-100"
                              >
                                <Star size={12} className="fill-amber-600" />
                                Review Farmer Service
                              </button>
                              )}
                              {isCompletedStatus && (!isFarmer || orderScope === 'purchases') && hasFarmerServiceReview && (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                  <Star size={12} className="fill-emerald-600 text-emerald-600" />
                                  Reviewed
                                </span>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            )}
            {activeSection === 'settings' && (
              <section className={`${sectionClass} p-6`}>
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Platform Settings</h2>
                    <p className="text-sm text-slate-500">Configure your global account preferences.</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Globe2 size={18} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Language & Region</h3>
                    <p className="mb-3 text-xs text-slate-500">Set your preferred language and regional formats.</p>
                    <select
                      className={inputClass}
                      value={appSettings.language}
                      onChange={(e) => setAppSettings((prev) => ({ ...prev, language: e.target.value }))}
                    >
                      <option value="en-PH">English (Philippines)</option>
                      <option value="fil-PH">Filipino</option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Compact Order View</h3>
                        <p className="text-xs text-slate-500">Reduce spacing in your Orders list for faster scanning.</p>
                      </div>
                      <ToggleSwitch
                        checked={appSettings.compactOrders}
                        onChange={(next) => setAppSettings((prev) => ({ ...prev, compactOrders: next }))}
                        ariaLabel="Compact order view toggle"
                      />
                    </div>
                  </div>

                  {/* Security Section */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center gap-3 text-slate-900">
                      <Lock size={18} className="text-emerald-600" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Security & Privacy</h3>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Current Password</span>
                        <input
                          type="password"
                          className={inputClass}
                          placeholder="••••••••"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">New Password</span>
                        <input
                          type="password"
                          className={inputClass}
                          placeholder="••••••••"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Confirm New</span>
                        <input
                          type="password"
                          className={inputClass}
                          placeholder="••••••••"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleUpdatePassword}
                        disabled={passwordLoading}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                      >
                        {passwordLoading ? 'Updating...' : 'Change Password'}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveSettings}
                      disabled={settingsSaving}
                      className="rounded-xl bg-[#5ba409] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-[#4d8f08] transform hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-60"
                    >
                      {settingsSaving ? 'Saving Changes...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
      />

      <Modal isOpen={!!orderPendingRemoval} onClose={() => setOrderPendingRemoval(null)} maxWidth="max-w-lg">
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-5">
            <p className="inline-flex items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800">AgriLink Order Confirmation</p>
            <div className="mt-3 flex items-start gap-3">
              <div className="mt-0.5 h-11 w-11 rounded-xl bg-amber-100 text-amber-700 grid place-items-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">Confirm Order Removal</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                  This action will permanently remove order #{orderPendingRemoval?.req_id} from your order history.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
            This action is irreversible and cannot be undone.
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setOrderPendingRemoval(null)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!orderPendingRemoval) return;
                await handleRemoveCancelledOrder(orderPendingRemoval.req_id);
                setOrderPendingRemoval(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <Trash2 size={14} />
              Confirm Removal
            </button>
          </div>
        </div>
      </Modal>
      <OrderInvoiceModal
        isOpen={Boolean(invoiceOrder)}
        onClose={() => setInvoiceOrder(null)}
        order={invoiceOrder}
        viewerRole={isFarmer && orderScope === 'sales' ? 'farmer' : 'buyer'}
      />

      <Modal isOpen={isFarmSaveConfirmOpen} onClose={() => setIsFarmSaveConfirmOpen(false)} maxWidth="max-w-lg">
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-5">
            <p className="inline-flex items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800">Confirm Update</p>
            <div className="mt-3 flex items-start gap-3">
              <div className="mt-0.5 h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
                <Camera size={18} />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">Save Farm Details?</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                  This will update your farm details and selected farm media in the database.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-700 space-y-1">
            <p>Farm banner: <span className="font-semibold">{pendingFarmImageFile ? pendingFarmImageFile.name : 'No new change'}</span></p>
            <p>Farm gallery: <span className="font-semibold">{pendingFarmGalleryFiles.length > 0 ? `${pendingFarmGalleryFiles.length} pending image(s)` : 'No new change'}</span></p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsFarmSaveConfirmOpen(false);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                setIsFarmSaveConfirmOpen(false);
                await performSaveFarmDetails();
              }}
              disabled={saveLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5ba409] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4d8f08] transition-colors disabled:opacity-60"
            >
              {saveLoading ? 'Updating...' : 'Confirm and Save'}
            </button>
          </div>
        </div>
      </Modal>

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        order={selectedOrderForReview}
        onSuccess={() => {
          const reviewedReqId = selectedOrderForReview?.req_id;
          if (!reviewedReqId) return;

          setOrders((prev) =>
            prev.map((row) =>
              row.req_id === reviewedReqId ? { ...row, has_farmer_review: 1 } : row
            )
          );
          setMyOrders((prev) =>
            prev.map((row) =>
              row.req_id === reviewedReqId ? { ...row, has_farmer_review: 1 } : row
            )
          );
        }}
      />
    </div>
  );
};

export default ProfilePage;
