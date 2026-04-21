import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  ChevronRight,
  Package,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardCard from '../../ui/DashboardCard';
import { API_BASE_URL } from '../../../api/apiConfig';

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const BrgyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFarmers = async () => {
      const token = localStorage.getItem('agrilink_token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/badges/farmers-by-brgy`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setFarmers(Array.isArray(data.farmers) ? data.farmers : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchFarmers();
  }, []);

  const totalListings = farmers.reduce((sum, f) => sum + (f.active_listings || 0), 0);
  const badgesIssued = farmers.filter(f => f.badges && f.badges.length > 0).length;
  const totalFarmers = farmers.length;

  const recentVerifications = farmers
    .filter(f => f.badges && f.badges.length > 0)
    .flatMap(f => f.badges.map((b: any) => ({ ...b, farmerName: f.name })))
    .sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime())
    .slice(0, 5);

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
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5ba409]">Community Trust</span>
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
              Barangay Dashboard<span className="text-[#5ba409]">.</span>
            </h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
              Verify local harvests and farmers
            </p>
          </div>
          
          <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-100 shrink-0">
             <button 
              onClick={() => navigate('/brgy/listings')} 
              className="px-4 py-2 bg-white text-[#5ba409] shadow-sm rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 flex items-center gap-2"
             >
                <Award size={12} /> Award Trust Badge
             </button>
             <button 
              onClick={() => navigate('/brgy/listings')} 
              className="px-4 py-2 text-gray-400 hover:text-gray-900 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
             >
                View Farmers
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 py-10">
        {/* 📊 Status Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <DashboardCard
            icon={Package}
            title="Local Listings"
            value={loading ? '...' : totalListings.toString()}
            subtitle="Crops listed via locals"
            color="#5ba409"
            trend="Active"
          />
          <DashboardCard
            icon={ShieldCheck}
            title="Badges Issued"
            value={loading ? '...' : badgesIssued.toString()}
            subtitle="Verified listings"
            color="#2196F3"
            trend="Trust metrics"
          />
          <DashboardCard
            icon={Users}
            title="Registered Farmers"
            value={loading ? '...' : totalFarmers.toString()}
            subtitle="Community members"
            color="#FF9800"
            trend="Active participation"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Recent Activity</h3>
                  <p className="text-xl font-black text-gray-900 tracking-tight mt-1">Community Listings</p>
                </div>
                <button 
                  onClick={() => navigate('/brgy/listings')} 
                  className="text-[10px] font-black text-[#5ba409] uppercase tracking-widest hover:underline"
                >
                  View full list
                </button>
              </div>

              <div className="divide-y divide-gray-50">
                {loading ? (
                  <div className="px-8 py-10 text-center text-gray-400">Loading data...</div>
                ) : farmers.length === 0 ? (
                  <div className="px-8 py-10 text-center text-gray-400">No farmers found in your barangay yet.</div>
                ) : (
                  farmers.slice(0, 5).map((farmer, idx) => (
                    <div key={idx} className="px-8 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer" onClick={() => navigate('/brgy/listings')}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center border border-gray-100 shrink-0">
                          <Users size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                              <p className="text-[13px] font-black text-gray-900">{farmer.name}</p>
                              {farmer.badges && farmer.badges.length > 0 && (
                                  <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
                                      Verified
                                  </span>
                              )}
                          </div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{farmer.city || 'Minglanilla'} • {timeAgo(farmer.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                         <p className="text-[11px] font-black text-[#5ba409] bg-green-50 px-3 py-1 rounded-lg border border-gray-100">{farmer.active_listings} Listings</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Access Sidebar */}
          <div className="space-y-8">
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
               <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Recent Verifications</h4>
               
               <div className="space-y-4">
                 {loading ? (
                   <div className="p-4 text-center text-xs text-gray-400">Loading...</div>
                 ) : recentVerifications.length === 0 ? (
                   <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-100">No verifications yet</div>
                 ) : (
                   recentVerifications.map((v: any, i: number) => (
                     <div key={i} onClick={() => navigate('/brgy/listings')} className="flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-50 rounded-2xl border border-transparent transition-all cursor-pointer">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-xs font-black text-gray-500 shrink-0">
                           {v.farmerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                         </div>
                         <div>
                           <p className="text-[11px] font-black text-gray-900 line-clamp-1">{v.farmerName}</p>
                           <p className="text-[9px] text-[#5ba409] font-bold uppercase tracking-widest leading-tight mt-0.5">Verified • {timeAgo(v.issued_at)}</p>
                         </div>
                       </div>
                       <ChevronRight size={14} className="text-gray-300 shrink-0" />
                     </div>
                   ))
                 )}
               </div>

               <button 
                 onClick={() => navigate('/brgy/listings')}
                 className="w-full mt-6 py-3.5 bg-[#5ba409] hover:bg-green-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-green-900/10"
               >
                 Certify a Farmer
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrgyDashboard;
