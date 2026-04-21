import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL, getFullImageUrl } from '../../../api/apiConfig';
import type { Product } from '../../../types';
import { 
  ArrowLeft, 
  MapPin, 
  CreditCard, 
  Truck, 
  CheckCircle, 
  Banknote,
  ShieldCheck,
  Wallet,
  Info,
  ChevronRight,
  ShieldAlert,
  Package,
  Clock
} from 'lucide-react';
import { useToast } from '../../ui/Toast';

const CheckoutPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const qty = Number(searchParams.get('qty')) || 1;

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'gcash' | 'card'>('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [address, setAddress] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  React.useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        const prodRes = await fetch(`${API_BASE_URL}/products/${id}`);
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          const p = prodData.product;
          setProduct({
            id: p.p_id,
            name: p.p_name,
            price: parseFloat(p.p_price),
            unit: p.p_unit,
            seller: `${p.first_name} ${p.last_name}`,
            location: p.city || 'Local Farm',
            stock: parseFloat(p.p_quantity),
            image: p.p_image || '',
            category: p.cat_name || 'Others'
          });
        }

        const userId = localStorage.getItem('agrilink_id');
        const token = localStorage.getItem('agrilink_token');
        if (userId && token) {
          const userRes = await fetch(`${API_BASE_URL}/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.address) {
              setAddress(`${userData.address}, ${userData.city}, ${userData.province}`);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching checkout data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutData();
  }, [id]);

  const handleConfirmOrder = async () => {
    if (!address) {
      showError('Please provide a delivery address.');
      return;
    }

    if (product && qty > product.stock) {
      showError(`Only ${product.stock} ${product.unit} available in stock.`);
      return;
    }

    const userId = localStorage.getItem('agrilink_id');
    const token = localStorage.getItem('agrilink_token');

    if (!userId || !token) {
      showError('You must be logged in to place an order.');
      navigate('/login');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          buyer_id: userId,
          product_id: id,
          quantity: qty,
          address: address,
          notes: contactMessage
        })
      });

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          navigate('/buyer/dashboard');
        }, 3000);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to place order');
      }
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-4">
        <div className="w-16 h-16 border-4 border-gray-100 border-t-green-600 rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Preparing Checkout...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="bg-white p-16 rounded-[4rem] text-center max-w-lg w-full mx-4 border border-gray-100 shadow-2xl shadow-green-900/5">
          <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Order Received!</h1>
          <p className="text-gray-500 font-medium mb-10 leading-relaxed">
            The farmer has been notified of your request. Please check your messages to coordinate shipping arrangements directly.
          </p>
          <button 
            onClick={() => navigate('/buyer/dashboard')}
            className="w-full py-5 bg-gray-900 hover:bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl"
          >
            Manage My Orders
          </button>
        </div>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-6">
        <ShieldAlert className="w-20 h-20 text-gray-100" />
        <h2 className="text-3xl font-black text-gray-900">Checkout Error</h2>
        <button onClick={() => navigate('/buyer/marketplace')} className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Back to Marketplace</button>
      </div>
    );
  }

  const subtotal = product.price * qty;
  const deliveryPlaceholder = 0; // We explicitly show this as "Handled by Farmer"
  const total = subtotal;

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* ── Breadcrumbs ───────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-50 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-green-600 font-bold text-sm transition-all">
            <ArrowLeft className="w-4 h-4" /> Return to Product
          </button>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-300">
            <span>Market</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-900">Secure Checkout</span>
          </div>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-16 items-start">
          
          <div className="lg:col-span-2 space-y-12">
            
            {/* 📋 Logistics Notice Section */}
            <div className="p-8 bg-blue-50 border border-blue-100 rounded-[3rem] flex gap-8">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                <Truck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">External Logistics & Shipping</h3>
                <p className="text-sm text-blue-700/70 font-medium leading-[1.6]">
                  AgriLink manages the payment for produce only. Shipping is a separate arrangement between you and the farmer. 
                  Coordinate your preferred courier or delivery schedule via the internal chat system.
                </p>
              </div>
            </div>

            {/* 1. Delivery Details */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center font-black">1</div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Where should we point the Farmer?</h2>
              </div>
              
              <div className="grid gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Delivery Destination</label>
                  <textarea 
                    rows={3}
                    placeholder="Enter your full shipping address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-5 bg-gray-50 border border-gray-100 rounded-3xl font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-green-500/5 focus:border-green-500/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Courier Notes (Optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g. Near Brgy Hall, call upon arrival"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-green-500/5"
                  />
                </div>
              </div>
            </div>

            {/* 2. Payment Method */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center font-black">2</div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Settlement Architecture</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-6 rounded-3xl border-2 text-left transition-all flex items-center gap-5 ${
                    paymentMethod === 'cod' ? 'border-green-600 bg-green-50/20' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className={`p-4 rounded-2xl ${paymentMethod === 'cod' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">Pay on Harvest</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Cash on Delivery</p>
                  </div>
                </button>

                <button 
                  onClick={() => setPaymentMethod('gcash')}
                  className={`p-6 rounded-3xl border-2 text-left transition-all flex items-center gap-5 ${
                    paymentMethod === 'gcash' ? 'border-blue-600 bg-blue-50/20' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className={`p-4 rounded-2xl ${paymentMethod === 'gcash' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">Digital Settlement</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">GCash e-Wallet</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* 🛒 Order Summary Card */}
          <div className="lg:sticky lg:top-10">
            <div className="p-8 bg-white border border-gray-100 rounded-[3rem] shadow-2xl shadow-gray-200/50">
              <div className="flex items-center gap-3 mb-8">
                <Package className="w-5 h-5 text-gray-900" />
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Order Architecture</h2>
              </div>
              
              <div className="space-y-6 pb-8 border-b border-gray-100 mb-8">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                    <img src={getFullImageUrl(product.image)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-gray-900 leading-tight">{product.name}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">From {product.seller}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs font-black text-green-700">₱{product.price} / {product.unit}</span>
                      <span className="text-[10px] font-black bg-gray-900 text-white px-2 py-0.5 rounded-md uppercase">x{qty}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Base Harvest Value</span>
                  <span className="font-black text-gray-900">₱{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Logistics / Shipping</span>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">External</span>
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Platform Total</span>
                  <span className="text-3xl font-black text-gray-900 tracking-tighter">₱{total.toLocaleString()}</span>
                </div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2 text-right">Settled through AgriLink</p>
              </div>

              <button 
                onClick={handleConfirmOrder}
                disabled={isProcessing}
                className="w-full py-5 bg-gray-900 hover:bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 disabled:bg-gray-200"
              >
                {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm Harvest Order'}
              </button>

              <div className="mt-8 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><ShieldCheck className="w-4 h-4" /></div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase leading-snug">Secured by AgriLink Protocol</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><Clock className="w-4 h-4" /></div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase leading-snug">Farmer Response expected in ~2hrs</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
