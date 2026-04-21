import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ShieldCheck, 
  Store,
  Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFullImageUrl, API_BASE_URL } from '../../../api/apiConfig';
import { useToast } from '../../ui/Toast';
import ConfirmationModal from '../../ui/ConfirmationModal';
import * as cartService from '../../../services/cartService';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [cartItems, setCartItems] = useState<cartService.CartItem[]>(cartService.getCart());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const { success, error, info } = useToast();

  useEffect(() => {
    const handleCartUpdate = () => {
      setCartItems(cartService.getCart());
    };
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const updateQuantity = (id: number, delta: number) => {
    const item = cartItems.find(i => i.id === id);
    if (item) {
      if (item.quantity <= 1 && delta < 0) return;
      const result = cartService.updateCartQuantity(id, item.quantity + delta);
      if (result.success && result.message) {
        info(result.message);
      } else if (!result.success) {
        error(result.message || 'Limit exceeded');
      }
    }
  };

  const handleDeleteClick = (id: number) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const removeItem = (id: number) => {
    cartService.removeFromCart(id);
    info('Item removed.');
    setItemToDelete(null);
  };

  const subtotal = cartService.getCartTotal();
  const total = subtotal;
  const totalUnits = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const formatCurrency = (value: number) => `PHP ${value.toLocaleString()}`;

  const handlePlaceOrder = async () => {
    const token = localStorage.getItem('agrilink_token');
    const userId = localStorage.getItem('agrilink_id');

    if (!token || !userId) {
      error('Log in to place orders.');
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) return;

    setIsLoading(true);
    try {
      const promises = cartItems.map(item => 
        fetch(`${API_BASE_URL}/purchases`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            product_id: item.id,
            quantity: item.quantity,
            buyer_id: userId
          })
        }).then(res => {
          if (!res.ok) throw new Error(`Failed to notify ${item.seller}`);
          return res.json();
        })
      );

      await Promise.all(promises);
      
      success('Order requests sent!');
      cartService.clearCart();
      navigate('/profile?tab=history');
    } catch (err: any) {
      console.error('Order failed:', err);
      error(err.message || 'Error placing order.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col pt-20">
      <div className="max-w-6xl mx-auto w-full px-6 py-6 flex-1 flex flex-col">
        
        {/* Progress Stepper */}
        <div className="flex items-center justify-center mb-8">
           <div className="flex items-center gap-4 w-full max-w-sm">
              <button 
                onClick={() => navigate('/buyer/marketplace')}
                className="flex flex-col items-center gap-2 group"
              >
                  <div className="w-10 h-10 rounded-full border-2 border-gray-100 flex items-center justify-center text-gray-400 group-hover:border-[#5ba409] group-hover:text-[#5ba409] transition-all">
                     <Store size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Market</span>
              </button>
              <div className="flex-1 h-[2px] bg-gray-100 rounded-full" />
              <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#5ba409] flex items-center justify-center text-white shadow-lg shadow-green-900/10">
                     <ShoppingBag size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">My Cart</span>
              </div>
           </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
            {/* Items Column */}
            <div className="flex-1 min-w-0">
               <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Shopping Cart</h1>
                  <p className="text-sm text-gray-500">You have {totalUnits} item{totalUnits === 1 ? '' : 's'} from {cartItems.length} listing{cartItems.length === 1 ? '' : 's'} in your basket.</p>
                  <p className="mt-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 inline-flex px-3 py-1 rounded-full">
                    No upfront payment. Requests are sent to farmers for confirmation.
                  </p>
               </div>

               {cartItems.length > 0 ? (
                 <div className="max-h-[480px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    <div className="space-y-4">
                       {cartItems.map((item) => (
                         <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:border-[#5ba409]/10 transition-all">
                            <div className="w-24 h-24 rounded-xl bg-gray-50 overflow-hidden border border-gray-100 shrink-0">
                               {item.image ? (
                                 <img src={getFullImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-gray-100">
                                    <Package size={32} />
                                 </div>
                               )}
                            </div>
                            <div className="flex-1 min-w-0">
                               <h3 className="text-lg font-bold text-gray-900 truncate">{item.name}</h3>
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Farmer: {item.seller}</p>
                               
                               <div className="flex items-center gap-6">
                                  <div className="flex items-center border border-gray-100 rounded-xl p-1 bg-gray-50/50">
                                     <button
                                       onClick={() => updateQuantity(item.id, -1)}
                                       disabled={item.quantity <= 1}
                                       className="w-10 h-10 flex items-center justify-center hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent rounded-lg text-gray-400 transition-colors"
                                     >
                                       <Minus size={14} />
                                     </button>
                                     <span className="w-10 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                                     <button onClick={() => updateQuantity(item.id, 1)} className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-lg text-gray-400 transition-colors"><Plus size={14} /></button>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteClick(item.id)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-100 bg-red-50/40 text-[10px] font-black text-red-500 hover:bg-red-50 hover:text-red-600 uppercase tracking-widest transition-colors"
                                  >
                                    <Trash2 size={12} />
                                    Remove
                                  </button>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-xl font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                               <p className="text-[10px] text-gray-400 font-medium">{formatCurrency(item.price)} / {item.unit}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ) : (
                 <div className="py-24 text-center bg-gray-50/30 border border-dashed border-gray-200 rounded-[2rem]">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-200 mx-auto mb-6">
                       <ShoppingBag size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Your cart is empty</h3>
                    <p className="text-sm text-gray-400 mb-8 max-w-xs mx-auto">Explore fresh local produce in our marketplace.</p>
                    <button 
                      onClick={() => navigate('/buyer/marketplace')}
                      className="px-8 py-3 bg-[#5ba409] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-green-900/10 hover:bg-green-700 transition-all"
                    >
                      Return to Market
                    </button>
                 </div>
               )}
            </div>

            {/* Price Summary Sidebar */}
            <div className="w-full lg:w-96">
               <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm space-y-8 sticky top-32">
                  <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>
                  
                  <div className="space-y-4">
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-400 font-medium tracking-tight">Total Units</span>
                        <span className="text-gray-900 font-bold">{totalUnits}</span>
                     </div>
                     <div className="pt-6 border-t border-gray-50 flex justify-between items-end">
                        <span className="text-gray-400 font-medium tracking-tight">Collective Value</span>
                        <span className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</span>
                     </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex gap-4">
                     <ShieldCheck className="text-blue-500 shrink-0" size={18} />
                     <p className="text-[10px] text-blue-700 font-bold leading-relaxed uppercase tracking-tight">
                        Direct-to-Farmer Request Verified. Final details are coordinated via direct message after confirmation.
                     </p>
                  </div>

                  <button 
                    disabled={cartItems.length === 0 || isLoading}
                    onClick={handlePlaceOrder}
                    className="w-full py-5 bg-gray-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-gray-900/10 hover:bg-[#5ba409] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                     {isLoading ? (
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     ) : (
                       <>Send Requests <ArrowRight size={16} /></>
                     )}
                  </button>
               </div>
            </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => itemToDelete && removeItem(itemToDelete)}
        title="Remove item?"
        message="Are you sure you want to remove this fresh produce from your cart? You can always add it back later from the marketplace."
        confirmText="Remove Item"
        cancelText="Keep Item"
        icon={Trash2}
      />
    </div>
  );
};

export default CartPage;

