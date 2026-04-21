import React, { useState } from 'react';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Eye, 
  Search,
  ShieldCheck,
  MapPin,
  Filter,
  BarChart3,
  FileText,
  Clock,
  LayoutDashboard,
  ArrowRight
} from 'lucide-react';
import DashboardCard from '../../ui/DashboardCard';

const LGUDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState('overview');
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F1F8E9] via-white to-[#E8F5E9] p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 text-[#5ba409] font-black text-xs mb-3 uppercase tracking-widest bg-green-100/50 w-fit px-3 py-1.5 rounded-full border border-green-200">
            <LayoutDashboard className="w-4 h-4" />
            LGU Authorized Representative
          </div>
          <h1 className="text-5xl font-black text-gray-900 mb-2 tracking-tight">Regional Oversight</h1>
          <p className="text-lg text-gray-500 font-medium">Monitoring community trust and platform-wide agricultural growth</p>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <DashboardCard
            icon={ShieldCheck}
            title="Active Badges"
            value="342"
            subtitle="Barangay-certified listings"
            color="#5ba409"
            trend="Trust score: High"
          />
          <DashboardCard
            icon={ShoppingCart}
            title="Total Trade Volume"
            value="₱1.2M"
            subtitle="Platform-wide trade"
            color="#4CAF50"
            trend="+12% this month"
          />
          <DashboardCard
            icon={Users}
            title="Total Participants"
            value="892"
            subtitle="Verified community members"
            color="#1976D2"
            trend="Active participation"
          />
        </div>

        <div className="grid lg:grid-cols-12 gap-10">
          {/* Main List Area: Community Trust Analytics */}
          <div className="lg:col-span-8 space-y-10">
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-green-900/5 border border-green-50/50 overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                   <h2 className="text-2xl font-black text-gray-900 tracking-tight">Barangay Trust Performance</h2>
                   <p className="text-gray-500 text-sm font-medium italic">Monitoring badge issuance and community reliability</p>
                </div>
                <div className="flex items-center gap-3">
                   <button className="p-2.5 bg-gray-50 hover:bg-white border border-gray-100 rounded-xl transition-all shadow-sm">
                     <Filter className="w-4 h-4 text-gray-600" />
                   </button>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {[
                  { name: 'San Jose', badges: '124', reliability: '98%', status: 'Optimal' },
                  { name: 'Sto. Tomas', badges: '89', reliability: '95%', status: 'Stable' },
                  { name: 'Sta. Maria', badges: '67', reliability: '92%', status: 'Review Needed' },
                ].map((brgy, idx) => (
                  <div key={idx} className="p-8 hover:bg-green-50/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                    <div className="flex items-start gap-5">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-gray-50 flex items-center justify-center text-[#5ba409] group-hover:bg-[#5ba409] group-hover:text-white transition-all shadow-lg shadow-gray-100">
                        <MapPin className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-black text-gray-900 group-hover:text-[#5ba409] transition-colors">Brgy. {brgy.name}</h3>
                          <span className={`${
                            brgy.status === 'Optimal' ? 'bg-green-100 text-green-600' :
                            brgy.status === 'Stable' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                          } text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter`}>
                            {brgy.status}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-gray-400 space-x-3">
                          <span>Issued Badges: <span className="text-gray-700">{brgy.badges}</span></span>
                          <span className="text-gray-200">•</span>
                          <span>Trust Reliability: <span className="text-gray-700">{brgy.reliability}</span></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-xl hover:-translate-y-1 active:scale-95">
                        <BarChart3 className="w-4 h-4" /> View Analytics
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-green-900/5 border border-green-50/50 p-10">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                    <FileText className="w-7 h-7 text-[#5ba409]" />
                    Regional Reports
                  </h2>
                  <p className="text-gray-500 text-sm font-medium">Monthly agricultural output and trust metrics</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { type: 'Monthly Report', subject: 'Q1 Harvest Analysis', date: 'March 1, 2026', size: '2.4 MB' },
                  { type: 'Trust Audit', subject: 'Community Badge Review', date: 'Feb 15, 2026', size: '1.1 MB' },
                ].map((item, i) => (
                  <div key={i} className="p-8 rounded-3xl border-2 border-gray-50 bg-gray-50/20 transition-all hover:scale-[1.02]">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border bg-white text-gray-400 border-gray-100">{item.type}</span>
                    </div>
                    <h4 className="text-lg font-black text-gray-900 mb-2 leading-tight">{item.subject}</h4>
                    <p className="text-xs font-bold text-gray-400 mb-6 uppercase tracking-wider">{item.date} • {item.size}</p>
                    <button className="w-full py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm">
                      Download Report
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Logs & Quick Actions */}
          <div className="lg:col-span-4 space-y-10">
            {/* LGU Logs */}
            <div className="bg-[#1B5E20] rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
              <h3 className="text-xl font-black mb-8 flex items-center gap-2 relative z-10">
                <FileText className="w-5 h-5 text-green-300" />
                Regional Activity Log
              </h3>
              <div className="space-y-8 relative z-10">
                {[
                  { admin: 'Brgy_San_Jose', action: 'awarded 5 trust badges', time: '10m ago' },
                  { admin: 'LGU_Officer', action: 'generated monthly report', time: '1h ago' },
                  { admin: 'Brgy_Sta_Maria', action: 'verified 3 new farmers', time: '3h ago' },
                ].map((log, i) => (
                  <div key={i} className="flex gap-5 group">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400 group-first:animate-ping shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                      <div className="w-[1px] h-full bg-white/10 mt-2"></div>
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{log.admin}</p>
                      <p className="text-xs font-medium text-green-100/60 leading-relaxed">{log.action}</p>
                      <p className="text-[10px] text-green-400/80 font-black mt-2 uppercase tracking-widest">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-4 bg-white/10 hover:bg-white text-white hover:text-[#1B5E20] rounded-[1.25rem] text-xs font-black transition-all border border-white/10 relative z-10 uppercase tracking-widest">
                Full Audit Trail
              </button>
              <div className="absolute right-[-40px] bottom-[-40px] opacity-10 rotate-12">
                 <FileText className="w-64 h-64" />
              </div>
            </div>

            {/* Performance KPIs - Removed */}
            {/* Coordination Hub - Removed */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LGUDashboard;
