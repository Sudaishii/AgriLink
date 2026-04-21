import React from 'react';
import { CheckCircle2, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../../api/apiConfig';
import { useToast } from '../../ui/Toast';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const initialForm = {
  name: '',
  category: '1',
  price: '',
  quantity: '',
  unit: 'kg',
  description: '',
  harvest_date: '',
};

const AddProductModalV2: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [successState, setSuccessState] = React.useState(false);
  const [formData, setFormData] = React.useState(initialForm);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [hasFarmAddress, setHasFarmAddress] = React.useState(true);
  const [initialLoading, setInitialLoading] = React.useState(false);
  const { success: showSuccess, error: showError } = useToast();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isOpen) {
      checkFarmAddress();
    } else {
      setFormData(initialForm);
      setImageFile(null);
      setImagePreview(null);
      setError('');
      setFieldErrors({});
      setLoading(false);
      setSuccessState(false);
    }
  }, [isOpen]);

  const checkFarmAddress = async () => {
    try {
      setInitialLoading(true);
      const token = localStorage.getItem('agrilink_token');
      const uid = localStorage.getItem('agrilink_id');
      if (!uid) return;

      const res = await fetch(`${API_BASE_URL}/users/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      // Check resolved_farm_address or address fallback as used in backend
      if (!data.farm_address && !data.address) {
        setHasFarmAddress(false);
      } else {
        setHasFarmAddress(true);
      }
    } catch (err) {
      console.error('Error checking farm address:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const getMinHarvestDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('en-CA');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearFieldError = (key: string) => {
    if (!fieldErrors[key]) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Crop name is required';
    if (!formData.price || parseFloat(formData.price) <= 0) errors.price = 'Price must be greater than 0';
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) errors.quantity = 'Quantity must be greater than 0';
    if (!formData.harvest_date) errors.harvest_date = 'Harvest date is required';
    if (formData.harvest_date && formData.harvest_date < getMinHarvestDate()) {
      errors.harvest_date = 'Harvest date must be tomorrow or later';
    }
    if (!imageFile) {
      errors.image = 'A product image is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('agrilink_token');
      const data = new FormData();
      data.append('p_name', formData.name);
      data.append('p_description', formData.description);
      data.append('p_price', formData.price);
      data.append('p_unit', formData.unit);
      data.append('p_quantity', formData.quantity);
      data.append('harvest_date', formData.harvest_date);
      data.append('p_category', formData.category);
      if (imageFile) data.append('p_image', imageFile);

      const response = await fetch(`${API_BASE_URL}/add/product`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to publish listing.');
      }

      setSuccessState(true);
      showSuccess('Listing published successfully.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to publish listing.');
      showError(err.message || 'Failed to publish listing.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[3px]" onClick={onClose} />

      <div className="relative bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between bg-white">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5ba409]">AgriLink Farmer</p>
            <h2 className="text-2xl font-black text-gray-900">Create New Listing</h2>
            <p className="text-sm text-gray-500 mt-1">Add your crop details to publish it in the marketplace.</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {initialLoading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#5ba409] mb-4" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest italic">Verifying Credentials...</p>
          </div>
        ) : !hasFarmAddress ? (
          <div className="p-14 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
            <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3 uppercase italic leading-none">Location Required</h3>
            <p className="text-gray-500 font-medium text-sm mb-8 leading-relaxed uppercase tracking-widest italic">
              You must set your farm or home address in your profile before you can list products on the marketplace map.
            </p>
            <button
              onClick={() => {
                onClose();
                navigate('/profile');
              }}
              className="w-full bg-[#5ba409] text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] italic shadow-lg hover:shadow-green-500/20 active:scale-95 transition-all"
            >
              Go to Profile
            </button>
          </div>
        ) : successState ? (
          <div className="p-14 text-center">
            <CheckCircle2 className="w-16 h-16 text-[#5ba409] mx-auto mb-3" />
            <h3 className="text-2xl font-black text-gray-900 mb-2">Listing Published</h3>
            <p className="text-gray-600">Your product is now visible to buyers.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6 md:p-7">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-gray-800 mb-4">Listing Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Crop Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          clearFieldError('name');
                        }}
                        placeholder="e.g. Fresh Roma Tomatoes"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5ba409]/20"
                      />
                      {fieldErrors.name && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.name}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5ba409]/20"
                      >
                        <option value="1">Rice & Corn</option>
                        <option value="2">Vegetables</option>
                        <option value="3">Leafy Greens</option>
                        <option value="4">Root Crops</option>
                        <option value="5">Fruits</option>
                        <option value="6">Herbs & Spices</option>
                        <option value="7">Beans & Nuts</option>
                        <option value="8">Others (Default)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Harvest Date</label>
                      <input
                        type="date"
                        min={getMinHarvestDate()}
                        value={formData.harvest_date}
                        onChange={(e) => {
                          setFormData({ ...formData, harvest_date: e.target.value });
                          clearFieldError('harvest_date');
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5ba409]/20"
                      />
                      {fieldErrors.harvest_date && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.harvest_date}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Price (PHP)</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => {
                          setFormData({ ...formData, price: e.target.value });
                          clearFieldError('price');
                        }}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5ba409]/20"
                      />
                      {fieldErrors.price && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.price}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Unit</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5ba409]/20"
                      >
                        <option value="kg">kg</option>
                        <option value="tray">tray</option>
                        <option value="sack">sack</option>
                        <option value="piece">piece</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Quantity</label>
                      <input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => {
                          setFormData({ ...formData, quantity: e.target.value });
                          clearFieldError('quantity');
                        }}
                        placeholder="Available stock"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5ba409]/20"
                      />
                      {fieldErrors.quantity && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.quantity}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Description</label>
                      <textarea
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe crop quality, farming method, and pickup or delivery notes."
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5ba409]/20 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-gray-800 mb-3">Product Image</h3>
                  <label className="block cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    <div className={`aspect-[4/3] rounded-2xl border-2 border-dashed ${fieldErrors.image ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'} hover:bg-gray-100 transition-colors overflow-hidden flex items-center justify-center`}>
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center text-gray-500">
                          <ImageIcon className={`w-8 h-8 mx-auto mb-2 ${fieldErrors.image ? 'text-red-400' : ''}`} />
                          <p className={`text-sm font-semibold ${fieldErrors.image ? 'text-red-600' : ''}`}>
                            {fieldErrors.image || 'Upload photo'}
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">A clear image improves visibility and buyer trust.</p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] font-black text-emerald-700 mb-2">Publishing Tip</p>
                  <p className="text-sm text-emerald-900 font-medium leading-relaxed">
                    Accurate stock, realistic price, and clear quality notes help buyers confirm faster.
                  </p>
                </div>
              </div>
            </div>

            {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

            <div className="mt-6 flex gap-3 justify-end border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-[#5ba409] hover:bg-[#4d8f08] disabled:opacity-60 text-white font-semibold inline-flex items-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish Listing'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddProductModalV2;
