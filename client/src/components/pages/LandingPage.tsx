import React, { useEffect, useMemo, useState } from 'react';
import { Search, Sun, Sprout, Users, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LandingPageProps, Product } from '../../types';
import ProductCard from '../ui/ProductCard';
import { API_BASE_URL } from '../../api/apiConfig';

type LandingSnapshotResponse = {
  stats?: {
    farmersCount?: number;
    productsCount?: number;
    buyersCount?: number;
  };
  featuredProducts?: Array<any>;
};

const formatCompact = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}m+`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k+`;
  return `${value}+`;
};

const LandingPage: React.FC<LandingPageProps> = () => {
  const navigate = useNavigate();
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [stats, setStats] = useState({
    farmersCount: 0,
    productsCount: 0,
    buyersCount: 0
  });
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchLandingSnapshot = async () => {
      try {
        setLoadingSnapshot(true);
        const res = await fetch(`${API_BASE_URL}/products/landing/snapshot`);
        if (!res.ok) throw new Error('Failed to fetch landing snapshot.');
        const data: LandingSnapshotResponse = await res.json();

        setStats({
          farmersCount: Number(data.stats?.farmersCount || 0),
          productsCount: Number(data.stats?.productsCount || 0),
          buyersCount: Number(data.stats?.buyersCount || 0)
        });

        const mappedFeatured: Product[] = (data.featuredProducts || []).map((p: any) => ({
          id: Number(p.p_id),
          name: p.p_name,
          price: Number(p.p_price || 0),
          unit: p.p_unit || 'unit',
          seller: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Local Farmer',
          sellerUserId: Number(p.u_id),
          location: p.farm_city || p.city || 'Local Farm',
          stock: Number(p.p_quantity || 0),
          image: p.p_image || '',
          category: p.cat_name || 'Others',
          badges: [],
          isVerified: Boolean(p.isVerified),
          status: p.p_status
        }));

        setFeaturedProducts(mappedFeatured);
      } catch (err) {
        console.error(err);
        setFeaturedProducts([]);
        setStats({ farmersCount: 0, productsCount: 0, buyersCount: 0 });
      } finally {
        setLoadingSnapshot(false);
      }
    };

    fetchLandingSnapshot();
  }, []);

  const statFarmers = useMemo(() => (loadingSnapshot ? '...' : formatCompact(stats.farmersCount)), [loadingSnapshot, stats.farmersCount]);
  const statProducts = useMemo(() => (loadingSnapshot ? '...' : formatCompact(stats.productsCount)), [loadingSnapshot, stats.productsCount]);
  const statBuyers = useMemo(() => (loadingSnapshot ? '...' : formatCompact(stats.buyersCount)), [loadingSnapshot, stats.buyersCount]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FBE7] via-white to-[#E8F5E9]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#5ba409] rounded-full opacity-5 blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#FFC107] rounded-full opacity-5 blur-3xl animate-float-delayed"></div>
          <Sun className="absolute top-10 right-20 w-16 h-16 text-[#FFC107] opacity-20 animate-spin-slow" />
          <Sprout className="absolute bottom-32 left-20 w-20 h-20 text-[#5ba409] opacity-20" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="text-center lg:text-left space-y-8 animate-slideInLeft">
              <div className="inline-block">
                <span className="bg-[#5ba409] text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                  🌱 Fresh from the Farm
                </span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-black text-gray-900 leading-tight">
                Buy Fresh Produce
                <span className="block text-[#5ba409] mt-2">Direct from Farmers</span>
              </h1>
              <p className="text-xl text-gray-700 leading-relaxed max-w-xl">
                Connect with local farmers and access the freshest organic produce. Support your community while enjoying farm-to-table goodness.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => navigate('/marketplace')}
                  className="bg-[#5ba409] hover:bg-[#4d8f08] text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
                >
                  Browse Marketplace
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="bg-white hover:bg-gray-50 text-[#5ba409] border-2 border-[#5ba409] px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  Sell Your Harvest
                </button>
              </div>
              
              {/* Stats */}
                <div className="grid grid-cols-3 gap-6 pt-8">
                <div className="text-center">
                  <h4 className="text-3xl font-black text-[#5ba409]">{statFarmers}</h4>
                  <p className="text-sm text-gray-600 font-semibold">Farmers</p>
                </div>
                <div className="text-center">
                  <h4 className="text-3xl font-black text-[#5ba409]">{statProducts}</h4>
                  <p className="text-sm text-gray-600 font-semibold">Products</p>
                </div>
                <div className="text-center">
                  <h4 className="text-3xl font-black text-[#5ba409]">{statBuyers}</h4>
                  <p className="text-sm text-gray-600 font-semibold">Happy Buyers</p>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative animate-slideInRight">
              <div className="relative bg-gradient-to-br from-[#5ba409] to-[#74c419] rounded-3xl p-2 shadow-2xl transform hover:rotate-1 transition-transform">
                <img 
                  src="/src/assets/hero.jpg" 
                  alt="Fresh farm produce" 
                  className="w-full h-auto rounded-2xl object-cover"
                />
              </div>
              {/* Floating badges */}
              <div className="absolute -top-4 -left-4 bg-[#FFC107] text-white px-4 py-2 rounded-full font-bold shadow-lg animate-float">
                100% Organic
              </div>
              <div className="absolute -bottom-4 -right-4 bg-white text-[#5ba409] px-4 py-2 rounded-full font-bold shadow-lg border-2 border-[#5ba409] animate-float-delayed">
                Farm Fresh
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Products Preview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-gray-900 mb-4">Featured Fresh Produce</h2>
          <p className="text-lg text-gray-600">Handpicked from our trusted farmers</p>
        </div>
        {featuredProducts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center text-gray-500 font-semibold">
            No featured produce available yet.
          </div>
        )}
        <div className="text-center mt-12">
          <button
            onClick={() => navigate('/marketplace')}
            className="bg-[#5ba409] hover:bg-[#4d8f08] text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all inline-flex items-center space-x-2"
          >
            <span>View All Products</span>
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl hover:bg-[#F9FBE7] transition-colors">
              <div className="bg-[#5ba409] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 p-2">
                <img 
                  src="/src/assets/logo/AgriLinkWHITE.png" 
                  alt="AgriLink Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">100% Organic</h3>
              <p className="text-gray-600">All products are certified organic and grown without harmful chemicals</p>
            </div>
            <div className="text-center p-8 rounded-2xl hover:bg-[#F9FBE7] transition-colors">
              <div className="bg-[#FFC107] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Support Local</h3>
              <p className="text-gray-600">Buy directly from farmers in your community and strengthen local economy</p>
            </div>
            <div className="text-center p-8 rounded-2xl hover:bg-[#F9FBE7] transition-colors">
              <div className="bg-[#8D6E63] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Quality Assured</h3>
              <p className="text-gray-600">Every farmer is verified and products meet strict quality standards</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
