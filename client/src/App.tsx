import React, { useEffect, useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import RouteTransition from './components/ui/RouteTransition';
import LandingPage from './components/pages/LandingPage';
import MarketplacePage from './components/pages/MarketplacePage';
import FarmerDashboard from './components/pages/Farmer/FarmerDashboardV2';
import FarmerListingsPage from './components/pages/Farmer/FarmerListingsPageV2';
import FarmerOrdersPage from './components/pages/Farmer/FarmerOrdersPageV2';
import FarmerEarningsPage from './components/pages/Farmer/FarmerEarningsPageV2';
import FarmerPhenotypingPage from './components/pages/Farmer/FarmerPhenotypingPageV2';
import FarmerPublicProfilePage from './components/pages/Farmer/FarmerPublicProfilePage';
import EditProductModalRoute from './components/pages/Farmer/EditProductModalRoute';
import AddProductModal from './components/pages/Farmer/AddProductModalV2';
import EditProductModal from './components/pages/Farmer/EditProductModal';
import ProductUploadPage from './components/pages/Farmer/ProductUploadPage';
import AdminDashboard from './components/pages/Admin/AdminDashboard';
import AdminUsersPage from './components/pages/Admin/AdminUsersPage';
import AdminListingsPage from './components/pages/Admin/AdminListingsPage';
import AdminOrdersPage from './components/pages/Admin/AdminOrdersPage';
import { LoginPage } from './components/pages/LoginPage';
import TransactionLogsPage from './components/pages/Admin/TransactionLogsPage';
import { RegisterPage } from './components/pages/RegisterPage';
import ForgotPasswordPage from './components/pages/ForgotPasswordPage';
import ResetPasswordPage from './components/pages/ResetPasswordPage';
import ProfilePage from './components/pages/ProfilePage';
import LogsPage from './components/pages/LogsPage';
import MessagesPage from './components/pages/MessagesPage';
import NotificationsPage from './components/pages/NotificationsPage';
import ProductDetailPage from './components/pages/Buyer/ProductDetailPage';
import CartPage from './components/pages/Buyer/CartPage';
import BuyerPublicProfilePage from './components/pages/Buyer/BuyerPublicProfilePage';
import MapPage from './components/pages/MapPage';
import AboutPage from './components/pages/AboutPage';
import LegalPage from './components/pages/LegalPage';
import BrgyDashboard from './components/pages/Brgy/BrgyDashboard';
import BrgyListingsPage from './components/pages/Brgy/BrgyListingsPage';
import OnboardingModal from './components/modals/OnboardingModal';
import { ArrowUp } from 'lucide-react';
import { ToastContainer } from './components/ui/Toast';
import { MessagingProvider } from './contexts/MessagingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { API_BASE_URL } from './api/apiConfig';

const SIDEBAR_ROUTES = [
  '/farmer/dashboard',
  '/farmer/listings',
  '/farmer/orders',
  '/farmer/upload',
  '/farmer/earnings',
  '/farmer/phenotyping',
  '/admin/dashboard',
  '/brgy/dashboard',
  '/brgy/listings',
  '/admin/users',
  '/admin/listings',
  '/admin/orders',
  '/buyer/marketplace',
  '/profile',
  '/admin/transaction-logs',
  '/logs',
  '/buyer/cart',
  '/buyer/map',
  '/farmer/map',
  '/messages',
  '/notifications',
];

interface EditableProduct {
  p_id?: string | number;
  [key: string]: unknown;
}

interface LoginUserData {
  id?: string | number;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  image_path?: string;
  onboarding_completed?: number | boolean;
}

const getHomeRoute = (role: string) => {
  const normalized = role.toLowerCase();
  if (normalized === 'farmer') return '/farmer/dashboard';
  if (normalized === 'admin') return '/admin/dashboard';
  if (normalized === 'brgy_official') return '/brgy/dashboard';
  return '/buyer/marketplace';
};

const AppContent: React.FC = () => {
  const initialRole = localStorage.getItem('agrilink_role') || 'buyer';
  const initialLoggedIn =
    localStorage.getItem('agrilink_isLoggedIn') === 'true' ||
    !!localStorage.getItem('agrilink_token') ||
    !!localStorage.getItem('agrilink_id');
  const initialOnboardingCompleted = localStorage.getItem('agrilink_onboarding_completed') === '1';

  const [userType, setUserType] = useState<string>(initialRole);
  const [firstName, setFirstName] = useState<string>(localStorage.getItem('agrilink_firstName') || '');
  const [lastName, setLastName] = useState<string>(localStorage.getItem('agrilink_lastName') || '');
  const [profileImage, setProfileImage] = useState<string>(localStorage.getItem('agrilink_profileImage') || '');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(initialLoggedIn);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    initialLoggedIn &&
      (initialRole.toLowerCase() === 'buyer' || initialRole.toLowerCase() === 'farmer') &&
      !initialOnboardingCompleted
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState<boolean>(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<EditableProduct | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOpenModal = () => setIsAddProductModalOpen(true);
    window.addEventListener('open-add-product', handleOpenModal);
    return () => window.removeEventListener('open-add-product', handleOpenModal);
  }, []);

  useEffect(() => {
    const handleOpenEditModal = (event: Event) => {
      const customEvent = event as CustomEvent<EditableProduct>;
      setEditingProduct(customEvent.detail || null);
      setIsEditProductModalOpen(true);
    };
    window.addEventListener('open-edit-product', handleOpenEditModal as EventListener);
    return () => window.removeEventListener('open-edit-product', handleOpenEditModal as EventListener);
  }, []);

  useEffect(() => {
    const routeTitles: { [key: string]: string } = {
      '/': 'AgriLink | Fresh Farm Produce',
      '/buyer/marketplace': 'Marketplace | AgriLink',
      '/farmer/dashboard': 'Farmer Dashboard | AgriLink',
      '/farmer/listings': 'My Listings | AgriLink',
      '/farmer/orders': 'Farmer Orders | AgriLink',
      '/buyer/dashboard': 'My Profile | AgriLink',
      '/farmer/upload': 'Upload Product | AgriLink',
      '/admin/dashboard': 'Admin Dashboard | AgriLink',
      '/brgy/dashboard': 'Barangay Dashboard | AgriLink',
      '/brgy/listings': 'Barangay Listings | AgriLink',
      '/lgu-dashboard': 'LGU Dashboard | AgriLink',
      '/admin/users': 'Manage Users | AgriLink',
      '/admin/listings': 'Manage Listings | AgriLink',
      '/admin/orders': 'Manage Orders | AgriLink',
      '/login': 'Login | AgriLink',
      '/register': 'Join AgriLink | Register',
      '/profile': 'My Profile | AgriLink',
      '/logs': 'Activity Logs | AgriLink',
      '/buyer/cart': 'Shopping Basket | AgriLink',
      '/buyer/checkout': 'Checkout | AgriLink',
      '/buyer/map': 'Farm Route Map | AgriLink',
      '/farmer/map': 'Farm Management Map | AgriLink',
      '/messages': 'Messages | AgriLink',
      '/notifications': 'Activities | AgriLink',
      '/about': 'About Us | AgriLink',
      '/legal': 'Terms & Privacy | AgriLink',
    };
    if (location.pathname.startsWith('/profile/buyer/')) {
      document.title = 'Buyer Profile | AgriLink';
    } else if (location.pathname.startsWith('/profile/')) {
      document.title = 'Farmer Profile | AgriLink';
    } else {
      document.title = routeTitles[location.pathname] || 'AgriLink';
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleCompletion = () => {
      setShowOnboarding(false);
    };

    const handleProfileUpdate = () => {
      setFirstName(localStorage.getItem('agrilink_firstName') || '');
      setLastName(localStorage.getItem('agrilink_lastName') || '');
      setProfileImage(localStorage.getItem('agrilink_profileImage') || '');
    };

    window.addEventListener('agrilink-onboarding-completed', handleCompletion);
    window.addEventListener('agrilink-profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('agrilink-onboarding-completed', handleCompletion);
      window.removeEventListener('agrilink-profile-updated', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const token = localStorage.getItem('agrilink_token');
    const userId = localStorage.getItem('agrilink_id');
    if (!token || !userId) return;

    let isCancelled = false;

    const hydrateProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.status === 401 || res.status === 403) {
           // Auto-logout if token is expired or invalid
           setIsLoggedIn(false);
           localStorage.clear();
           navigate('/login');
           window.dispatchEvent(new Event('agrilink-auth-changed'));
           return;
        }

        if (!res.ok || isCancelled) return;

        const data = await res.json();
        const nextFirstName = data.first_name || '';
        const nextLastName = data.last_name || '';
        const nextProfileImage = data.profile_image || data.image_path || '';

        if (isCancelled) return;

        setFirstName(nextFirstName);
        setLastName(nextLastName);
        setProfileImage(nextProfileImage);

        localStorage.setItem('agrilink_firstName', nextFirstName);
        localStorage.setItem('agrilink_lastName', nextLastName);
        localStorage.setItem('agrilink_profileImage', nextProfileImage);
      } catch {
        // keep current local profile state when fetch fails
      }
    };

    hydrateProfile();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn]);

  const handleLogin = (role: string, userData?: LoginUserData, token?: string) => {
    const sanitizedRole = role.toLowerCase();
    setUserType(sanitizedRole);
    setIsLoggedIn(true);

    if (token) {
      localStorage.setItem('agrilink_token', token);
    }

    if (userData) {
      setFirstName(userData.first_name || '');
      setLastName(userData.last_name || '');
      setProfileImage(userData.profile_image || userData.image_path || '');
      localStorage.setItem('agrilink_firstName', userData.first_name || '');
      localStorage.setItem('agrilink_lastName', userData.last_name || '');
      localStorage.setItem('agrilink_profileImage', userData.profile_image || userData.image_path || '');
      localStorage.setItem('agrilink_id', String(userData.id || ''));

      const onboardingStatus = userData.onboarding_completed === 1;
      localStorage.setItem('agrilink_onboarding_completed', onboardingStatus ? '1' : '0');

      if ((sanitizedRole === 'buyer' || sanitizedRole === 'farmer') && !onboardingStatus) {
        setShowOnboarding(true);
      }
    }

    localStorage.setItem('agrilink_role', sanitizedRole);
    localStorage.setItem('agrilink_isLoggedIn', 'true');
    window.dispatchEvent(new Event('agrilink-auth-changed'));
  };

  const handleLogout = async () => {
    // Notify server for auditing
    try {
      const token = localStorage.getItem('agrilink_token');
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.error('Logout log failed', e);
    }

    setIsLoggedIn(false);
    setFirstName('');
    setLastName('');
    setProfileImage('');
    localStorage.removeItem('agrilink_role');
    localStorage.removeItem('agrilink_isLoggedIn');
    localStorage.removeItem('agrilink_user');
    localStorage.removeItem('agrilink_firstName');
    localStorage.removeItem('agrilink_lastName');
    localStorage.removeItem('agrilink_profileImage');
    localStorage.removeItem('agrilink_token');
    localStorage.removeItem('agrilink_id');
    localStorage.removeItem('agrilink_onboarding_completed');
    setShowOnboarding(false);
    navigate('/login');
    window.dispatchEvent(new Event('agrilink-auth-changed'));
  };

  const homeRoute = getHomeRoute(userType);
  const hasRole = (allowedRoles: string[]) => allowedRoles.includes(userType.toLowerCase());

  const sidebarVisibleRoles = ['farmer', 'admin', 'brgy_official'];
  const nonSidebarRoutes = ['/login', '/register', '/'];
  const showSidebar =
    isLoggedIn &&
    sidebarVisibleRoles.includes(userType.toLowerCase()) &&
    !nonSidebarRoutes.includes(location.pathname);
  const isMessagesRoute = location.pathname === '/messages';

  useEffect(() => {
    if (!isMessagesRoute) return;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [isMessagesRoute]);

  const mainClassName = isMessagesRoute
    ? showSidebar
      ? 'flex-1 min-h-0 h-[100dvh] overflow-hidden'
      : 'flex-1 min-h-0 mt-20 h-[calc(100dvh-5rem)] overflow-hidden'
    : showSidebar
      ? 'flex-1 min-h-0'
      : 'flex-1 min-h-0 pt-20';

  const appShellClassName = isMessagesRoute
    ? 'h-[100dvh] bg-white flex overflow-hidden'
    : 'min-h-screen bg-white flex overflow-x-hidden';

  return (
    <div className={appShellClassName}>
      <ToastContainer />

      {showOnboarding && (
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          userId={localStorage.getItem('agrilink_id') || ''}
          userName={`${firstName} ${lastName}`.trim() || firstName}
          userType={userType}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      {showSidebar && (
        <Sidebar
          userType={userType}
          firstName={firstName}
          lastName={lastName}
          profileImage={profileImage}
          setUserType={setUserType}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          onLogout={handleLogout}
        />
      )}

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${showSidebar ? (sidebarCollapsed ? 'md:ml-20' : 'md:ml-64') : ''}`}>
        {!showSidebar && (
          <Navbar
            currentPage={location.pathname}
            userType={userType}
            firstName={firstName}
            lastName={lastName}
            profileImage={profileImage}
            setUserType={setUserType}
            isLoggedIn={isLoggedIn}
            onLogout={handleLogout}
          />
        )}

        <main className={mainClassName}>
            <Routes location={location} key={`${location.pathname}${location.search}`}>
              <Route path="/" element={isLoggedIn ? <Navigate to={homeRoute} replace /> : <LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/legal" element={<LegalPage />} />
              <Route
                path="/login"
                element={
                  isLoggedIn ? <Navigate to={homeRoute} replace /> : <LoginPage onLogin={handleLogin} isLoggedIn={isLoggedIn} userType={userType} />
                }
              />
              <Route path="/register" element={isLoggedIn ? <Navigate to={homeRoute} replace /> : <RegisterPage onLogin={handleLogin} />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route path="/profile" element={isLoggedIn ? <ProfilePage onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
              <Route path="/profile/buyer/:userId" element={isLoggedIn ? <BuyerPublicProfilePage /> : <Navigate to="/login" replace />} />
              <Route path="/profile/:userId" element={isLoggedIn ? <FarmerPublicProfilePage /> : <Navigate to="/login" replace />} />
              <Route path="/messages" element={isLoggedIn ? <MessagesPage userType={userType} /> : <Navigate to="/login" replace />} />
              <Route path="/notifications" element={isLoggedIn ? <NotificationsPage userType={userType} /> : <Navigate to="/login" replace />} />

              <Route path="/farmer/dashboard" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['farmer']) ? <FarmerDashboard /> : <Navigate to={homeRoute} replace />} />
              <Route path="/farmer/listings" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['farmer']) ? <FarmerListingsPage /> : <Navigate to={homeRoute} replace />} />
              <Route path="/farmer/orders" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['farmer']) ? <FarmerOrdersPage /> : <Navigate to={homeRoute} replace />} />
              <Route path="/farmer/upload" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['farmer']) ? <ProductUploadPage /> : <Navigate to={homeRoute} replace />} />
              <Route path="/farmer/earnings" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['farmer']) ? <FarmerEarningsPage /> : <Navigate to={homeRoute} replace />} />
              <Route path="/farmer/phenotyping" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['farmer']) ? <FarmerPhenotypingPage /> : <Navigate to={homeRoute} replace />} />
              <Route path="/farmer/edit-product/:id" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['farmer']) ? <EditProductModalRoute /> : <Navigate to={homeRoute} replace />} />

              <Route path="/buyer/dashboard" element={<Navigate to="/profile" replace />} />
              <Route path="/buyer/marketplace" element={<MarketplacePage />} />
              <Route path="/buyer/product/:id" element={<ProductDetailPage />} />
              <Route
                path="/buyer/cart"
                element={
                  !isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['buyer', 'farmer']) ? <CartPage /> : <Navigate to={homeRoute} replace />
                }
              />
              <Route path="/buyer/checkout/:id" element={<Navigate to="/profile?tab=market" replace />} />
              <Route
                path="/buyer/map"
                element={
                  !isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['buyer', 'farmer']) ? <MapPage /> : <Navigate to={homeRoute} replace />
                }
              />
              <Route
                path="/farmer/map"
                element={
                  !isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['farmer']) ? <MapPage /> : <Navigate to={homeRoute} replace />
                }
              />

              <Route path="/admin/dashboard" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['admin']) ? <AdminDashboard /> : <Navigate to={homeRoute} replace />} />
              <Route path="/admin/users" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['admin', 'brgy_official']) ? <AdminUsersPage viewerRole={userType} /> : <Navigate to={homeRoute} replace />} />
              <Route path="/admin/transaction-logs" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['admin']) ? <TransactionLogsPage /> : <Navigate to={homeRoute} replace />} />
              <Route path="/admin/listings" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['admin']) ? <AdminListingsPage /> : <Navigate to={homeRoute} replace />} />
              <Route path="/admin/orders" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['admin']) ? <AdminOrdersPage /> : <Navigate to={homeRoute} replace />} />
              <Route path="/logs" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['admin']) ? <LogsPage /> : <Navigate to={homeRoute} replace />} />

              <Route path="/brgy/dashboard" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['brgy_official']) ? <BrgyDashboard /> : <Navigate to={homeRoute} replace />} />
              <Route path="/brgy/listings" element={!isLoggedIn ? <Navigate to="/login" replace /> : hasRole(['brgy_official']) ? <BrgyListingsPage /> : <Navigate to={homeRoute} replace />} />
            </Routes>
        </main>

        {!showSidebar && !isMessagesRoute && (
          <footer className="bg-green-800 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
                <div>
                  <div className="flex items-center justify-center md:justify-start mb-4">
                    <img src="/src/assets/logo/AgriLinkWHITE.png" alt="AgriLink Logo" className="w-24 h-24 object-contain" />
                  </div>
                  <p className="text-green-100">Connecting farmers and communities for fresh, sustainable produce.</p>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-4">Quick Links</h4>
                  <ul className="space-y-2 text-green-100">
                    <li>
                      <button onClick={() => navigate('/about')} className="hover:text-white transition-colors cursor-pointer">About Us</button>
                    </li>
                    <li>
                      <button onClick={() => navigate('/legal#terms')} className="hover:text-white transition-colors cursor-pointer">
                        Terms & Agreement
                      </button>
                    </li>
                    <li>
                      <button onClick={() => navigate('/legal#privacy')} className="hover:text-white transition-colors cursor-pointer">
                        Privacy Policy
                      </button>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-4">Contact</h4>
                  <p className="text-green-100">Email: support@agrilink.ph</p>
                  <p className="text-green-100">Phone: +63 123 456 7890</p>
                </div>
              </div>
              <div className="border-t border-green-600 mt-8 pt-8 text-center text-green-100">
                <p>© 2026 AgriLink. All rights reserved.</p>
              </div>
            </div>
          </footer>
        )}
      </div>

      <ScrollToTopButton />

      {userType.toLowerCase() === 'farmer' && (
        <>
          <AddProductModal
            isOpen={isAddProductModalOpen}
            onClose={() => setIsAddProductModalOpen(false)}
            onSuccess={() => {
              window.dispatchEvent(new CustomEvent('product-added'));
            }}
          />
          <EditProductModal
            isOpen={isEditProductModalOpen}
            productId={editingProduct?.p_id?.toString()}
            initialProduct={editingProduct}
            onClose={() => {
              setIsEditProductModalOpen(false);
              setEditingProduct(null);
            }}
            onSuccess={() => {
              window.dispatchEvent(new CustomEvent('product-updated'));
            }}
          />
        </>
      )}
    </div>
  );
};

const ScrollToTopButton: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!show) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-10 right-10 z-[100] bg-[#5ba409] text-white p-4 rounded-2xl shadow-2xl hover:bg-black hover:-translate-y-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 active:scale-95 group"
    >
      <ArrowUp className="w-6 h-6 group-hover:animate-bounce" />
    </button>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <NotificationProvider>
        <MessagingProvider>
          <AppContent />
        </MessagingProvider>
      </NotificationProvider>
    </Router>
  );
};

export default App;

