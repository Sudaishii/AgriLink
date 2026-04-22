import React, { useEffect, useMemo, useState } from 'react';
import { 
  Users, 
  Leaf, 
  Sprout, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp,
  Heart,
  Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../api/apiConfig';

interface FarmerLite {
  id: number;
  farm_city?: string | null;
}

interface ProductLite {
  p_id?: number;
  p_price?: number | string;
  p_status?: string | null;
}

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const hasSession = localStorage.getItem('agrilink_isLoggedIn') === 'true' || !!localStorage.getItem('agrilink_token');
  const [farmers, setFarmers] = useState<FarmerLite[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadStats = async () => {
      try {
        const [farmersRes, productsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/users/farmers/all`),
          fetch(`${API_BASE_URL}/products`),
        ]);

        const farmersData = farmersRes.ok ? await farmersRes.json() : [];
        const productsData = productsRes.ok ? await productsRes.json() : [];

        if (!alive) return;
        setFarmers(Array.isArray(farmersData) ? farmersData : []);
        setProducts(Array.isArray(productsData?.products) ? productsData.products : Array.isArray(productsData) ? productsData : []);
      } catch {
        if (!alive) return;
        setFarmers([]);
        setProducts([]);
      } finally {
        if (alive) setLoadingStats(false);
      }
    };

    void loadStats();
    return () => {
      alive = false;
    };
  }, []);

  const values = [
    {
      icon: <Leaf className="w-6 h-6" />,
      title: "Sustainable Agriculture",
      description: "Promoting farming practices that nourish the soil and respect the environment for future generations."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Farmer Empowerment",
      description: "Eliminating unfair middleman fees to ensure farmers receive a fair price for their hard work."
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "Quality Assurance",
      description: "Rigorous verification systems to ensure every harvest that reaches your table is fresh and safe."
    }
  ];

  const milestones = useMemo(() => {
    const activeProducts = products.filter((p) => String(p.p_status || 'active').toLowerCase() !== 'archived');
    const uniqueCities = new Set(
      farmers
        .map((f) => (f.farm_city || '').trim().toLowerCase())
        .filter(Boolean)
    );
    const prices = activeProducts
      .map((p) => Number(p.p_price))
      .filter((v) => Number.isFinite(v) && v > 0);
    const avgPrice = prices.length ? prices.reduce((sum, v) => sum + v, 0) / prices.length : 0;

    return [
      { label: 'Partner Farmers', value: loadingStats ? '...' : farmers.length.toLocaleString() },
      { label: 'Active Listings', value: loadingStats ? '...' : activeProducts.length.toLocaleString() },
      { label: 'Covered Cities', value: loadingStats ? '...' : uniqueCities.size.toLocaleString() },
      { label: 'Avg Price', value: loadingStats ? '...' : `₱${avgPrice.toFixed(2)}` },
    ];
  }, [farmers, products, loadingStats]);

  return (
    <div className="min-h-screen bg-white overflow-hidden pb-12">
      {/* 🌿 Hero Section */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 bg-[#F8FAFC] overflow-hidden">
        {/* Artistic Background Flows */}
        <div className="absolute top-0 right-0 w-full lg:w-1/2 h-full pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-[#F8FAFC] via-[#F8FAFC]/50 to-transparent z-10" />
          <img 
            src="/about/farmers.webp" 
            alt="Farmers Background" 
            className="w-full h-full object-cover opacity-20 lg:opacity-100 transition-opacity duration-1000"
          />
        </div>
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-[#5ba409]/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
              <Sprout className="w-4 h-4 text-[#5ba409]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5ba409]">Our Mission</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.1] mb-8">
              Rooted in <span className="text-[#5ba409]">Community</span>, Growing for the Future.
            </h1>
            <p className="text-lg md:text-xl text-gray-500 font-medium leading-relaxed mb-10 max-w-2xl">
              AgriLink is more than a marketplace. We are a digital ecosystem dedicated to bridging the gap between local farmers and the families they feed.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-[#5ba409] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-green-500/20 hover:bg-[#4d8f08] hover:-translate-y-1 transition-all active:scale-95"
              >
                Join the Mission
              </button>
              <button 
                onClick={() => navigate('/buyer/marketplace')}
                className="px-8 py-4 bg-white text-[#5ba409] border border-[#5ba409]/35 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-sm hover:shadow-lg hover:bg-[#f2f9e6] hover:border-[#5ba409] transition-all active:scale-95"
              >
                Explore Harvest
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 📊 Impact Stats */}
      <section className="relative -mt-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-[2.5rem] p-10 md:p-16 shadow-2xl shadow-gray-200/50 border border-transparent grid grid-cols-2 md:grid-cols-4 gap-8">
            {milestones.map((item, idx) => (
              <div key={idx} className="text-center group">
                <p className="text-3xl md:text-5xl font-black text-gray-900 mb-2 tracking-tighter group-hover:text-[#5ba409] transition-colors uppercase">
                  {item.value}
                </p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 📖 Our Story Section */}
      <section className="py-24 md:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            <div className="flex-1 relative group/image">
              <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.12)] transform lg:-rotate-2 group-hover/image:rotate-0 transition-all duration-700 ease-out border-[8px] border-white">
                <div className="aspect-[3/4] bg-gray-50">
                  <img 
                    src="/about/farmers3.jpg" 
                    alt="AgriLink Community" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" 
                  />
                </div>
                {/* Overlay Detail */}
                <div className="absolute bottom-8 left-8 right-8 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-white/50 shadow-xl">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#5ba409] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                         <Heart className="w-6 h-6" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-[#5ba409] uppercase tracking-widest leading-none mb-1">Impact Verified</p>
                         <h4 className="font-black text-gray-900 text-sm">Farmer-First Policy</h4>
                      </div>
                   </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-10 right-10 w-full h-full border-2 border-[#5ba409]/10 rounded-[3rem] translate-x-4 translate-y-4 -z-10" />
            </div>

            <div className="flex-1">
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-8">
                The Story Behind the <span className="text-[#5ba409]">Seed</span>.
              </h2>
              <div className="space-y-6 text-gray-500 font-medium leading-relaxed">
                <p>
                  Founded in 2026, AgriLink was born out of a simple observation: our local farmers were producing world-class harvests, but struggled with inaccessible logistics and unfair trade cycles.
                </p>
                <p>
                  We set out to build a platform that doesn't just "sell vegetables," but connects hearts and livelihoods. By integrating local government units (LGU) and Barangay hubs into our logistics chain, we've created a failsafe system that guarantees freshness for buyers and financial security for producers.
                </p>
                <div className="pt-4 flex flex-col gap-4">
                   <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#5ba409]/5 border border-[#5ba409]/10 hover:bg-[#5ba409]/10 transition-colors">
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#5ba409] shadow-sm">
                         <TrendingUp className="w-4 h-4" />
                      </div>
                      <p className="text-sm font-bold text-gray-600">
                         Digitizing over 500+ small-scale farms across the archipelago.
                      </p>
                   </div>
                   <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50 hover:bg-blue-100/30 transition-colors">
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-500 shadow-sm">
                         <Globe className="w-4 h-4" />
                      </div>
                      <p className="text-sm font-bold text-gray-600">
                         Reducing food waste by 40% through direct-to-order logistics.
                      </p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 Core Values */}
      <section className="py-24 rounded-[3rem] mx-4 relative overflow-hidden border border-[#5ba409]/10 bg-gradient-to-br from-[#f6fbef] via-white to-[#eef8df]">
        <div className="absolute top-0 right-0 w-[38%] h-[40%] bg-[#5ba409]/10 rounded-full blur-[110px]" />
        <div className="absolute bottom-0 left-0 w-[35%] h-[35%] bg-[#5ba409]/10 rounded-full blur-[120px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-20">
            Where <span className="text-[#5ba409]">Quality</span> Takes Root
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((val, idx) => (
              <div
                key={idx}
                className="group rounded-3xl border border-[#5ba409]/15 bg-white/85 backdrop-blur-sm p-8 shadow-sm hover:shadow-md hover:border-[#5ba409]/35 transition-all"
              >
                <div className="w-16 h-16 bg-[#f2f9e6] rounded-2xl flex items-center justify-center text-[#5ba409] mx-auto mb-6 group-hover:bg-[#5ba409] group-hover:text-white transition-all duration-300">
                  {val.icon}
                </div>
                <h3 className="text-xl font-black mb-4 uppercase tracking-[0.16em] text-slate-900">{val.title}</h3>
                <p className="text-slate-600 font-medium leading-relaxed max-w-xs mx-auto">
                  {val.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 📍 CTA Section */}
      {!hasSession && (
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F8FAFC] rounded-[3rem] p-10 md:p-20 relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#5ba409]/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-[#5ba409]/5 rounded-full blur-[100px]" />
            
            <MapPin className="w-12 h-12 text-[#5ba409] mb-8" />
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-none mb-8">
              Grow with <span className="text-[#5ba409]">Us</span>.
            </h2>
            <p className="text-lg text-gray-500 font-medium max-w-2xl mb-12">
              Whether you're a local farmer looking to expand your reach or a family seeking the freshest produce, there's a place for you in the AgriLink community.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
              <button 
                onClick={() => navigate('/register')}
                className="flex-1 py-5 bg-[#5ba409] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-green-500/20 hover:bg-[#4d8f08] transition-all flex items-center justify-center gap-3 group"
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="flex-1 py-5 bg-white text-[#5ba409] border border-[#5ba409]/35 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-sm hover:shadow-lg hover:bg-[#f2f9e6] hover:border-[#5ba409] transition-all"
              >
                Sign In
              </button>
            </div>
            
            <p className="mt-12 text-[10px] font-black text-gray-300 uppercase tracking-widest">
               Established 2026 • AgriLink Core Ecosystem
            </p>
          </div>
        </div>
      </section>
      )}
    </div>
  );
};

export default AboutPage;
