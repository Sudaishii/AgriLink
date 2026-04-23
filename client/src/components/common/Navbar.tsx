import { ShoppingCart, Menu, X, LogOut, User as UserIcon, MessageSquare, Bell, CheckCheck, ShoppingBag, Package, Tractor, Send, Map } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { NavbarProps } from '../../types';
import { useState, useRef, useEffect } from 'react';
import LogoutConfirmationModal from '../ui/LogoutConfirmationModal';
import { useMessaging } from '../../contexts/MessagingContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { getFullImageUrl } from '../../api/apiConfig';
import { normalizeNotificationLink } from '../../utils/notificationLinks';
import { getCartCount, syncCartFromServer } from '../../services/cartService';

const normalizePreviewText = (value: string) => {
  let raw = String(value || '').trim();
  if (!raw) return '';
  raw = raw.replace(/\[\[product:.*?:(.*?)(?::.*?)?\]\]/g, '[$1]');
  const lowered = raw.toLowerCase();
  if (lowered.includes('[[image]]')) return 'Sent an image';
  if (lowered.includes('blob:')) return 'Sent an image';
  return raw;
};

const Navbar: React.FC<NavbarProps> = ({ userType, firstName, lastName, profileImage, isLoggedIn, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount: unreadNotifCount, markAsRead: markNotifRead, markAllAsRead: markAllNotifsRead } = useNotifications();
  const { conversations, unreadTotal: unreadMsgCount, isUserOnline, markRead, markAllRead } = useMessaging();
  const [cartCount, setCartCount] = useState(0);
  const homeRoute = isLoggedIn
    ? (userType.toLowerCase() === 'farmer'
      ? '/farmer/dashboard'
      : userType.toLowerCase() === 'admin'
        ? '/admin/dashboard'
        : userType.toLowerCase() === 'brgy_official'
          ? '/brgy/dashboard'
          : '/buyer/marketplace')
    : '/';

  useEffect(() => {
    const updateCount = async () => {
      const hasSession =
        isLoggedIn ||
        localStorage.getItem('agrilink_isLoggedIn') === 'true' ||
        Boolean(localStorage.getItem('agrilink_token'));
      if (!hasSession) {
        setCartCount(0);
        return;
      }
      await syncCartFromServer();
      setCartCount(getCartCount());
    };
    void updateCount();
    const onCartUpdated = () => void updateCount();
    window.addEventListener('cart-updated', onCartUpdated);
    return () => window.removeEventListener('cart-updated', onCartUpdated);
  }, [isLoggedIn]);

  const normalizedUserType = userType.toLowerCase();
  const isFarmer = normalizedUserType === 'farmer';
  const isBuyer = normalizedUserType === 'buyer';
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Profile';
  const previewNotifications = notifications.slice(0, 4);
  const previewConversations = conversations
    .filter((c) => Number(c.unreadCount || 0) > 0 || String(c.lastMessage || '').trim().length > 0)
    .slice(0, 4);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (msgRef.current && !msgRef.current.contains(e.target as Node)) setMsgOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotifIcon = (type: string, isFarmerRole: boolean) => {
    if (type === 'message') return MessageSquare;
    if (type === 'order' && isFarmerRole) return Tractor;
    if (type === 'order') return ShoppingBag;
    return Package;
  };

  const getNotifColor = (type: string, isFarmerRole: boolean) => {
    if (type === 'message') return 'bg-green-100 text-green-600';
    if (type === 'order' && isFarmerRole) return 'bg-amber-100 text-amber-600';
    if (type === 'order') return 'bg-blue-100 text-blue-600';
    return 'bg-purple-100 text-purple-600';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to={homeRoute} className="flex items-center">
            <img src="/src/assets/logo/AgriLinkGREEN.png" alt="AgriLink Logo" className="w-16 h-16 object-contain transform hover:scale-105 transition-all" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/buyer/marketplace" className="text-gray-700 hover:text-green-600 font-semibold transition-colors px-3 py-2 rounded-lg hover:bg-[#F9FBE7]">Marketplace</Link>
            <Link to="/about" className="text-gray-700 hover:text-[#5ba409] font-semibold transition-colors px-3 py-2 rounded-lg hover:bg-[#F9FBE7]">About</Link>

            <div className="flex items-center space-x-3">
              {((userType.toLowerCase() === 'buyer' || userType.toLowerCase() === 'farmer') || !isLoggedIn) && userType.toLowerCase() !== 'brgy_official' && (
                <Link to="/buyer/cart" className="relative p-2 hover:bg-[#F9FBE7] rounded-full transition-colors block">
                  <ShoppingCart className="w-6 h-6 text-[#5ba409]" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#5ba409] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                      {cartCount}
                    </span>
                  )}
                </Link>
              )}
              {isLoggedIn && isBuyer && (
                <Link to="/buyer/map" className="relative p-2 hover:bg-[#F9FBE7] rounded-full transition-colors block" title="View farmers map">
                  <Map className="w-6 h-6 text-[#5ba409]" />
                </Link>
              )}

              {isLoggedIn && userType.toLowerCase() !== 'brgy_official' && (
                <>
                  {/* 💬 Messages Dropdown */}
                  <div className="relative" ref={msgRef}>
                    <button
                      onClick={() => { setMsgOpen(!msgOpen); setNotifOpen(false); }}
                      className="relative p-2 hover:bg-[#F9FBE7] rounded-full transition-colors block"
                    >
                      <MessageSquare className={`w-6 h-6 text-[#5ba409] transition-transform duration-300 ${msgOpen ? '-rotate-6' : ''}`} />
                      {unreadMsgCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                          {unreadMsgCount}
                        </span>
                      )}
                    </button>

                    {/* Messages Dropdown Panel */}
                    {msgOpen && (
                      <div className="absolute right-0 top-full mt-4 w-96 bg-white rounded-3xl shadow-2xl shadow-gray-300/40 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 z-50">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                          <div>
                            <h3 className="text-base font-black text-gray-900">Messages</h3>
                            <p className="text-[10px] font-bold text-gray-400">{unreadMsgCount} unread conversation{unreadMsgCount !== 1 ? 's' : ''}</p>
                          </div>
                          <button
                            onClick={async () => {
                              await markAllRead();
                            }}
                            className="text-[10px] font-black text-green-600 flex items-center gap-1 hover:underline"
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                          </button>
                        </div>

                        {/* Conversation List */}
                        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                          {previewConversations.length === 0 && (
                            <div className="p-6 text-center text-xs font-semibold text-gray-400">
                              No conversations yet.
                            </div>
                          )}
                          {previewConversations.map(conv => (
                            <button
                              key={conv.id}
                              className={`w-full text-left p-4 hover:bg-gray-50/80 transition-all flex items-center gap-4 ${conv.unreadCount > 0 ? 'bg-green-50/20' : ''}`}
                              onClick={() => {
                                localStorage.setItem('agrilink_lastMessageContactId', String(conv.participantId));
                                markRead(Number(conv.participantId)).catch(() => null);
                                setMsgOpen(false);
                                navigate(`/messages?contactId=${conv.participantId}`);
                              }}
                            >
                              {/* Avatar */}
                              <div className={`relative shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm overflow-hidden ${conv.unreadCount > 0 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {conv.participantImage && (conv.participantImage.length > 2 || conv.participantImage.includes('/')) ? (
                                  <img src={getFullImageUrl(conv.participantImage)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  conv.participantImage
                                )}
                                {isUserOnline(conv.participantId) && (
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <p className={`text-sm font-black tracking-tight ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {conv.participantName}
                                  </p>
                                  <span className="text-[9px] font-black text-gray-400 uppercase shrink-0">{conv.lastMessageTime}</span>
                                </div>
                                <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-700 font-bold' : 'text-gray-400 font-medium'}`}>
                                  {normalizePreviewText(conv.lastMessage)}
                                </p>
                              </div>

                              {conv.unreadCount > 0 && (
                                <div className="w-5 h-5 bg-green-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shrink-0 shadow-md shadow-green-500/30">
                                  {conv.unreadCount}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Quick Reply Input */}
                        <div className="p-4 border-t border-gray-50 bg-gray-50/30">
                          <button
                            onClick={() => { setMsgOpen(false); navigate('/messages'); }}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                          >
                            <Send className="w-4 h-4" /> Open Messenger
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 🔔 Notification Bell Dropdown */}
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={() => { setNotifOpen(!notifOpen); setMsgOpen(false); }}
                      className="relative p-2 hover:bg-[#F9FBE7] rounded-full transition-colors block"
                    >
                      <Bell className={`w-6 h-6 text-[#5ba409] transition-transform duration-300 ${notifOpen ? 'rotate-12' : ''}`} />
                      {unreadNotifCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                          {unreadNotifCount}
                        </span>
                      )}
                    </button>

                    {notifOpen && (
                      <div className="absolute right-0 top-full mt-4 w-96 bg-white rounded-3xl shadow-2xl shadow-gray-300/40 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 z-50">
                        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-gray-900">Notifications</h3>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${isFarmer ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {isFarmer ? 'Farmer' : 'Buyer'}
                              </span>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400">{unreadNotifCount} unread alert{unreadNotifCount !== 1 ? 's' : ''}</p>
                          </div>
                          <button
                            onClick={() => markAllNotifsRead()}
                            className="text-[10px] font-black text-green-600 flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                          </button>
                        </div>

                        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                          {previewNotifications.map(notif => {
                            const IconComp = getNotifIcon(notif.type, isFarmer);
                            const colorClass = getNotifColor(notif.type, isFarmer);
                            return (
                              <button
                                key={notif.id}
                                className={`w-full text-left p-5 hover:bg-gray-50/80 transition-all flex items-start gap-4 ${notif.status === 'unread' ? 'bg-green-50/20' : ''}`}
                                onClick={async () => {
                                  setNotifOpen(false);
                                  if (notif.status === 'unread') {
                                    await markNotifRead(notif.id);
                                  }
                                  const target = normalizeNotificationLink(notif.link);
                                  if (target) navigate(target);
                                }}
                              >
                                <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ${colorClass}`}>
                                  <IconComp className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className={`text-sm font-black tracking-tight ${notif.status === 'unread' ? 'text-gray-900' : 'text-gray-500'}`}>{notif.title}</p>
                                    <span className="text-[9px] font-black text-gray-400 uppercase shrink-0">{notif.timestamp}</span>
                                  </div>
                                  <p className="text-xs text-gray-400 font-medium leading-snug line-clamp-2">{notif.message}</p>
                                </div>
                                {notif.status === 'unread' && <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-2" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="p-4 border-t border-gray-50 bg-gray-50/30">
                          <button
                            onClick={() => { setNotifOpen(false); navigate('/notifications'); }}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-green-500/20"
                          >
                            View All Notifications
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {!isLoggedIn ? (
                <>
                  <button onClick={() => navigate('/login')} className="bg-[#5ba409] border-2 border-[#5ba409] text-white hover:bg-white hover:text-[#5ba409] px-4 py-2 rounded-full font-semibold transition-colors">Login</button>
                  <button onClick={() => navigate('/register')} className="border-2 border-[#5ba409] text-[#5ba409] hover:bg-[#5ba409] hover:text-white px-4 py-2 rounded-full font-semibold transition-colors">Register</button>
                </>
              ) : (
                <div className="flex items-center gap-6 ml-4 pl-6 border-l border-gray-100">
                  <Link to="/profile" className="group flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center border border-green-100 group-hover:bg-[#5ba409] group-hover:text-white transition-all shadow-sm overflow-hidden">
                      {profileImage ? (
                        <img src={getFullImageUrl(profileImage)} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon size={18} className="transition-colors" />
                      )}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Verified</p>
                      <p className="text-sm font-bold text-gray-900 group-hover:text-[#5ba409] transition-colors leading-none">
                        {displayName}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Terminate Session"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 rounded-lg hover:bg-[#F9FBE7]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2 animate-fadeIn">
            <Link to="/buyer/marketplace" onClick={() => setMobileMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-lg hover:bg-[#F9FBE7] font-semibold block">Marketplace</Link>
            <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-lg hover:bg-[#F9FBE7] font-semibold block">About</Link>

            {isLoggedIn && userType.toLowerCase() !== 'brgy_official' && (
              <>
                <Link to="/messages" onClick={() => setMobileMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-lg hover:bg-[#F9FBE7] font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-3"><MessageSquare className="w-5 h-5 text-green-600" /> Messages</span>
                  {unreadMsgCount > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{unreadMsgCount}</span>}
                </Link>
                <Link to="/notifications" onClick={() => setMobileMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-lg hover:bg-[#F9FBE7] font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-green-600" />
                    {isFarmer ? 'Farmer Alerts' : 'My Notifications'}
                  </span>
                  {unreadNotifCount > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{unreadNotifCount}</span>}
                </Link>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-lg hover:bg-[#F9FBE7] font-semibold flex items-center gap-3">
                  <UserIcon className="w-5 h-5 text-green-600" /> Profile
                </Link>
              </>
            )}
            {isLoggedIn && userType.toLowerCase() === 'brgy_official' && (
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-lg hover:bg-[#F9FBE7] font-semibold flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-green-600" /> Profile
              </Link>
            )}
            {!isLoggedIn ? (
              <>
                <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="w-full bg-[#4CAF50] border-2 border-[#4CAF50] hover:bg-[#45A049] text-white px-4 py-3 rounded-lg font-semibold">Login</button>
                <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} className="w-full border-2 border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50] hover:text-white px-4 py-3 rounded-lg font-semibold">Register</button>
              </>
            ) : (
              <button onClick={() => { setIsLogoutModalOpen(true); setMobileMenuOpen(false); }} className="w-full bg-red-50 text-red-500 border-2 border-red-500 py-3 rounded-lg font-bold flex items-center justify-center space-x-2">
                <LogOut className="w-5 h-5" /><span>Logout</span>
              </button>
            )}
          </div>
        )}
      </div>

      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          onLogout();
          setIsLogoutModalOpen(false);
          navigate('/');
        }}
      />
    </nav>
  );
};

export default Navbar;
