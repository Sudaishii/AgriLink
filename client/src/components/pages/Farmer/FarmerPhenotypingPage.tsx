import React, { useState, useEffect } from 'react';
import { Thermometer, Zap, AlertCircle, RefreshCcw, Package, ChevronRight, Activity, Award, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../../api/apiConfig';

const FarmerPhenotypingPage: React.FC = () => {
    const navigate = useNavigate();
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const userId = localStorage.getItem('agrilink_id');

    const fetchResults = async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const token = localStorage.getItem('agrilink_token');
            const res = await fetch(`${API_BASE_URL}/phenotyping/farmer/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setResults(data.results || []);
            else setError(data.message);
        } catch (err) {
            setError('Failed to load analysis results.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResults();
    }, [userId]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F9FBE7] to-white pb-20 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                    <div className="animate-fadeIn">
                        <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">Crop Analysis<span className="text-[#5ba409]">.</span></h1>
                        <p className="text-xl text-gray-400 font-medium italic">Automated phenotyping & quality results</p>
                    </div>
                    <button
                        onClick={fetchResults}
                        className="p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-[#5ba409] transition-all shadow-sm active:scale-90"
                    >
                        <RefreshCcw className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {error && (
                    <div className="mb-10 p-6 bg-red-50 border-2 border-red-100 rounded-3xl flex items-center gap-4 animate-shake">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        <p className="font-bold text-red-800">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="py-40 flex flex-col items-center gap-6">
                        <div className="relative">
                            <RefreshCcw className="w-16 h-16 text-[#5ba409] animate-spin" />
                            <Thermometer className="w-6 h-6 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <p className="font-black text-gray-300 uppercase tracking-[0.3em] text-sm italic">Analyzing harvests...</p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-100">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
                            <Thermometer className="w-12 h-12 text-gray-200" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-300 tracking-tighter italic">No analysis data yet</h3>
                        <p className="text-gray-400 mt-2 font-medium">Results will appear here after your crops are scanned.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-10">
                        {results.map((res) => (
                            <div key={res.res_id} className="bg-white rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-gray-50 p-10 group hover:border-[#5ba409]/30 transition-all">

                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-[#5ba409]/20 transition-all shadow-inner">
                                            {res.p_image ? (
                                                <img src={res.p_image} alt={res.p_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-8 h-8 text-gray-300 mx-auto mt-4" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 text-xl tracking-tighter mb-0.5">{res.p_name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scanned on {new Date(res.scanned_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg">
                                            Grade {res.quality_grade}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    <div className="bg-gray-50 rounded-3xl p-5 text-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Health</p>
                                        <p className="text-xl font-black text-[#5ba409]">{res.health_score}%</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-3xl p-5 text-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Color</p>
                                        <p className="text-xl font-black text-gray-900 italic">{res.color_analysis || 'N/A'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-3xl p-5 text-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Uniformity</p>
                                        <p className="text-xl font-black text-blue-600">{res.size_analysis || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="bg-[#5ba409]/5 rounded-[2rem] p-6 border border-[#5ba409]/10 relative overflow-hidden">
                                    <BarChart3 className="absolute -bottom-2 -right-2 w-20 h-20 text-[#5ba409] opacity-5" />
                                    <h4 className="text-xs font-black text-[#5ba409] uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Award className="w-4 h-4" /> Expert Summary
                                    </h4>
                                    <p className="text-sm font-medium text-gray-600 leading-relaxed italic">
                                        "{res.result_summary}"
                                    </p>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button
                                        onClick={() => navigate(`/farmer/listings`)}
                                        className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-all group"
                                    >
                                        Manage Crop <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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

export default FarmerPhenotypingPage;
