import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Image as ImageIcon, Loader2, Package } from 'lucide-react';
import { API_BASE_URL, getFullImageUrl } from '../../../api/apiConfig';
import { useToast } from '../../ui/Toast';
import Modal from '../../ui/Modal';

interface EditProductModalProps {
  productId: string | undefined;
  initialProduct?: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ productId, initialProduct, isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const { success: showSuccess, error: showError, info: showInfo } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    category: '1',
    price: '',
    quantity: '',
    unit: 'kg',
    description: '',
    harvest_date: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const userId = localStorage.getItem('agrilink_id');

  const getMinHarvestDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('en-CA');
  };

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        category: '1',
        price: '',
        quantity: '',
        unit: 'kg',
        description: '',
        harvest_date: '',
      });
      setImageFile(null);
      setImagePreview(null);
      setError('');
      setFieldErrors({});
      setLoading(false);
      setSuccess(false);
      return;
    }

    if (initialProduct) {
      const p = initialProduct;
      setFormData({
        name: p.p_name,
        category: p.p_category?.toString() ?? '1',
        price: p.p_price?.toString() ?? '',
        quantity: p.p_quantity?.toString() ?? '',
        unit: p.p_unit ?? 'kg',
        description: p.p_description ?? '',
        harvest_date: p.harvest_date ? p.harvest_date.split('T')[0] : '',
      });
      if (p.p_image) {
        setImagePreview(getFullImageUrl(p.p_image));
      }
      return;
    }

    if (!productId) return;

    const fetchProduct = async () => {
      try {
        setFetching(true);
        const token = localStorage.getItem('agrilink_token');
        const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.product) {
          const p = data.product;
          setFormData({
            name: p.p_name,
            category: p.p_category?.toString() ?? '1',
            price: p.p_price?.toString() ?? '',
            quantity: p.p_quantity?.toString() ?? '',
            unit: p.p_unit ?? 'kg',
            description: p.p_description ?? '',
            harvest_date: p.harvest_date ? p.harvest_date.split('T')[0] : '',
          });
          if (p.p_image) {
            setImagePreview(getFullImageUrl(p.p_image));
          }
        } else {
          setError('Failed to load product.');
        }
      } catch {
        setError('Failed to fetch product details.');
      } finally {
        setFetching(false);
      }
    };

    fetchProduct();
  }, [isOpen, productId, initialProduct]);

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
    if (!userId || !productId) {
      showError('System Error: Session or Product ID missing.');
      return;
    }

    const errors: Record<string, string> = {};
    if (!formData.name) errors.name = 'Crop name is required';

    if (!formData.price) {
      errors.price = 'Price is required';
    } else if (parseFloat(formData.price) <= 0) {
      errors.price = 'Price must be greater than 0';
    }

    if (!formData.quantity) {
      errors.quantity = 'Quantity is required';
    } else if (parseFloat(formData.quantity) <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }

    if (!formData.harvest_date) {
      errors.harvest_date = 'Harvest date is required';
    } else if (formData.harvest_date < getMinHarvestDate()) {
      errors.harvest_date = 'Must be tomorrow or later';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setError('');

    const hasChanges = () => {
      if (!initialProduct) return true;
      const p = initialProduct;
      const initialHarvestDate = p.harvest_date ? p.harvest_date.split('T')[0] : '';

      return (
        formData.name !== p.p_name ||
        formData.category !== p.p_category?.toString() ||
        formData.price !== p.p_price?.toString() ||
        formData.quantity !== p.p_quantity?.toString() ||
        formData.unit !== p.p_unit ||
        formData.description !== p.p_description ||
        formData.harvest_date !== initialHarvestDate ||
        imageFile !== null
      );
    };

    if (!hasChanges()) {
      setLoading(false);
      showInfo('Nothing changed');
      return;
    }

    try {
      const token = localStorage.getItem('agrilink_token');
      const data = new FormData();
      data.append('u_id', userId);
      data.append('p_name', formData.name);
      data.append('p_description', formData.description);
      data.append('p_price', formData.price);
      data.append('p_unit', formData.unit);
      data.append('p_quantity', formData.quantity);
      data.append('harvest_date', formData.harvest_date);
      data.append('p_category', formData.category);
      data.append('p_status', 'active');

      if (imageFile) {
        data.append('p_image', imageFile);
      } else if (initialProduct?.p_image) {
        data.append('p_image', initialProduct.p_image);
      }

      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'The server encountered an issue while updating your listing.');
      }

      setSuccess(true);
      showSuccess('Crop edited successfully!');
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update harvest listing.';
      showError(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setFieldErrors({});
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-700" />
          <span>Edit Crop Listing</span>
        </div>
      }
      maxWidth="max-w-3xl"
    >
      {fetching ? (
        <div className="py-12 flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
          <p className="text-sm font-semibold">Loading product details...</p>
        </div>
      ) : success ? (
        <div className="py-12 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          <h3 className="text-xl font-black text-slate-900">Listing updated successfully</h3>
          <p className="text-sm text-slate-500">Your crop changes were saved.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Product Image</p>
              <span className="text-[11px] text-slate-500 font-semibold">Click card to update</span>
            </div>
            <div
              onClick={() => document.getElementById('edit-product-image-upload')?.click()}
              className="cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white p-4 flex items-center gap-4 hover:border-emerald-300 transition"
            >
              <input
                id="edit-product-image-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-slate-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">Click to change image</p>
                <p className="text-xs text-slate-500">Use a clear, recent photo for better buyer trust.</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Listing Information</p>
              <span className="text-[11px] text-slate-500">Keep details accurate for buyers</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Crop Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  clearFieldError('name');
                }}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${
                  fieldErrors.name
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                }`}
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-600 font-semibold">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
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
              <label className="block text-xs font-bold text-slate-600 mb-1">Price (PHP)</label>
              <input
                type="number"
                required
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: e.target.value });
                  clearFieldError('price');
                }}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${
                  fieldErrors.price
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                }`}
              />
              {fieldErrors.price && <p className="mt-1 text-xs text-red-600 font-semibold">{fieldErrors.price}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Harvest Date</label>
              <input
                type="date"
                required
                min={getMinHarvestDate()}
                value={formData.harvest_date}
                onChange={(e) => {
                  setFormData({ ...formData, harvest_date: e.target.value });
                  clearFieldError('harvest_date');
                }}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${
                  fieldErrors.harvest_date
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                }`}
              />
              {fieldErrors.harvest_date && <p className="mt-1 text-xs text-red-600 font-semibold">{fieldErrors.harvest_date}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Quantity</label>
              <input
                type="number"
                required
                value={formData.quantity}
                onChange={(e) => {
                  setFormData({ ...formData, quantity: e.target.value });
                  clearFieldError('quantity');
                }}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${
                  fieldErrors.quantity
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                }`}
              />
              {fieldErrors.quantity && <p className="mt-1 text-xs text-red-600 font-semibold">{fieldErrors.quantity}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option>kg</option>
                <option>tray</option>
                <option>sack</option>
                <option>piece</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none resize-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#5ba409] hover:bg-[#4d8f08] disabled:bg-slate-300 text-white font-bold transition-colors inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {loading ? 'Saving...' : 'Save Crop Changes'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default EditProductModal;
