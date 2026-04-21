import React, { useState, useEffect } from 'react';
import { Plus, Loader2, AlertCircle, ArrowLeft, CheckCircle2, RefreshCcw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { FormData } from '../../../types';
import { API_BASE_URL } from '../../../api/apiConfig';

const EditProductPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        name: '',
        category: 'Vegetables',
        price: '',
        quantity: '',
        unit: 'kg',
        description: '',
        location: '',
        harvest_date: ''
    });

    const userId = localStorage.getItem('agrilink_id');

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const token = localStorage.getItem('agrilink_token');
                const res = await fetch(`${API_BASE_URL}/products/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    const p = data.product;
                    setFormData({
                        name: p.p_name,
                        category: 'Vegetables', // Should map if categories are complex
                        price: p.p_price.toString(),
                        quantity: p.p_quantity.toString(),
                        unit: p.p_unit,
                        description: p.p_description,
                        location: p.location || '',
                        harvest_date: p.harvest_date ? p.harvest_date.split('T')[0] : ''
                    });
                }
            } catch (err) {
                setError('Failed to fetch product details.');
            } finally {
                setFetching(false);
            }
        };
        fetchProduct();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('agrilink_token');
            const response = await fetch(`${API_BASE_URL}/products/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    u_id: userId,
                    p_name: formData.name,
                    p_description: formData.description,
                    p_price: formData.price,
                    p_unit: formData.unit,
                    p_quantity: formData.quantity,
                    harvest_date: formData.harvest_date,
                    p_category: 1,
                    p_image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=200',
                    p_status: 'active'
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update product listing.');
            }

            setSuccess(true);
            setTimeout(() => navigate('/farmer/listings'), 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F9FBE7]">
                <RefreshCcw className="w-12 h-12 text-[#5ba409] animate-spin" />
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F9FBE7]">
                <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-md w-full">
                    <CheckCircle2 className="w-16 h-16 text-[#5ba409] mx-auto mb-6 animate-bounce" />
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Listing Updated!</h2>
                    <p className="text-gray-500 font-medium">Your changes are now live. Redirecting...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F9FBE7] to-white font-sans pb-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-black text-xs uppercase tracking-widest mb-8 group transition-all"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Cancel Editing
                </button>

                <div className="mb-12">
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-4">Edit Listing<span className="text-[#5ba409]">.</span></h1>
                    <p className="text-xl text-gray-400 font-medium">Update the details of your harvest listing.</p>
                </div>

                <div className="bg-white rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] p-10 md:p-16 border border-gray-50">
                    {error && (
                        <div className="mb-10 p-6 bg-red-50 border-l-8 border-red-500 rounded-2xl flex items-center gap-4">
                            <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                            <p className="font-bold text-red-800">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-10">
                        <div className="grid md:grid-cols-2 gap-10">
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Crop Name</label>
                                    <input
                                        type="text" required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#5ba409] px-6 py-5 rounded-2xl font-black text-lg transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Price per Unit (₱)</label>
                                    <input
                                        type="number" required
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#5ba409] px-6 py-5 rounded-2xl font-black text-lg transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-10">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Available Quantity</label>
                                <input
                                    type="number" required
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#5ba409] px-6 py-5 rounded-2xl font-black text-lg transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Harvest Date</label>
                                <input
                                    type="date" required
                                    value={formData.harvest_date}
                                    onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#5ba409] px-6 py-5 rounded-2xl font-black text-lg transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Description</label>
                            <textarea
                                rows={4}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#5ba409] px-8 py-6 rounded-[2rem] font-medium text-lg transition-all outline-none resize-none"
                            />
                        </div>

                        <div className="flex gap-6">
                            <button
                                type="submit" disabled={loading}
                                className="flex-[2] bg-[#5ba409] hover:bg-[#4d8f08] text-white py-6 rounded-3xl font-black text-xl transition-all shadow-xl flex items-center justify-center gap-3"
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Save Changes"}
                            </button>
                            <button
                                type="button" onClick={() => navigate(-1)}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 py-6 rounded-3xl font-black text-lg transition-all"
                            >
                                Discard
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditProductPage;
