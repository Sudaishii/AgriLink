import React, { useState, useEffect } from 'react';
import { Plus, Loader2, AlertCircle, CheckCircle2, Image as ImageIcon, Info, ChevronRight, LayoutGrid, Sparkles, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../../api/apiConfig';
import { useToast } from '../../ui/Toast';

const ProductUploadPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [hasFarmAddress, setHasFarmAddress] = useState(true);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);
    const { success: showSuccess, error: showError, info: showInfo } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        category: '1', // Default to 1 (Vegetables)
        price: '',
        quantity: '',
        unit: 'kg',
        description: '',
        harvest_date: ''
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const userId = localStorage.getItem('agrilink_id');

    useEffect(() => {
        checkFarmAddress();
    }, []);

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
        return tomorrow.toLocaleDateString('en-CA'); // YYYY-MM-DD
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            if (fieldErrors.image) {
                setFieldErrors(prev => {
                    const next = { ...prev };
                    delete next.image;
                    return next;
                });
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
            errors.harvest_date = 'Required';
        } else {
            if (formData.harvest_date < getMinHarvestDate()) {
                errors.harvest_date = 'Must be tomorrow or later';
            }
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
            data.append('u_id', userId || '');
            data.append('p_name', formData.name);
            data.append('p_description', formData.description);
            data.append('p_price', formData.price);
            data.append('p_unit', formData.unit);
            data.append('p_quantity', formData.quantity);
            data.append('harvest_date', formData.harvest_date);
            data.append('p_category', formData.category);
            
            if (imageFile) {
                data.append('p_image', imageFile);
            }

            const response = await fetch(`${API_BASE_URL}/add/product`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: data,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to create product listing.');
            }

            setSuccess(true);
            showSuccess('Crop added successfully!');
            setTimeout(() => navigate('/farmer/dashboard'), 2000);
        } catch (err: any) {
            setError(err.message);
            showError(err.message || 'Failed to publish listing.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans flex flex-col">
            {success ? (
                <div className="flex-1 flex items-center justify-center p-10 animate-fadeIn bg-white">
                    <div className="text-center max-w-lg w-full">
                        <div className="w-24 h-24 bg-green-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner relative z-10">
                            <CheckCircle2 className="w-12 h-12 text-[#5ba409] animate-bounce" />
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter italic uppercase leading-none">Listing Live!</h2>
                        <p className="text-gray-400 font-bold text-xs italic uppercase tracking-widest">Your harvest is active on agrilink.</p>
                    </div>
                </div>
            ) : initialLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-10 bg-white">
                    <Loader2 className="w-12 h-12 animate-spin text-[#5ba409] mb-4" />
                    <p className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] italic">Verifying Merchant Credentials...</p>
                </div>
            ) : !hasFarmAddress ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-white animate-fadeIn">
                    <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                        <MapPin className="w-12 h-12 text-amber-500" />
                    </div>
                    <div className="max-w-md space-y-6">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">Location Required</h2>
                        <p className="text-gray-500 font-bold text-sm italic leading-relaxed uppercase tracking-widest">
                            To ensure buyers can find your harvests on the map, you must provide a valid farm or home address before listing.
                        </p>
                        <button 
                            onClick={() => navigate('/profile')}
                            className="bg-[#5ba409] text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] italic shadow-xl shadow-green-900/10 hover:shadow-green-900/20 active:scale-95 transition-all"
                        >
                            Update Profile Address
                        </button>
                    </div>
                </div>
            ) : (
                /* 💎 Elite Full-Page Layout: Perfectly Balanced Component Scaling */
                <div className="flex-1 flex flex-col lg:flex-row animate-fadeIn">

                    {/* 🖼️ Left Panel: Integrated Merchant Preview */}
                    <div className="w-full lg:w-[32%] bg-slate-50/50 p-8 lg:p-10 border-r border-gray-100 flex flex-col justify-between relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#5ba409]/5 rounded-full blur-[80px] -mr-32 -mt-32" />

                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-gradient-to-br from-[#5ba409] to-[#4d8f08] rounded-2xl flex items-center justify-center shadow-xl shadow-green-900/10">
                                    <Plus className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5 mb-1">
                                        <Sparkles className="w-4 h-4 text-[#5ba409]" />
                                        <span className="text-[10px] font-black text-[#5ba409] uppercase tracking-[0.3em] italic leading-none">Official Merchant Portal</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Trade Entry</h2>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-[#5ba409] rounded-full animate-pulse" />
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic leading-none">Visual Branding</h3>
                                </div>

                                <div
                                    onClick={() => document.getElementById('product-image-upload')?.click()}
                                    className={`aspect-[4/3] relative rounded-[2rem] overflow-hidden border-2 border-dashed ${fieldErrors.image ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'} group-hover:border-[#5ba409] transition-colors shadow-inner cursor-pointer`}
                                >
                                    <input
                                        id="product-image-upload"
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center p-10">
                                            <div className={`w-20 h-20 ${fieldErrors.image ? 'bg-red-50 ring-2 ring-red-100' : 'bg-gray-50'} rounded-[1.75rem] flex items-center justify-center mb-6 px-1 group-hover:scale-105 transition-transform duration-500`}>
                                                <ImageIcon className={`w-8 h-8 ${fieldErrors.image ? 'text-red-400' : 'text-gray-300'} group-hover:text-[#5ba409] transition-colors`} />
                                            </div>
                                            <p className={`text-[11px] font-black ${fieldErrors.image ? 'text-red-500' : 'text-gray-400'} uppercase tracking-widest leading-relaxed italic text-balance`}>
                                                {fieldErrors.image || <>High-Resolution <br /> Harvest Photo</>}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="h-2 mt-2" />

                                <div className="p-5 bg-white/70 backdrop-blur-sm rounded-[2rem] border border-white shadow-sm flex items-start gap-4 transform hover:-translate-y-0.5 transition-transform">
                                    <div className="w-9 h-9 bg-amber-50 rounded-[1rem] flex items-center justify-center shrink-0">
                                        <Info className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[12px] font-black text-gray-800 uppercase italic tracking-tighter leading-none">Merchant Tip</p>
                                        <p className="text-[10px] text-gray-400 font-bold italic leading-relaxed uppercase tracking-widest">
                                            Real photos increase trust and buyer engagement by 40%.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 relative z-10">
                            <div className="flex items-center gap-4 p-4 bg-white/50 rounded-[2.5rem] border border-white shadow-sm">
                                <div className="w-12 h-12 bg-gray-200 rounded-2xl shrink-0 grayscale opacity-40 shadow-inner" />
                                <div>
                                    <p className="text-[11px] font-black text-gray-900 uppercase italic leading-none mb-1.5">Verified Merchant</p>
                                    <p className="text-[10px] text-[#5ba409] font-black uppercase tracking-widest italic leading-none bg-green-50 px-3 py-1.5 rounded-lg inline-block">Security Level 2</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 📝 Right Panel: Balanced Expanded Data Entry (Ideal Proportions) */}
                    <div className="flex-1 bg-white p-8 lg:p-12 xl:p-16 flex flex-col items-center justify-center">
                        <form onSubmit={handleSubmit} className="w-full max-w-4xl space-y-8">

                            <div className="grid md:grid-cols-2 gap-x-12 gap-y-12">
                                <div className="space-y-3.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] ml-1 italic leading-none">Crop Identifier</label>
                                    <input
                                        type="text" required
                                        placeholder="e.g. Premium Highland Cabbage"
                                        value={formData.name}
                                        onChange={(e) => {
                                            setFormData({ ...formData, name: e.target.value });
                                            if (fieldErrors.name) setFieldErrors(prev => {
                                                const next = { ...prev };
                                                delete next.name;
                                                return next;
                                            });
                                        }}
                                        className={`w-full bg-slate-50 border-2 ${fieldErrors.name ? 'border-red-200' : 'border-transparent'} focus:bg-white focus:border-[#5ba409] px-7 py-4.5 rounded-[1.25rem] font-black text-sm transition-all outline-none italic placeholder:text-gray-300 shadow-sm focus:shadow-xl focus:shadow-green-900/5`}
                                    />
                                    <div className="h-4 mt-1 ml-1">
                                        {fieldErrors.name && (
                                            <p className="text-red-500 text-[9px] font-black uppercase italic tracking-widest animate-in fade-in slide-in-from-top-1 duration-300">
                                                {fieldErrors.name}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] ml-1 italic leading-none">Trade Category</label>
                                    <div className="relative">
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full bg-slate-50/80 border-2 border-transparent focus:bg-white focus:border-[#5ba409] px-7 py-4.5 rounded-[1.25rem] font-black text-xs transition-all outline-none appearance-none cursor-pointer pr-14 italic uppercase shadow-sm hover:bg-slate-100/50"
                                        >
                                            <option value="1" className="font-black italic uppercase">Vegetables</option>
                                            <option value="2" className="font-black italic uppercase">Fruits</option>
                                            <option value="3" className="font-black italic uppercase">Grains</option>
                                            <option value="4" className="font-black italic uppercase">Root Crops</option>
                                            <option value="5" className="font-black italic uppercase">Others</option>
                                        </select>
                                        <ChevronRight className="absolute right-7 top-1/2 -translate-y-1/2 rotate-90 w-5.5 h-5.5 text-gray-300 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-3.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] ml-1 italic leading-none">Unit Valuation (₱)</label>
                                    <div className="relative group">
                                        <span className="absolute left-7 top-1/2 -translate-y-1/2 font-black text-gray-300 text-lg group-focus-within:text-[#5ba409] transition-colors italic">₱</span>
                                        <input
                                            type="number" required
                                            placeholder="0.00"
                                            value={formData.price}
                                            onChange={(e) => {
                                                setFormData({ ...formData, price: e.target.value });
                                                if (fieldErrors.price) setFieldErrors(prev => {
                                                    const next = { ...prev };
                                                    delete next.price;
                                                    return next;
                                                });
                                            }}
                                            className={`w-full bg-slate-50 border-2 ${fieldErrors.price ? 'border-red-200' : 'border-transparent'} focus:bg-white focus:border-[#5ba409] pl-12 pr-7 py-4.5 rounded-[1.25rem] font-black text-sm transition-all outline-none italic placeholder:text-gray-200 shadow-sm`}
                                        />
                                    </div>
                                    <div className="h-4 mt-1 ml-1">
                                        {fieldErrors.price && (
                                            <p className="text-red-500 text-[9px] font-black uppercase italic tracking-widest animate-in fade-in slide-in-from-top-1 duration-300">
                                                {fieldErrors.price}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] ml-1 italic leading-none">Harvest Timeline</label>
                                    <input
                                        type="date" required
                                        min={getMinHarvestDate()}
                                        value={formData.harvest_date}
                                        onChange={(e) => {
                                            setFormData({ ...formData, harvest_date: e.target.value });
                                            if (fieldErrors.harvest_date) setFieldErrors(prev => {
                                                const next = { ...prev };
                                                delete next.harvest_date;
                                                return next;
                                            });
                                        }}
                                        className={`w-full bg-slate-50 border-2 ${fieldErrors.harvest_date ? 'border-red-200' : 'border-transparent'} focus:bg-white focus:border-[#5ba409] px-7 py-4.5 rounded-[1.25rem] font-black text-sm transition-all outline-none uppercase italic shadow-sm`}
                                    />
                                    <div className="h-4 mt-1 ml-1">
                                        {fieldErrors.harvest_date && (
                                            <p className="text-red-500 text-[9px] font-black uppercase italic tracking-widest animate-in fade-in slide-in-from-top-1 duration-300">
                                                {fieldErrors.harvest_date}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-2 space-y-3.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-1 italic leading-none">Inventory & Packaging</label>
                                    <div className="flex gap-6">
                                        <input
                                            type="number" required
                                            placeholder="Total Available Stock"
                                            value={formData.quantity}
                                            onChange={(e) => {
                                                setFormData({ ...formData, quantity: e.target.value });
                                                if (fieldErrors.quantity) setFieldErrors(prev => {
                                                    const next = { ...prev };
                                                    delete next.quantity;
                                                    return next;
                                                });
                                            }}
                                            className={`flex-1 bg-slate-50 border-2 ${fieldErrors.quantity ? 'border-red-200' : 'border-transparent'} focus:bg-white focus:border-[#5ba409] px-7 py-4.5 rounded-[1.25rem] font-black text-sm transition-all outline-none italic shadow-sm`}
                                        />
                                        <select
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                            className="w-36 bg-slate-50/80 border-2 border-transparent focus:bg-white focus:border-[#5ba409] px-7 py-4.5 rounded-[1.25rem] font-black text-xs transition-all outline-none uppercase italic shadow-sm hover:bg-slate-100/50 cursor-pointer"
                                        >
                                            <option className="font-black italic uppercase">kg</option>
                                            <option className="font-black italic uppercase">sack</option>
                                            <option className="font-black italic uppercase">piece</option>
                                        </select>
                                    </div>
                                    <div className="h-4 mt-1 ml-1">
                                        {fieldErrors.quantity && (
                                            <p className="text-red-500 text-[9px] font-black uppercase italic tracking-widest animate-in fade-in slide-in-from-top-1 duration-300">
                                                {fieldErrors.quantity}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-2 space-y-3.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-1 italic leading-none">Market Narrative</label>
                                    <textarea
                                        rows={5}
                                        placeholder="Detail your highlights, organic methods, or trade specific terms..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-transparent focus:bg-white focus:border-[#5ba409] px-9 py-7 rounded-[2.25rem] font-medium text-sm transition-all outline-none resize-none placeholder:text-gray-300 leading-relaxed shadow-sm block italic"
                                    />
                                </div>
                            </div>

                            {/* 🎯 Perfectly Balanced High-Impact Action Controls */}
                            <div className="flex pt-6 items-center justify-center">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full max-w-md bg-gradient-to-br from-[#5ba409] to-[#4d8f08] hover:shadow-2xl hover:shadow-green-500/30 disabled:opacity-50 text-white py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.35em] transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-5 italic"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5.5 h-5.5 animate-spin" />
                                            <span className="animate-pulse">Authorizing Trade...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4.5 h-4.5" />
                                            Authorize & Publish Harvest
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductUploadPage;
