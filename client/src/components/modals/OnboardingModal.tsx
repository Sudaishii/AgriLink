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
const CEBU_PROVINCE = 'Cebu';
const CEBU_MUNICIPALITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  alcantara: { latitude: 9.9773, longitude: 123.4099 },
  alcoy: { latitude: 9.7248, longitude: 123.4891 },
  alegria: { latitude: 9.7369, longitude: 123.3390 },
  aloguinsan: { latitude: 10.2207, longitude: 123.5488 },
  argao: { latitude: 9.8794, longitude: 123.6023 },
  asturias: { latitude: 10.5749, longitude: 123.7206 },
  badian: { latitude: 9.8696, longitude: 123.3955 },
  balamban: { latitude: 10.5030, longitude: 123.7156 },
  bantayan: { latitude: 11.1714, longitude: 123.7229 },
  barili: { latitude: 10.1151, longitude: 123.5103 },
  boljoon: { latitude: 9.6290, longitude: 123.4769 },
  carcar: { latitude: 10.1068, longitude: 123.6405 },
  cebu: { latitude: 10.3157, longitude: 123.8854 },
  cityofcebu: { latitude: 10.3157, longitude: 123.8854 },
  'cebu city': { latitude: 10.3157, longitude: 123.8854 },
  compostela: { latitude: 10.4550, longitude: 124.0106 },
  consolacion: { latitude: 10.3713, longitude: 123.9552 },
  cordova: { latitude: 10.2518, longitude: 123.9497 },
  dalaguete: { latitude: 9.7620, longitude: 123.5346 },
  danao: { latitude: 10.5208, longitude: 124.0273 },
  'danao city': { latitude: 10.5208, longitude: 124.0273 },
  dumanjug: { latitude: 10.0560, longitude: 123.4361 },
  gato: { latitude: 10.9999, longitude: 123.7000 },
  liloan: { latitude: 10.3990, longitude: 123.9997 },
  madredejos: { latitude: 11.0590, longitude: 123.7560 },
  malabuyoc: { latitude: 9.6528, longitude: 123.3252 },
  mandaue: { latitude: 10.3231, longitude: 123.9411 },
  'mandaue city': { latitude: 10.3231, longitude: 123.9411 },
  medellin: { latitude: 11.1286, longitude: 124.0061 },
  minglanilla: { latitude: 10.2442, longitude: 123.7965 },
  moalboal: { latitude: 9.9439, longitude: 123.3990 },
  naga: { latitude: 10.2098, longitude: 123.7586 },
  'naga city': { latitude: 10.2098, longitude: 123.7586 },
  oslob: { latitude: 9.5208, longitude: 123.4318 },
  pilar: { latitude: 10.9838, longitude: 124.0013 },
  pinamungajan: { latitude: 10.2700, longitude: 123.5835 },
  poro: { latitude: 10.6296, longitude: 124.4053 },
  ronda: { latitude: 9.9980, longitude: 123.4017 },
  samar: { latitude: 10.7264, longitude: 124.0040 },
  'san fernando': { latitude: 10.1622, longitude: 123.7070 },
  'san francisco': { latitude: 10.6465, longitude: 124.3818 },
  'san remigio': { latitude: 11.0848, longitude: 123.9398 },
  'santa fe': { latitude: 11.1688, longitude: 123.8051 },
  santander: { latitude: 9.4272, longitude: 123.3332 },
  sibonga: { latitude: 10.0282, longitude: 123.6164 },
  sogod: { latitude: 10.9800, longitude: 123.9952 },
  tabogon: { latitude: 10.9368, longitude: 124.0352 },
  tabuelan: { latitude: 10.8201, longitude: 123.8681 },
  talisay: { latitude: 10.2450, longitude: 123.8493 },
  'talisay city': { latitude: 10.2450, longitude: 123.8493 },
  toledo: { latitude: 10.3771, longitude: 123.6380 },
  'toledo city': { latitude: 10.3771, longitude: 123.6380 },
  tuburan: { latitude: 10.7260, longitude: 123.8259 },
  tudela: { latitude: 10.6114, longitude: 124.4736 },
};

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
  const defaultCity = isFarmer ? 'Minglanilla' : '';
  const defaultProvince = CEBU_PROVINCE;
  const defaultZipCode = isFarmer ? '6046' : '';

  const [formData, setFormData] = useState({
    phone: '',
    address: '', // This will store Barangay/Landmark
    city: defaultCity,
    province: defaultProvince,
    zip_code: defaultZipCode,
    latitude: 10.245,
    longitude: 123.792,
    interests: [] as string[],
    // Farm fields
    farm_address: '',
    farm_city: defaultCity,
    farm_province: defaultProvince,
    farm_zip_code: defaultZipCode,
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

  const handleNext = () => {
    if (step === 2) {
      const digitsOnlyPhone = formData.phone.replace(/\D/g, '');
      if (digitsOnlyPhone.length !== 11) {
        toast.error('Mobile number must be exactly 11 digits.');
        return;
      }
      if (!formData.zip_code.trim()) {
        toast.error('ZIP code is required.');
        return;
      }
      if (!formData.city.trim()) {
        toast.error('City / Municipality is required.');
        return;
      }
    }
    setStep(prev => prev + 1);
  };
  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    const digitsOnlyPhone = formData.phone.replace(/\D/g, '');
    if (digitsOnlyPhone.length !== 11) {
      toast.error('Mobile number must be exactly 11 digits.');
      return;
    }

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
          phone: digitsOnlyPhone,
          address: formData.address,
          city: formData.city,
          province: CEBU_PROVINCE,
          zip_code: formData.zip_code,
          latitude: formData.latitude,
          longitude: formData.longitude,
          // Farm fields
          farm_address: formData.farm_address_same_as_home ? formData.address : formData.farm_address,
          farm_city: formData.farm_city,
          farm_province: CEBU_PROVINCE,
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
    if (formData.province !== CEBU_PROVINCE || formData.farm_province !== CEBU_PROVINCE) {
      setFormData(prev => ({
        ...prev,
        province: CEBU_PROVINCE,
        farm_province: CEBU_PROVINCE
      }));
    }
  }, [formData.province, formData.farm_province]);

  // Re-center home pin map based on entered city/municipality
  useEffect(() => {
    const rawCity = formData.city.trim().toLowerCase();
    if (!rawCity) return;
    const cityKey = rawCity.replace(/\s+/g, '');
    const localMatch = CEBU_MUNICIPALITY_COORDS[rawCity] || CEBU_MUNICIPALITY_COORDS[cityKey];

    if (localMatch) {
      setViewState(prev => ({ ...prev, latitude: localMatch.latitude, longitude: localMatch.longitude, zoom: 13 }));
      setFormData(prev => ({ ...prev, latitude: localMatch.latitude, longitude: localMatch.longitude }));
      return;
    }

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const loadMunicipalityCenter = async () => {
      try {
        const query = encodeURIComponent(`${formData.city}, Cebu, Philippines`);
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?limit=1&access_token=${token}`,
          { signal: controller.signal }
        );
        if (!response.ok) return;
        const data = await response.json();
        const [lng, lat] = data?.features?.[0]?.center || [];
        if (typeof lat === 'number' && typeof lng === 'number') {
          setViewState(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 13 }));
          setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
        }
      } catch {
        // fallback: keep current center
      } finally {
        clearTimeout(timeout);
      }
    };

    void loadMunicipalityCenter();
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [formData.city]);

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
                      maxLength={11}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setFormData({ ...formData, phone: digitsOnly });
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ZIP Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 6046"
                    disabled={isFarmer}
                    className={`w-full px-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none font-bold transition-all ${
                      isFarmer ? 'text-gray-500 cursor-not-allowed' : 'focus:border-[#5ba409]'
                    }`}
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City / Municipality</label>
                  <input
                    type="text"
                    placeholder="e.g. Minglanilla"
                    disabled={isFarmer}
                    className={`w-full px-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none font-bold transition-all ${
                      isFarmer ? 'text-gray-500 cursor-not-allowed' : 'focus:border-[#5ba409]'
                    }`}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Province</label>
                  <input
                    type="text"
                    disabled
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none font-bold transition-all text-gray-500 cursor-not-allowed"
                    value={formData.province}
                    onChange={() => {}}
                  />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#5ba409]">
                Province is fixed to Cebu.
              </p>
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
