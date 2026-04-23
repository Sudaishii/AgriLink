import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Activity,
  ChevronRight, 
  ShieldCheck, 
  Clock 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardCard from '../../ui/DashboardCard';
import { API_BASE_URL, getStoredAuthToken } from '../../../api/apiConfig';
import { format } from 'date-fns';

interface AdminStats {
  revenue: number;
  orders: number;
  users: number;
  active: number;
  distribution: Array<{ type: string; count: number }>;
}

interface ActivityLog {
  id: number;
  actor: string;
  farmer: string;
  type: string;
  amount: number;
  product: string;
  time: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch(`${API_BASE_URL}/users/admin/stats`, {
            headers: { 'Authorization': `Bearer ${getStoredAuthToken()}` }
          }),
          fetch(`${API_BASE_URL}/users/admin/activity`, {
            headers: { 'Authorization': `Bearer ${getStoredAuthToken()}` }
          })
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (activityRes.ok) setActivity(await activityRes.json());
      } catch (err) {
        console.error('Failed to sync dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const farmerCount = stats?.distribution.find(d => d.type.toLowerCase() === 'farmer')?.count || 0;
  const buyerCount = stats?.distribution.find(d => d.type.toLowerCase() === 'buyer')?.count || 0;
  const totalCount = stats?.users || 1;
  const farmerPercent = (farmerCount / totalCount) * 100;
  const buyerPercent = (buyerCount / totalCount) * 100;
  const platformEarnings = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(stats?.revenue || 0);

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      {/* 🏙️ Clean SaaS Header */}
      <div className="bg-white border-b border-gray-100 py-8 lg:py-10">
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center text-[#5ba409]">
                <ShieldCheck size={12} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5ba409]">Management Dashboard</span>
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
              Admin Overview<span className="text-[#5ba409]">.</span>
            </h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Monitor Sales, Users, and Activity</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <DashboardCard
            icon={TrendingUp}
            title="Market Sales"
            value={isLoading ? '...' : `₱${platformEarnings}`}
            subtitle="Platform Earnings"
            color="#5ba409"
            trend="Active Revenue"
          />
          <DashboardCard
            icon={ShoppingCart}
            title="Total Orders"
            value={isLoading ? '...' : (stats?.orders || 0).toLocaleString()}
            subtitle="Fulfillment"
            color="#2196F3"
            trend="Logistics Flow"
          />
          <DashboardCard
            icon={Users}
            title="Platform Users"
            value={isLoading ? '...' : (stats?.users || 0).toLocaleString()}
            subtitle="Verified Community"
            color="#FF9800"
            trend="Growth Hub"
          />
          <DashboardCard
            icon={ShieldCheck}
            title="System Status"
            value="Online"
            subtitle="Infrastructure"
            color="#7C3AED"
            trend="Monitored Live"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Recent Ledger */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Transaction History</h3>
                  <p className="text-xl font-black text-gray-900 tracking-tight mt-1">Recent Activity</p>
                </div>
                <button onClick={() => navigate('/admin/transaction-logs')} className="text-[10px] font-black text-[#5ba409] uppercase tracking-widest hover:underline">
                  View Transaction Logs
                </button>
              </div>
              
              <div className="divide-y divide-gray-50 min-h-[300px]">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 opacity-20">
                    <Activity className="animate-pulse mb-3" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-center">Syncing Ledger...</p>
                  </div>
                ) : activity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                    <Clock className="mb-3" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-center">Waiting for Activity...</p>
                  </div>
                ) : (
                  activity.map((log) => (
                    <div key={log.id} className="px-8 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-gray-50 text-gray-400 border border-gray-100 flex items-center justify-center`}>
                          <TrendingUp size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-black text-gray-900">{log.actor}</p>
                            <ChevronRight size={10} className="text-gray-300" />
                            <p className="text-[11px] font-bold text-gray-500">{log.farmer}</p>
                          </div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{log.product}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-black text-gray-900">₱{log.amount.toLocaleString()}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 tracking-widest">
                          {format(new Date(log.time), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Access Sidebar */}
          <div className="space-y-8">
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 relative overflow-hidden">
              <div className="relative z-10 w-full">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Platform Users</h4>
                <p className="text-2xl font-black mt-1 text-gray-900">Network Hub</p>
                
                <div className="mt-8 space-y-6">
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                      <span>Farmers</span>
                      <span>{isLoading ? '...' : farmerCount.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#5ba409] transition-all duration-1000" style={{ width: `${farmerPercent}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                      <span>Buyers</span>
                      <span>{isLoading ? '...' : buyerCount.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${buyerPercent}%` }} />
                    </div>
                  </div>
                </div>
                <button onClick={() => navigate('/admin/users')} className="w-full mt-10 py-3.5 bg-[#5ba409] hover:bg-green-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-green-900/10">
                  Manage Directory
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;



