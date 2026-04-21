import React, { useState } from 'react';
import {
  Bell,
  MessageSquare,
  Settings,
  Trash2,
  TrendingUp,
  Inbox,
  CheckCheck,
  MoreVertical,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';

interface NotificationsPageProps {
  userType?: string;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ userType = 'buyer' }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'mentions'>('all');

  const displayNotifications = activeTab === 'all'
    ? notifications
    : activeTab === 'unread'
      ? notifications.filter(n => n.status === 'unread')
      : notifications.filter(n => n.type === 'message');

  const getIcon = (type: string) => {
    switch (type) {
      case 'order': return <TrendingUp size={18} />;
      case 'message': return <MessageSquare size={18} />;
      case 'system': return <Settings size={18} />;
      default: return <Bell size={18} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'order': return 'text-amber-600 bg-amber-50';
      case 'message': return 'text-blue-600 bg-blue-50';
      case 'system': return 'text-purple-600 bg-purple-50';
      default: return 'text-[#5ba409] bg-green-50';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">

      {/* 🏙️ Clean SaaS Header */}
      <div className="bg-white border-b border-gray-200 py-15">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Notifications</h1>
            <p className="text-sm text-gray-500">You have {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''} from your community.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => markAllAsRead()}
              className="px-4 py-2 text-xs font-black uppercase tracking-widest text-[#5ba409] hover:bg-green-50 rounded-lg transition-all flex items-center gap-2"
            >
              <CheckCheck size={14} /> Mark All Read
            </button>
            <button
              onClick={() => clearAll()}
              className="px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex items-center gap-2 border border-gray-100"
            >
              <Trash2 size={14} /> Clear History
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-6 py-18 flex flex-col gap-8 flex-1">

        {/* Simple Tabs */}
        <div className="flex items-center gap-4 border-b border-gray-200">
          {[
            { id: 'all', label: 'All Activity', icon: Inbox },
            { id: 'unread', label: 'Unread Alerts', icon: Bell },
            { id: 'mentions', label: 'Direct Messages', icon: MessageSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-1 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id
                  ? 'text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.id === 'unread' && unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded-full">{unreadCount}</span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5ba409] rounded-full animate-in fade-in duration-500" />
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-auto">
          {displayNotifications.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {displayNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-8 flex items-start gap-8 hover:bg-gray-50/50 transition-colors group cursor-pointer relative ${notif.status === 'unread' ? 'bg-green-50/5' : ''}`}
                  onClick={() => notif.link && navigate(notif.link)}
                >
                  {notif.status === 'unread' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#5ba409] rounded-r-full" />
                  )}
                  <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${getColor(notif.type)}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className={`text-base tracking-tight ${notif.status === 'unread' ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                        {notif.title}
                      </h3>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest tabular-nums">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed max-w-2xl ${notif.status === 'unread' ? 'text-gray-600' : 'text-gray-400'}`}>
                      {notif.message}
                    </p>
                    <div className="pt-3 flex items-center gap-6">
                      <button className="text-[10px] font-black text-[#5ba409] hover:underline uppercase tracking-widest flex items-center gap-1.5">
                        View Record <ArrowRight size={10} />
                      </button>
                      {notif.status === 'unread' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                          className="text-[10px] font-black text-gray-300 hover:text-gray-900 uppercase tracking-widest transition-colors"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                  <button className="p-2 text-gray-200 hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100">
                    <MoreVertical size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-32 text-center bg-gray-50/20">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-gray-100 mx-auto mb-6 border border-gray-100 shadow-sm">
                <Inbox size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Clean Slate</h3>
              <p className="text-sm text-gray-400 font-medium">You've successfully addressed all pending community alerts.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default NotificationsPage;