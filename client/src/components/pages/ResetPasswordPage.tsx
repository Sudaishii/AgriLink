import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../../api/apiConfig';
import { useToast } from '../ui/Toast';

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token) return toast.error('Reset token is missing.');
        if (newPassword.length < 8) return toast.error('Password must be at least 8 characters.');
        if (newPassword !== confirmPassword) return toast.error('Passwords do not match.');

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }),
            });

            if (res.ok) {
                setSuccess(true);
                toast.success('Password updated successfully!');
            } else {
                const data = await res.json();
                toast.error(data.message || 'Reset link may be invalid or expired.');
            }
        } catch {
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl">
                    <img src="/src/assets/logo/AgriLinkGREEN.png" alt="AgriLink" className="h-12 mx-auto mb-6" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
                    <p className="text-gray-500 mb-6">This password reset link is missing or malformed.</p>
                    <Link to="/login" className="inline-block bg-[#5ba409] text-white px-8 py-3 rounded-xl font-bold">Back to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center px-6 py-12">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-[#5ba409] p-8 text-center relative">
                     <img src="/src/assets/logo/AgriLinkWHITE.png" alt="AgriLink" className="h-16 mx-auto relative z-10" />
                </div>

                <div className="p-8">
                    {!success ? (
                        <>
                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Set New Password</h2>
                                <p className="text-gray-500 text-sm mt-1">Please enter your new secure password below.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* New Password */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1">New Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5ba409] transition-colors" />
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-[#5ba409] focus:ring-4 focus:ring-[#5ba409]/10 outline-none transition-all"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowPass(!showPass)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1">Confirm New Password</label>
                                    <div className="relative group">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5ba409] transition-colors" />
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-[#5ba409] focus:ring-4 focus:ring-[#5ba409]/10 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#5ba409] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#5ba409]/20 hover:bg-[#4a8c07] hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Update Password'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">Success!</h2>
                            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                Your password has been updated. You can now use your new password to sign in to your account.
                            </p>
                            <Link
                                to="/login"
                                className="w-full inline-block bg-[#5ba409] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#5ba409]/20 hover:bg-[#4a8c07] hover:-translate-y-1 transition-all flex items-center justify-center"
                            >
                                Continue to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
