import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  User,
  FileText,
  Store,
  Map,
  MessageSquare,
  Bell,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import type { SidebarProps } from '../../types';
import LogoutConfirmationModal from '../ui/LogoutConfirmationModal';
import { getFullImageUrl } from '../../api/apiConfig';
import { useMessaging } from '../../contexts/MessagingContext';
import { useNotifications } from '../../contexts/NotificationContext';

// ─── Nav config ─────────────────────────────────────────────────────────────

const farmerNav = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/farmer/dashboard' },
  { label: 'Marketplace', icon: Store, to: '/buyer/marketplace' },
  { label: 'My Listings', icon: Package, to: '/farmer/listings' },
  { label: 'Orders', icon: ShoppingBag, to: '/farmer/orders' },
  { label: 'My Cart', icon: ShoppingCart, to: '/buyer/cart' },
  { label: 'Maps', icon: Map, to: '/buyer/map' },
  { label: 'Messages', icon: MessageSquare, to: '/messages' },
  { label: 'Notifications', icon: Bell, to: '/notifications' },
  { label: 'Profile', icon: User, to: '/profile' },
];

const buyerNav = [
  { label: 'Marketplace', icon: Store, to: '/buyer/marketplace' },
  { label: 'My Cart', icon: ShoppingCart, to: '/buyer/cart' },
  { label: 'Maps', icon: Map, to: '/buyer/map' },
  { label: 'Messages', icon: MessageSquare, to: '/messages' },
  { label: 'Notifications', icon: Bell, to: '/notifications' },
  { label: 'Profile', icon: User, to: '/profile' },
];

const adminNav = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin/dashboard' },
  { label: 'Marketplace', icon: Store, to: '/buyer/marketplace' },
  { label: 'User Management', icon: Users, to: '/admin/users' },
  { label: 'Transaction Logs', icon: ShoppingCart, to: '/admin/transaction-logs' },
  { label: 'System Logs', icon: FileText, to: '/logs' },
  { label: 'Profile', icon: User, to: '/profile' },
];

const brgyNav = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/brgy/dashboard' },
  { label: 'Marketplace', icon: Store, to: '/buyer/marketplace' },
  { label: 'Farmer Certification', icon: ShieldCheck, to: '/brgy/listings' },
  { label: 'Profile', icon: User, to: '/profile' },
];



// ─── Component ───────────────────────────────────────────────────────────────

