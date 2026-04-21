import React, { useEffect, useState } from 'react';
import { AlertCircle, BarChart3, Leaf, RefreshCcw, ShieldCheck, Thermometer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../../api/apiConfig';
import agriFarmImage from '../../../assets/agriculture-farm-land-countryside-aerial-view-green-5120x2880-3985.jpg';
import lettuceImage from '../../../assets/lettuce.jpg';

const gradeStyle = (grade: string) => {
  const g = String(grade || '').toUpperCase();
  if (g === 'A') return 'bg-green-50 text-green-700 border-green-200';
  if (g === 'B') return 'bg-green-100 text-green-800 border-green-300';
  if (g === 'C') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
};

const FarmerPhenotypingPageV2: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const userId = localStorage.getItem('agrilink_id');

  const fetchResults = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem('agrilink_token');
      const res = await fetch(`${API_BASE_URL}/phenotyping/farmer/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load analysis results.');
      setResults(data.results || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [userId]);

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="relative overflow-hidden bg-[#0d1a07] rounded-3xl p-8 md:p-10 text-white mb-8 shadow-2xl border border-white/10 group">
          <img src={agriFarmImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 transition-transform duration-[10s] group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d1a07] via-[#0d1a07]/60 to-transparent" />
          <div className="relative z-10 py-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.25em] text-green-50/90 font-black">Quality Intelligence</p>
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tighter drop-shadow-2xl">
              Crop <span className="text-[#d4ff8a]">Analysis</span>
            </h1>
            <p className="text-green-50/80 mt-4 max-w-xl text-sm md:text-base font-medium leading-relaxed">
              Review automated phenotyping insights to improve product quality, verify health standards, and build buyer trust.
            </p>
          </div>
        </div>

        <div className="mb-5 flex justify-end">
          <button
            onClick={fetchResults}
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500">Loading analysis results...</div>
        ) : results.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500">
            No crop analysis data yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((res) => (
              <div key={res.res_id} className="group bg-white border border-gray-100 rounded-[2.5rem] p-7 hover:shadow-2xl hover:shadow-black/5 hover:border-[#5ba409]/30 transition-all duration-300">
                <div className="flex items-start justify-between gap-3 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#F9FBE7] border border-[#E1EEB4] flex items-center justify-center shrink-0 group-hover:bg-[#5ba409] group-hover:border-[#5ba409] transition-all duration-500 shadow-inner">
                      <Leaf className="w-7 h-7 text-[#5ba409] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight group-hover:text-[#4d8f08] transition-colors uppercase italic">{res.p_name}</h3>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Scanned {new Date(res.scanned_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-widest shadow-sm ${gradeStyle(res.quality_grade)}`}>
                    Grade {res.quality_grade || 'N/A'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Health', value: `${res.health_score ?? 'N/A'}%`, icon: ShieldCheck, color: 'text-emerald-700' },
                    { label: 'Color', value: res.color_analysis || 'N/A', icon: Thermometer, color: 'text-amber-700' },
                    { label: 'Consistency', value: res.size_analysis || 'N/A', icon: BarChart3, color: 'text-blue-700' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center group-hover:bg-white group-hover:border-[#5ba409]/20 transition-colors">
                      <stat.icon className={`w-4 h-4 mx-auto mb-2 ${stat.color}`} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{stat.label}</p>
                      <p className="text-base font-black text-gray-900 tracking-tight">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-[#F9FBE7] border border-[#E1EEB4]/50 rounded-2xl p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:rotate-12 transition-transform">
                    <ShieldCheck size={40} className="text-[#5ba409]" />
                  </div>
                  <p className="text-[10px] font-black text-[#5ba409] uppercase tracking-[0.2em] mb-2">Automated Insight</p>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium relative z-10">{res.result_summary || 'No summary available.'}</p>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 flex justify-end">
                  <button
                    onClick={() => navigate('/farmer/listings')}
                    className="px-6 py-2.5 rounded-xl border border-gray-200 hover:border-[#5ba409]/30 hover:text-[#5ba409] text-xs font-black uppercase tracking-widest transition-all hover:-translate-y-1 active:scale-95"
                  >
                    Manage Harvest
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmerPhenotypingPageV2;
