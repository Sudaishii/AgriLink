import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../../api/apiConfig';
import { useToast } from '../ui/Toast';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return toast.error('Please enter your email.');

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (res.ok) {
                setSent(true);
            } else {
                const data = await res.json();
                toast.error(data.message || 'Error processing request.');
            }
        } catch {
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center px-6 py-12">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-[#5ba409] p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                    <img src="/src/assets/logo/AgriLinkWHITE.png" alt="AgriLink" className="h-16 mx-auto relative z-10" />
                </div>

                <div className="p-8">
                    {!sent ? (
                        <>
                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Forgot Password?</h2>
                                <p className="text-gray-500 text-sm mt-1">Enter your email and we'll send you a link to reset your password.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5ba409] transition-colors" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-[#5ba409] focus:ring-4 focus:ring-[#5ba409]/10 outline-none transition-all placeholder:text-gray-300"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#5ba409] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#5ba409]/20 hover:bg-[#4a8c07] hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">Check your email</h2>
                            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                We've sent a password reset link to <span className="font-bold text-gray-700">{email}</span>. Please check your inbox and follow the instructions.
                            </p>
                            <button
                                onClick={() => setSent(false)}
                                className="text-[#5ba409] font-bold text-sm hover:underline"
                            >
                                Didn't receive the email? Try again
                            </button>
                        </div>
                    )}

                    <div className="mt-8 pt-8 border-t border-gray-50">
                        <Link
                            to="/login"
                            className="flex items-center justify-center gap-2 text-gray-500 font-bold text-sm hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft size={16} /> Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
