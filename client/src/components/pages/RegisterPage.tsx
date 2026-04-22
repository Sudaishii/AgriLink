import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, CheckCircle, ShoppingCart, Sprout, AlertCircle, ShieldCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { RegisterFormData } from '../../types';
import { API_BASE_URL } from '../../api/apiConfig';
import { useToast } from '../ui/Toast';

interface RegisterPageProps {
  onLogin: (role: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: queryParams.get('email') || '',
    password: '',
    confirmPassword: '',
    userType: (queryParams.get('role') as any) || 'buyer',
    agreeToTerms: false,
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});
  const [isEmailAvailable, setIsEmailAvailable] = useState<boolean | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState<boolean>(false);
  const [activeLegalModal, setActiveLegalModal] = useState<'terms' | 'privacy' | null>(null);

  useEffect(() => {
    const role = queryParams.get('role');
    const brgy = queryParams.get('brgy');
    const email = queryParams.get('email');
    
    if (role === 'brgy_official' && brgy) {
      setFormData(prev => ({
        ...prev,
        firstName: 'Barangay',
        lastName: brgy,
        userType: 'brgy_official',
        email: email || prev.email
      }));
    }
  }, [queryParams]);

  useEffect(() => {
    const checkEmail = async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!formData.email) {
        setIsEmailAvailable(null);
        setErrors(prev => {
          const { email, ...rest } = prev as any;
          return rest;
        });
        return;
      }

      if (!emailRegex.test(formData.email)) {
        setIsEmailAvailable(null);
        setErrors(prev => ({ ...prev, email: 'Please input a valid email format' } as any));
        return;
      }

      setIsCheckingEmail(true);
      try {
        const response = await fetch(`${API_BASE_URL}/auth/check-email?email=${encodeURIComponent(formData.email)}`);
        const data = await response.json();
        if (response.ok) {
          setIsEmailAvailable(!data.exists);
          if (data.exists) {
            setErrors(prev => ({ ...prev, email: 'Email already registered' } as any));
          } else {
            setErrors(prev => {
              const { email, ...rest } = prev as any;
              return rest;
            });
          }
        }
      } catch (err) {
        console.error('Email check failed:', err);
      } finally {
        setIsCheckingEmail(false);
      }
    };

    const timer = setTimeout(checkEmail, 500);
    return () => clearTimeout(timer);
  }, [formData.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1️⃣ Local validation
    const newErrors: Partial<RegisterFormData> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.firstName) newErrors.firstName = 'First name is required' as any;
    if (!formData.lastName) newErrors.lastName = 'Last name is required' as any;
    if (!formData.email) newErrors.email = 'Email is required' as any;
    if (formData.email && !emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please input a valid email format' as any;
    }
    if (!formData.password) newErrors.password = 'Password is required' as any;
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters' as any;
    }
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password' as any;
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match' as any;
    if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms' as any;
    if (isEmailAvailable === false) newErrors.email = 'Email already registered' as any;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }


    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role_name: formData.userType,
          ...(formData.userType === 'brgy_official' ? {
            city: 'Minglanilla',
            province: 'Cebu',
          } : {}),
        }),
      });


      const data = await response.json();

      if (!response.ok) {
        const rawMessage = data?.message || 'Registration failed';
        const lower = String(rawMessage).toLowerCase();
        toast.error(rawMessage);

        if (lower.includes('password')) {
          setErrors({ password: rawMessage } as any);
        } else if (lower.includes('email')) {
          setErrors({ email: rawMessage } as any);
        } else {
          setErrors({ email: rawMessage } as any);
        }
        return;
      }

      toast.success('Registration successful! Please check your email for confirmation.');

      // 2️⃣ Redirect to login as requested (removed auto-login)
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      toast.error('Service temporarily unavailable. Please check your connection and try again.');
      setErrors({ email: 'Service temporarily unavailable. Please try again later.' } as any);
    }

  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FBE7] via-white to-[#E8F5E9] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#5ba409] rounded-full opacity-5 blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#FFC107] rounded-full opacity-5 blur-3xl animate-float-delayed"></div>
      </div>

      <div className="relative w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:block space-y-8 animate-slideInLeft">
          <img
            src="/src/assets/logo/AgriLinkGREEN.png"
            alt="AgriLink Logo"
            className="w-56 h-56 object-contain"
          />
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-gray-900 leading-tight">
              Join Our
              <span className="block text-[#5ba409] mt-2">Community</span>
            </h2>
            <p className="text-xl text-gray-600">
              Create your account and start connecting with local farmers for fresh, sustainable produce.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-green-100">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <CheckCircle className="w-6 h-6 text-[#5ba409]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Direct Sourcing</h3>
                  <p className="text-sm text-gray-600">Buy directly from local farmers</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-green-100">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <CheckCircle className="w-6 h-6 text-[#5ba409]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Fresh Produce</h3>
                  <p className="text-sm text-gray-600">Get the freshest products daily</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-green-100">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <CheckCircle className="w-6 h-6 text-[#5ba409]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Support Local</h3>
                  <p className="text-sm text-gray-600">Help your local community thrive</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="animate-slideInRight">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border-2 border-gray-100">
            <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
              <img
                src="/src/assets/logo/AgriLinkGREEN.png"
                alt="AgriLink Logo"
                className="w-48 h-48 object-contain"
              />
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
              <p className="text-gray-600">Join our community today</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {formData.userType === 'brgy_official' ? (
                <div className="bg-green-50 border-2 border-green-100 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#5ba409] shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Official Account</h4>
                    <p className="text-xs font-bold text-[#5ba409] uppercase tracking-widest">{formData.firstName} {formData.lastName}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => {
                          setFormData({ ...formData, firstName: e.target.value });
                          if (errors.firstName) setErrors(prev => ({ ...prev, firstName: undefined }));
                        }}
                        className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none font-semibold transition-colors ${errors.firstName ? 'border-red-500' : 'border-gray-200 focus:border-[#5ba409]'
                          }`}
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-red-500 text-[10px] mt-1 font-bold italic">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => {
                          setFormData({ ...formData, lastName: e.target.value });
                          if (errors.lastName) setErrors(prev => ({ ...prev, lastName: undefined }));
                        }}
                        className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none font-semibold transition-colors ${errors.lastName ? 'border-red-500' : 'border-gray-200 focus:border-[#5ba409]'
                          }`}
                      />
                    </div>
                    {errors.lastName && (
                      <p className="text-red-500 text-[10px] mt-1 font-bold italic">{errors.lastName}</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    className={`w-full pl-12 pr-10 py-3 border-2 rounded-xl focus:outline-none font-semibold transition-colors ${errors.email ? 'border-red-500' : isEmailAvailable === true ? 'border-[#5ba409]' : 'border-gray-200 focus:border-[#5ba409]'
                      }`}
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center">
                    {isCheckingEmail && <div className="w-4 h-4 border-2 border-[#5ba409] border-t-transparent rounded-full animate-spin"></div>}
                    {!isCheckingEmail && isEmailAvailable === true && <CheckCircle className="w-5 h-5 text-[#5ba409]" />}
                    {!isCheckingEmail && (isEmailAvailable === false || errors.email) && <AlertCircle className="w-5 h-5 text-red-500" />}
                  </div>
                </div>
                {errors.email && <p className="text-red-500 text-sm mt-1 font-semibold">{errors.email}</p>}
              </div>

              {formData.userType !== 'brgy_official' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-4">I want to join as a...</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, userType: 'buyer' })}
                      className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left group ${formData.userType === 'buyer'
                        ? 'border-[#5ba409] bg-green-50/50 shadow-lg shadow-green-900/5'
                        : 'border-gray-100 bg-gray-50/50 hover:border-green-200 hover:bg-white'
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${formData.userType === 'buyer' ? 'bg-[#5ba409] text-white' : 'bg-white text-gray-400 group-hover:text-[#5ba409]'
                        }`}>
                        <ShoppingCart className="w-6 h-6" />
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${formData.userType === 'buyer' ? 'text-gray-900' : 'text-gray-500'}`}>Buyer</p>
                        <p className="text-[10px] font-medium text-gray-400">Order fresh produce</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, userType: 'farmer' })}
                      className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left group ${formData.userType === 'farmer'
                        ? 'border-[#5ba409] bg-green-50/50 shadow-lg shadow-green-900/5'
                        : 'border-gray-100 bg-gray-50/50 hover:border-green-200 hover:bg-white'
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${formData.userType === 'farmer' ? 'bg-[#5ba409] text-white' : 'bg-white text-gray-400 group-hover:text-[#5ba409]'
                        }`}>
                        <Sprout className="w-6 h-6" />
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${formData.userType === 'farmer' ? 'text-gray-900' : 'text-gray-500'}`}>Farmer</p>
                        <p className="text-[10px] font-medium text-gray-400">Sell your crops</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, password: val });
                      
                      if (val && val.length < 8) {
                        setErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters' }));
                      } else {
                        setErrors(prev => ({ ...prev, password: undefined }));
                      }
                    }}
                    className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none font-semibold transition-colors ${errors.password ? 'border-red-500' : 'border-gray-200 focus:border-[#5ba409]'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1 font-semibold">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                      if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none font-semibold transition-colors ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200 focus:border-[#5ba409]'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5 cursor-pointer" /> : <Eye className="w-5 h-5 cursor-pointer" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1 font-semibold">{errors.confirmPassword}</p>}
              </div>

              <div className="flex items-start space-x-3 group cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-gray-200 text-[#5ba409] focus:ring-[#5ba409] accent-[#5ba409] cursor-pointer transition-all mt-0.5"
                />
                <label className="text-sm text-gray-600 font-medium leading-relaxed cursor-pointer group-hover:text-gray-900 transition-colors">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveLegalModal('terms');
                    }}
                    className="font-bold text-[#5ba409] hover:underline cursor-pointer"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveLegalModal('privacy');
                    }}
                    className="font-bold text-[#5ba409] hover:underline cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>
              {errors.agreeToTerms && <p className="text-red-500 text-sm font-semibold">{errors.agreeToTerms}</p>}

              <button
                type="submit"
                className="w-full bg-[#5ba409] hover:bg-[#4d8f08] text-white py-3 rounded-xl font-bold text-base shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2"
              >
                <span>Create Account</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="font-bold text-[#5ba409] hover:text-[#4d8f08] cursor-pointer transition-colors"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {activeLegalModal && (
        <div
          className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveLegalModal(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white border border-[#d9e8c8] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-black text-slate-900">
                {activeLegalModal === 'terms' ? 'Terms & Agreement' : 'Privacy Policy'}
              </h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#5ba409]">AgriLink Legal</p>
            </div>

            <div className="px-6 py-5 space-y-4 text-sm text-slate-700 leading-relaxed">
              {activeLegalModal === 'terms' ? (
                <>
                  <p>
                    By creating an account and using AgriLink, you agree to provide accurate information and use the
                    system responsibly. Farmers must ensure that all crop listings are truthful, while buyers must
                    conduct transactions in good faith. All accounts and listings are subject to verification by
                    barangay officials.
                  </p>
                  <p>
                    AgriLink only serves as a platform connecting farmers and buyers and is not responsible for
                    transaction outcomes. Any misuse, fraudulent activity, or unauthorized access may result in account
                    suspension or removal.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    AgriLink collects basic personal and crop information to manage your account, support
                    transactions, and verify listings. Your data is kept secure and will only be accessed by
                    authorized personnel, such as barangay officials for verification purposes.
                  </p>
                  <p>
                    We do not share your information with third parties without your consent, unless required by law.
                    By using the system, you agree to the collection and use of your data as described.
                  </p>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="px-5 py-2 rounded-xl bg-[#5ba409] text-white text-xs font-black uppercase tracking-[0.14em] hover:bg-[#4d8f08] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
