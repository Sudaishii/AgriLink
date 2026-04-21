import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import MapBoxMap, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
  User, 
  Phone, 
  MapPin, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  ShoppingBag,
  Sprout,
  Heart
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { API_BASE_URL } from '../../api/apiConfig';

const mapStyle = 'mapbox://styles/mapbox/streets-v11';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userType: string;
  onComplete: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, userId, userName, userType, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const isFarmer = userType.toLowerCase() === 'farmer';

  const [formData, setFormData] = useState({
    phone: '',
    address: '', // This will store Barangay/Landmark
    city: 'Minglanilla',
    province: 'Cebu',
    zip_code: '6046',
    latitude: 10.245,
    longitude: 123.792,
    interests: [] as string[],
    // Farm fields
    farm_address: '',
    farm_city: 'Minglanilla',
    farm_province: 'Cebu',
    farm_zip_code: '6046',
    farm_latitude: 10.245,
    farm_longitude: 123.792,
    farm_address_same_as_home: true
  });

  const [viewState, setViewState] = useState({
    longitude: 123.792,
    latitude: 10.245,
    zoom: 13
  });

  const [farmViewState, setFarmViewState] = useState({
    longitude: 123.792,
    latitude: 10.245,
    zoom: 13
  });

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('agrilink_token');
      if (!token) {
        toast.error('Session expired. Please sign in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/${userId}/onboarding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          province: formData.province,
          zip_code: formData.zip_code,
          latitude: formData.latitude,
          longitude: formData.longitude,
          // Farm fields
          farm_address: formData.farm_address_same_as_home ? formData.address : formData.farm_address,
          farm_city: formData.farm_city,
          farm_province: formData.farm_province,
          farm_zip_code: formData.farm_zip_code,
          farm_latitude: formData.farm_address_same_as_home ? formData.latitude : formData.farm_latitude,
          farm_longitude: formData.farm_address_same_as_home ? formData.longitude : formData.farm_longitude,
          farm_address_same_as_home: formData.farm_address_same_as_home
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to update onboarding info');
      }

      localStorage.setItem('agrilink_onboarding_completed', '1');
      window.dispatchEvent(new Event('agrilink-onboarding-completed'));
      toast.success('Onboarding completed! Welcome to AgriLink!');
      onComplete();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 🚜 Auto-Sync coordinates if same as home
  useEffect(() => {
    if (formData.farm_address_same_as_home) {
      setFormData(prev => ({
        ...prev,
        farm_latitude: prev.latitude,
        farm_longitude: prev.longitude,
        farm_address: prev.address
      }));
      setFarmViewState(prev => ({
        ...prev,
        latitude: viewState.latitude,
        longitude: viewState.longitude
      }));
    }
  }, [formData.farm_address_same_as_home, formData.latitude, formData.longitude, formData.address, viewState.latitude, viewState.longitude]);

  const buyerSteps = [
    { title: 'Welcome', icon: <User className="w-6 h-6" /> },
    { title: 'Contact', icon: <Phone className="w-6 h-6" /> },
    { title: 'Location', icon: <MapPin className="w-6 h-6" /> },
    { title: 'Ready!', icon: <CheckCircle className="w-6 h-6" /> }
  ];

  const farmerSteps = [
    { title: 'Welcome', icon: <User className="w-6 h-6" /> },
    { title: 'Personal', icon: <Phone className="w-6 h-6" /> },
    { title: 'Home', icon: <MapPin className="w-6 h-6" /> },
    { title: 'Farm Setup', icon: <Sprout className="w-6 h-6" /> },
    { title: 'Finalize', icon: <CheckCircle className="w-6 h-6" /> }
  ];

  const steps = isFarmer ? farmerSteps : buyerSteps;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} 
      title=""
      size="3xl"
    >
      <div className="py-4 font-sans">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0"></div>
          <div 
            className="absolute top-1/2 left-0 h-1 bg-[#5ba409] -translate-y-1/2 z-0 transition-all duration-500" 
            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
          ></div>
          
          {steps.map((s, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                  step > i + 1 ? 'bg-green-600 text-white' : 
                  step === i + 1 ? 'bg-green-600 text-white ring-4 ring-green-100' : 
                  'bg-white border-2 border-gray-200 text-gray-400'
                }`}
              >
                {step > i + 1 ? <CheckCircle className="w-6 h-6" /> : s.icon}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest mt-2 ${
                step >= i + 1 ? 'text-green-600' : 'text-gray-400'
              }`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {step === 1 && (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sprout className="w-12 h-12 text-[#5ba409]" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 leading-tight">
                Mabuhay, {userName}! 🌱
              </h2>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                {isFarmer 
                  ? "Welcome to the AgriLink Merchant Portal. Let's get your farm profile ready for Minglanilla buyers."
                  : "Welcome to AgriLink. Support Minglanilla farmers and get the freshest local produce."}
              </p>
              <div className="bg-[#F9FBE7] p-6 rounded-3xl border border-green-100 italic font-bold text-green-700">
                Community Focus: We connect you with fresh local harvests from Minglanilla and nearby farmers.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-4">
                <h2 className="text-2xl font-black text-gray-900">Basic Information</h2>
                <p className="text-gray-500">Please provide your contact details.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      placeholder="09XX XXX XXXX"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-[#5ba409] rounded-2xl outline-none font-bold transition-all"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ZIP Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 6046"
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-[#5ba409] rounded-2xl outline-none font-bold transition-all"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City / Municipality</label>
                  <input
                    type="text"
                    placeholder="e.g. Minglanilla"
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-[#5ba409] rounded-2xl outline-none font-bold transition-all"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Province</label>
                  <input
                    type="text"
                    placeholder="e.g. Cebu"
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-[#5ba409] rounded-2xl outline-none font-bold transition-all"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-4">
                <h2 className="text-2xl font-black text-gray-900">Home Location</h2>
                <p className="text-gray-500">Enter your Barangay and pin your exact location below.</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                  <textarea
                    placeholder="Barangay & Landmark (e.g., Brgy. Ward 1, Near Church)"
                    rows={2}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-[#5ba409] rounded-2xl outline-none font-bold transition-all resize-none"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="w-full h-[250px] rounded-3xl overflow-hidden border-2 border-gray-100 relative group">
                  <MapBoxMap
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    mapStyle={mapStyle}
                    mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN || ''}
                    style={{width: '100%', height: '100%'}}
                    onClick={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        latitude: e.lngLat.lat,
                        longitude: e.lngLat.lng,
                      }));
                    }}
                  >
                    <Marker longitude={formData.longitude} latitude={formData.latitude} anchor="bottom">
                      <div className="text-[#5ba409] drop-shadow-lg">
                        <MapPin className="w-8 h-8 fill-white" />
                      </div>
                    </Marker>
                  </MapBoxMap>
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm text-[9px] font-black text-[#5ba409] uppercase tracking-widest border border-green-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click map to pin location
                  </div>
                </div>
              </div>
            </div>
          )}

          {isFarmer && step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-4">
                <h2 className="text-2xl font-black text-gray-900">Farm Location Setup</h2>
                <p className="text-gray-500">Where are your crops located?</p>
              </div>

              <div className="space-y-6">
                <label className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl border-2 border-green-100 cursor-pointer transition-all hover:bg-green-100/50 group">
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    formData.farm_address_same_as_home ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'
                  }`}>
                    {formData.farm_address_same_as_home && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.farm_address_same_as_home}
                    onChange={(e) => setFormData({ ...formData, farm_address_same_as_home: e.target.checked })}
                  />
                  <span className="font-black text-xs uppercase tracking-widest text-[#5ba409]">Farm is at the same location as my home</span>
                </label>

                {!formData.farm_address_same_as_home && (
                  <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="relative">
                      <MapPin className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                      <textarea
                        placeholder="Farm Barangay & Landmark"
                        rows={2}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-[#5ba409] rounded-2xl outline-none font-bold transition-all resize-none text-sm"
                        value={formData.farm_address}
                        onChange={(e) => setFormData({ ...formData, farm_address: e.target.value })}
                      />
                    </div>

                    <div className="w-full h-[200px] rounded-3xl overflow-hidden border-2 border-gray-100 relative group">
                      <MapBoxMap
                        {...farmViewState}
                        onMove={evt => setFarmViewState(evt.viewState)}
                        mapStyle={mapStyle}
                        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN || ''}
                        style={{width: '100%', height: '100%'}}
                        onClick={(e) => {
                          if (formData.farm_address_same_as_home) return;
                          setFormData(prev => ({
                            ...prev,
                            farm_latitude: e.lngLat.lat,
                            farm_longitude: e.lngLat.lng,
                          }));
                        }}
                      >
                        <Marker longitude={formData.farm_longitude} latitude={formData.farm_latitude} anchor="bottom">
                          <div className="text-orange-600 drop-shadow-lg">
                            <MapPin className="w-8 h-8 fill-white" />
                          </div>
                        </Marker>
                      </MapBoxMap>
                    </div>
                  </div>
                )}

                {formData.farm_address_same_as_home && (
                  <div className="p-10 bg-green-50/30 border-2 border-dashed border-green-100 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                      <MapPin className="w-7 h-7 text-green-600" />
                    </div>
                    <p className="font-black text-gray-900 uppercase italic tracking-tighter">Mapped to Home Base</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{formData.address || 'Location set via map pin'}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {((!isFarmer && step === 4) || (isFarmer && step === 5)) && (
            <div className="text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
               <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-12 h-12 text-[#5ba409] animate-bounce" />
                </div>
              
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-2">Setup Complete!</h2>
                <p className="text-gray-600 text-lg">
                  You're now part of the AgriLink community.
                </p>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 mt-8 text-left space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
                     <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</p>
                    <p className="font-bold text-gray-900">{userName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
                     <MapPin className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Location</p>
                    <p className="font-bold text-gray-900">{formData.address}, {formData.city}, {formData.province}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-4 mt-12">
          {step > 1 && step < steps.length && (
            <button
              onClick={handleBack}
              disabled={loading}
              className="px-8 py-5 bg-white text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2 border border-gray-100"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          
          {step < steps.length ? (
            <button
              onClick={handleNext}
              className="flex-1 py-5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-5 bg-[#5ba409] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-500/20 hover:bg-[#4d8f08] transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Finalizing Profile...' : 'Complete Registration'} 
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OnboardingModal;