const Sidebar: React.FC<SidebarProps> = ({ userType, firstName, lastName, profileImage, collapsed, setCollapsed, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const { unreadTotal: unreadMessageCount } = useMessaging();
  const { unreadCount: unreadNotificationCount } = useNotifications();

  const isFarmer = userType.toLowerCase() === 'farmer';
  const isAdmin = userType.toLowerCase() === 'admin';
  const isBrgy = userType.toLowerCase() === 'brgy_official';

  let navItems = buyerNav;
  if (isFarmer) navItems = farmerNav;
  if (isAdmin) navItems = adminNav;
  if (isBrgy) navItems = brgyNav;

  useEffect(() => {
    const updateCartCount = () => {
      try {
        const raw = localStorage.getItem('agrilink_cart');
        if (!raw) {
          setCartCount(0);
          return;
        }
        const items = JSON.parse(raw) as Array<{ quantity?: number }>;
        const count = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
        setCartCount(count);
      } catch {
        setCartCount(0);
      }
    };
    updateCartCount();
    window.addEventListener('cart-updated', updateCartCount);
    return () => window.removeEventListener('cart-updated', updateCartCount);
  }, []);

  // ─── Badge Counts ────────────────────────────────────────────────────────
  const badgeMap: Record<string, number> = {
    '/messages': unreadMessageCount,
    '/notifications': unreadNotificationCount,
    '/buyer/cart': cartCount,
  };

  const getRoleLabel = () => {
    if (isFarmer) return 'Farmer';
    if (isBrgy) return 'Brgy Official';
    if (isAdmin) return 'Admin';
    return 'Buyer';
  };

  const getRoleColor = () => {
    if (isFarmer) return '#5ba409';
    if (isBrgy) return '#1B5E20';
    if (isAdmin) return '#7C3AED';
    return '#2563EB'; // Blue for Buyer
  };

  const getRoleBg = () => {
    if (isFarmer) return 'bg-green-100 text-green-800';
    if (isBrgy) return 'bg-emerald-100 text-emerald-800';
    if (isAdmin) return 'bg-purple-100 text-purple-800';
    return 'bg-blue-100 text-blue-800';
  };

  const roleLabel = getRoleLabel();
  const roleColor = getRoleColor();
  const roleBg = getRoleBg();
  const homeRoute = isFarmer
    ? '/farmer/dashboard'
    : isBrgy
      ? '/brgy/dashboard'
      : isAdmin
        ? '/admin/dashboard'
        : '/buyer/marketplace';
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Profile not set';
  const displayInitials =
    [firstName?.[0], lastName?.[0]].filter(Boolean).join('') ||
    firstName?.[0] ||
    roleLabel[0] ||
    '?';

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    onLogout();
    navigate('/');
  };

  // ─── Sidebar content (shared between desktop & mobile) ────────────────────
  const SidebarContent = (
    <div className="flex flex-col h-full">

      {/* Logo — centered in both states, larger when collapsed */}
      <div
        className="flex items-center justify-center px-4 py-5 border-b border-gray-100"
        style={{ minHeight: '80px' }}
      >
        <Link to={homeRoute} className="flex items-center gap-2 overflow-hidden">
          <img
            src="/src/assets/logo/AgriLinkGREEN.png"
            alt="AgriLink"
            className={`object-contain flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-12 h-12' : 'w-10 h-10'
              }`}
          />
          {!collapsed && (
            <>
              <span
                className="h-6 w-[3px] rounded-full"
                style={{ background: '#5ba409' }}
                aria-hidden="true"
              />
              <span className="text-xl font-black whitespace-nowrap" style={{ color: '#5ba409' }}>
                AgriLink
              </span>
            </>
          )}
        </Link>
      </div>

      {/* User info */}
      <div className={`px-4 py-4 border-b border-gray-100 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
            style={{ background: roleColor }}
            title={displayName}
          >
            {profileImage ? (
              <img src={getFullImageUrl(profileImage)} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              displayInitials
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
              style={{ background: roleColor }}
            >
              {profileImage ? (
                <img src={getFullImageUrl(profileImage)} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                displayInitials
              )}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-gray-900 text-sm truncate">
                {displayName}
              </p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBg}`}>
                {roleLabel}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
        {navItems.map(({ label, icon: Icon, to }) => {
          const active = location.pathname === to;
          const badge = badgeMap[to] ?? 0;

          return (
            <Link
              key={label}
              to={to}
              onClick={(e) => {
                if (label === 'Add Product') {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('open-add-product'));
                }
                setMobileOpen(false);
              }}
              title={collapsed ? label : undefined}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150
                ${active
                  ? 'text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                ${collapsed ? 'justify-center' : ''}
              `}
              style={active ? { background: roleColor } : {}}
            >
              {/* Icon with collapsed badge */}
              <span className="relative shrink-0">
                <Icon className="w-5 h-5" />
                {collapsed && badge > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-md animate-pulse">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>

              {/* Label + inline badge when expanded */}
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  {badge > 0 && (
                    <span className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1.5 shadow-md animate-pulse">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="mt-auto px-3 py-4 border-t border-gray-100 space-y-2 sticky bottom-0 bg-white z-10">
        <button
          onClick={handleLogoutClick}
          title={collapsed ? 'Logout' : undefined}
          className={`
            flex items-center gap-3 w-full px-3 py-2.5 rounded-xl font-semibold text-sm
            text-red-600 hover:bg-red-50 transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile hamburger button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center border border-gray-200"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* ── Mobile overlay + drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-72 bg-white shadow-2xl flex flex-col animate-slideInLeft">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside
        className={`
          hidden md:flex flex-col bg-white border-r border-gray-200 shadow-sm
          transition-all duration-300 ease-in-out flex-shrink-0 fixed top-0 left-0 h-screen z-40
          ${collapsed ? 'w-20' : 'w-64'}
        `}
      >
        {SidebarContent}

        {/* Floating collapse tab — right edge, vertically centred */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="
            hidden md:flex absolute -right-3 top-6
            w-6 h-10 bg-white border border-gray-200 shadow-md rounded-full
            items-center justify-center text-gray-400 hover:text-green-600
            hover:border-green-600 transition-colors z-10
          "
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
};

export default Sidebar;
