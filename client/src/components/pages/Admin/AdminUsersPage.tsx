import React, { useState, useEffect } from 'react';
import { Search, Filter, ShieldCheck, Mail, MapPin, User, Shield, Users as UsersIcon, ChevronRight, Activity, Globe, MoreVertical, Ban, Archive, UserPlus, Link, Copy, Check, Info, Trash2, RotateCcw } from 'lucide-react';
import DashboardCard from '../../ui/DashboardCard';
import Modal from '../../ui/Modal';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { API_BASE_URL, getStoredAuthToken, getFullImageUrl } from '../../../api/apiConfig';
import { useToast } from '../../ui/Toast';

interface ExternalUser {
  id: string | number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  type: string;
  location: string;
  status: string;
  profile_image?: string;
}

const BRGY_LIST = [
    "Tulay", "Tunghaan", "Tungkop", "Tungkil", "Vito", "Ward I", "Ward II", "Ward III", "Ward IV",
    "Cajel", "Calajoan", "Camp 8", "Cuanos", "Dakutan", "Guindaruhan", "Lipata", "Manduang",
    "Pakigne", "Poblacion Ward I", "Poblacion Ward II", "Poblacion Ward III", "Poblacion Ward IV"
];

interface AdminUsersPageProps {
  viewerRole?: string;
}

const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ viewerRole }) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [usersList, setUsersList] = useState<ExternalUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // Default to active users
  
  // Registration States
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regType, setRegType] = useState<'farmer' | 'buyer' | 'brgy_official' | null>(null);
  const [regForm, setRegForm] = useState({ firstName: '', lastName: '', email: '', password: '', city: 'Minglanilla', province: 'Cebu' });
  const [brgyOfficialBrgy, setBrgyOfficialBrgy] = useState(BRGY_LIST[0]);
  const [magicLink, setMagicLink] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Status Action States
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; userId: string | number; action: 'suspend' | 'delete' | 'restore'; name: string } | null>(null);
  
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${getStoredAuthToken()}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        const nonAdmins = (data || []).filter((u: any) => String(u.type || '').toLowerCase() !== 'admin');
        setUsersList(nonAdmins);
      } else {
        const errData = await resp.json().catch(() => ({}));
        console.error('[AdminUsers] Fetch failed:', resp.status, errData);
        toast.error(`Failed to load users: ${errData.message || resp.statusText}`);
      }
    } catch (err) {
      console.error('[AdminUsers] Network error:', err);
      toast.error('Network error. Is the server running?');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter ? u.type.toLowerCase() === roleFilter.toLowerCase() : true;
    const matchesStatus = statusFilter === 'all' ? true : u.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleUpdateStatus = async (userId: string | number, status: string) => {
      try {
          const res = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
              method: 'PUT',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${getStoredAuthToken()}` 
              },
              body: JSON.stringify({ status })
          });
          if (res.ok) {
              toast.success(`User successfully ${status === 'suspended' ? 'suspended' : status === 'deleted' ? 'deleted' : 'activated'}.`);
              fetchUsers();
          } else {
              toast.error('Failed to update user status.');
          }
      } catch (err) {
          toast.error('Network error updating status.');
      }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!regType) return;
      
      if (regType === 'brgy_official') {
          const magic = `${window.location.origin}/register?role=brgy_official&brgy=${encodeURIComponent(brgyOfficialBrgy)}${regForm.email ? `&email=${encodeURIComponent(regForm.email)}` : ''}`;
          setMagicLink(magic);
          toast.success('Registration link generated successfully.');
          return;
      }
      
      setIsRegistering(true);
      try {
          const roleName = regType;
          const payload = { ...regForm, role_name: roleName, city: regForm.city };
          
          const res = await fetch(`${API_BASE_URL}/auth/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          
          if (res.ok) {
              toast.success(`${regType.charAt(0).toUpperCase() + regType.slice(1)} account created.`);
              setIsRegModalOpen(false);
              fetchUsers();
          } else {
              const data = await res.json();
              toast.error(data.message || 'Registration failed');
          }
      } catch (err) {
          toast.error('Server error during registration.');
      } finally {
          setIsRegistering(false);
      }
  };

  const handleSendEmail = async () => {
    if (!regForm.email || !magicLink) {
        toast.error('Please specify an email address to use this feature.');
        return;
    }
    setIsSendingEmail(true);
    try {
        const res = await fetch(`${API_BASE_URL}/users/invite-official`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getStoredAuthToken()}`
            },
            body: JSON.stringify({
                email: regForm.email,
                brgy: brgyOfficialBrgy,
                magicLink
            })
        });
        if (res.ok) {
            toast.success('Invitation sent to ' + regForm.email);
        } else {
            const data = await res.json().catch(() => ({}));
            toast.error(data.message || 'Failed to send invitation email.');
        }
    } catch (err) {
        toast.error('Error sending invitation.');
    } finally {
        setIsSendingEmail(false);
    }
  };

  const totalFarmers = usersList.filter(u => String(u.type || '').toLowerCase() === 'farmer').length;
  const totalBuyers = usersList.filter(u => String(u.type || '').toLowerCase() === 'buyer').length;
  const totalBrgy = usersList.filter(u => ['barangay official', 'brgy_official', 'brgy official', 'lgu_official', 'lgu official'].includes(String(u.type || '').toLowerCase())).length;
  const totalUsers = usersList.length;
  const activeUsers = usersList.filter(u => String(u.status || '').toLowerCase() === 'active').length;

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
        {/* 🏙️ Comprehensive User Network Header */}
        <div className="bg-white border-b border-gray-100 py-10">
            <div className="max-w-[1600px] mx-auto px-6 sm:px-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-md bg-[#5ba409]/10 flex items-center justify-center text-[#5ba409]">
                            <ShieldCheck size={14} />
                        </div>
                        <span className="text-sm font-semibold text-[#5ba409]">User Management</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        User Directory
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">View and manage all registered members in the platform</p>
                </div>
                
                <div className="flex-1 max-w-xl w-full relative group">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search users by name, email, barangay, or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-3.5 bg-white border border-[#5ba409]/20 rounded-2xl text-sm font-medium transition-all outline-none placeholder:text-gray-300 shadow-sm focus:border-[#5ba409]/40 focus:shadow-green-900/5"
                        />
                        <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#5ba409] transition-colors" />
                    </div>
                </div>
            </div>
        </div>

        <main className="max-w-[1600px] mx-auto px-6 sm:px-10 py-10">
            {/* 📊 Network Distribution Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

                <DashboardCard
                    icon={User}
                    title="Farmers"
                    value={totalFarmers.toString()}
                    subtitle="Market Sellers"
                    color="#2E7D32"
                />
                <DashboardCard
                    icon={UsersIcon}
                    title="Buyers"
                    value={totalBuyers.toString()}
                    subtitle="Market Buyers"
                    color="#1976D2"
                />
                <DashboardCard
                    icon={Globe}
                    title="Officials"
                    value={totalBrgy.toString()}
                    subtitle="Local Authorities"
                    color="#F57C00"
                />
            </div>

            {/* 📋 Section: Participant Ledger */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-12">
                <div className="px-6 py-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                All Users <span className="bg-green-50 text-[#5ba409] px-2.5 py-0.5 rounded-md text-sm font-medium">{totalUsers} Total</span>
                            </h2>
                        </div>
                        <button 
                            onClick={() => { setIsRegModalOpen(true); setRegType('farmer'); setMagicLink(''); }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#5ba409] text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <UserPlus size={16} /> Add New Member
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <select 
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#5ba409]/20 transition-all cursor-pointer"
                        >
                            <option value="">All Roles</option>
                            <option value="Farmer">Farmers</option>
                            <option value="Buyer">Buyers</option>
                            <option value="Brgy_Official">Officials</option>
                        </select>
                    </div>
                </div>

                <div className="flex border-b border-gray-200 px-6 overflow-x-auto custom-scrollbar pt-2 gap-6">
                    {(['active', 'suspended', 'deleted'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setStatusFilter(tab)}
                            className={`pb-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                                statusFilter === tab
                                ? 'border-[#5ba409] text-[#5ba409]'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab === 'active' ? 'Active Accounts' : tab === 'suspended' ? 'Suspended Accounts' : 'Deleted Records'}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">Role</th>
                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500">Location</th>
                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">Status</th>
                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan={5} className="py-24 text-center text-sm font-medium text-gray-400 animate-pulse">Syncing user database...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={5} className="py-24 text-center text-sm font-medium text-gray-400">No users found</td></tr>
                            ) : filteredUsers.map((user) => (
                                <tr key={user.id} className="group hover:bg-gray-50 transition-colors duration-200">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 overflow-hidden shrink-0">
                                                {user.profile_image ? (
                                                    <img src={getFullImageUrl(user.profile_image)} alt={user.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    ['barangay official', 'brgy_official', 'brgy official'].includes(user.type.toLowerCase()) ? <ShieldCheck size={18} /> : user.name.charAt(0)
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {['barangay official', 'brgy_official', 'brgy official'].includes(user.type.toLowerCase()) 
                                                        ? `Barangay ${user.lastName || (user.name.toLowerCase().startsWith('barangay ') ? user.name.split(' ').slice(1).join(' ') : 'Official')} - Minglanilla` 
                                                        : (user.name && user.name.trim() ? user.name : 'Unnamed User')}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Mail size={12} className="text-gray-400" />
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                                            user.type.toLowerCase() === 'farmer' ? 'bg-green-50 text-green-700 border border-green-200' :
                                            user.type.toLowerCase() === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                            ['barangay official', 'brgy_official', 'brgy official'].includes(user.type.toLowerCase()) ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                            'bg-blue-50 text-blue-700 border border-blue-200'
                                        }`}>
                                            {user.type === 'brgy_official' ? 'Official' : user.type}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">{user.location}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${user.status.toLowerCase() === 'active' ? 'bg-[#5ba409]' : 'bg-red-500'}`} />
                                            <span className="text-sm font-medium text-gray-700 capitalize">
                                                {user.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {user.status.toLowerCase() === 'active' && (
                                                <>
                                                    <button 
                                                        onClick={() => setConfirmModal({ isOpen: true, userId: user.id, action: 'suspend', name: user.name })}
                                                        className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-amber-600 hover:border-amber-300 transition-colors shadow-sm"
                                                        title="Suspend Account"
                                                    >
                                                        <Ban size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfirmModal({ isOpen: true, userId: user.id, action: 'delete', name: user.name })}
                                                        className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors shadow-sm"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                            {user.status.toLowerCase() === 'suspended' && (
                                                <>
                                                    <button 
                                                        onClick={() => setConfirmModal({ isOpen: true, userId: user.id, action: 'restore', name: user.name })}
                                                        className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-[#5ba409] hover:border-[#5ba409] transition-colors shadow-sm"
                                                        title="Restore Account"
                                                    >
                                                        <RotateCcw size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfirmModal({ isOpen: true, userId: user.id, action: 'delete', name: user.name })}
                                                        className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors shadow-sm"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                            {user.status.toLowerCase() === 'deleted' && (
                                                <button 
                                                    onClick={() => setConfirmModal({ isOpen: true, userId: user.id, action: 'restore', name: user.name })}
                                                    className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-[#5ba409] hover:border-[#5ba409] transition-colors shadow-sm"
                                                    title="Restore Account"
                                                >
                                                    <RotateCcw size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>

        {/* 🔐 Admin Registration Modal */}
        <Modal isOpen={isRegModalOpen} onClose={() => setIsRegModalOpen(false)} maxWidth="max-w-2xl">
            <div className="p-2">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-[#5ba409]">
                        <UserPlus size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Add New Member</h2>
                        <p className="text-sm font-medium text-gray-500 mt-1">Platform User Registration</p>
                    </div>
                </div>

                <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100 mb-8">
                    {(['Farmer', 'Buyer', 'Barangay Official'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => { setRegType(type === 'Barangay Official' ? 'brgy_official' : type.toLowerCase() as any); setMagicLink(''); }}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                (regType === 'brgy_official' && type === 'Barangay Official') || (regType === type.toLowerCase())
                                ? 'bg-white shadow-sm text-[#5ba409] border border-green-50'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {magicLink ? (
                    <div className="bg-green-50/50 border border-green-100 rounded-[2rem] p-8 text-center animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#5ba409] mx-auto mb-6 shadow-sm">
                            <Link size={24} />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight mb-2">Access Link Generated</h3>
                        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">Share this link with the user to allow them to complete their account setup.</p>
                        
                        <div className="relative group max-w-md mx-auto">
                            <input 
                                readOnly 
                                value={magicLink} 
                                className="w-full pl-6 pr-14 py-4 bg-white border border-green-100 rounded-2xl text-xs font-mono text-gray-600 outline-none shadow-sm"
                            />
                            <button 
                                onClick={() => { navigator.clipboard.writeText(magicLink); toast.success('Link copied!'); }}
                                className="absolute right-2 top-2 p-2.5 bg-[#5ba409] text-white rounded-xl hover:bg-green-700 transition-all active:scale-90"
                            >
                                <Copy size={16} />
                            </button>
                        </div>
                        
                        <div className="flex items-center justify-center gap-4 mt-8">
                            {regForm.email && (
                                <button 
                                    onClick={handleSendEmail}
                                    disabled={isSendingEmail}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-[#5ba409] text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    <Mail size={16} /> {isSendingEmail ? 'Sending...' : 'Send via Email'}
                                </button>
                            )}
                            <button 
                                onClick={() => setIsRegModalOpen(false)}
                                className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-6">
                        {regType === 'brgy_official' ? (
                             <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 ml-2 mb-1 block uppercase tracking-wider">Assigned Barangay (Minglanilla)</label>
                                    <select 
                                        value={brgyOfficialBrgy}
                                        onChange={e => setBrgyOfficialBrgy(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#5ba409] focus:ring-2 focus:ring-[#5ba409]/20 transition-all outline-none appearance-none"
                                    >
                                        {BRGY_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5 pt-2">
                                    <label className="text-xs font-semibold text-gray-500 ml-2 mb-1 block uppercase tracking-wider">Official's Email (Optional)</label>
                                    <input 
                                        type="email"
                                        placeholder="official@minglanilla.gov.ph"
                                        value={regForm.email}
                                        onChange={e => setRegForm({...regForm, email: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#5ba409] focus:ring-2 focus:ring-[#5ba409]/20 transition-all outline-none"
                                    />
                                    <p className="text-[11px] font-medium text-gray-400 ml-2 mt-2">Providing an email allows you to send the link directly from the platform.</p>
                                </div>
                             </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 ml-2 mb-1 block uppercase tracking-wider">First Name</label>
                                        <input 
                                            required
                                            placeholder="John"
                                            value={regForm.firstName}
                                            onChange={e => setRegForm({...regForm, firstName: e.target.value})}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#5ba409] focus:ring-2 focus:ring-[#5ba409]/20 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 ml-2 mb-1 block uppercase tracking-wider">Last Name</label>
                                        <input 
                                            required
                                            placeholder="Doe"
                                            value={regForm.lastName}
                                            onChange={e => setRegForm({...regForm, lastName: e.target.value})}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#5ba409] focus:ring-2 focus:ring-[#5ba409]/20 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 ml-2 mb-1 block uppercase tracking-wider">Email Address</label>
                                    <input 
                                        required
                                        type="email"
                                        placeholder="name@example.com"
                                        value={regForm.email}
                                        onChange={e => setRegForm({...regForm, email: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#5ba409] focus:ring-2 focus:ring-[#5ba409]/20 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 ml-2 mb-1 block uppercase tracking-wider">Temporary Password</label>
                                    <input 
                                        required
                                        type="password"
                                        placeholder="••••••••"
                                        value={regForm.password}
                                        onChange={e => setRegForm({...regForm, password: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#5ba409] focus:ring-2 focus:ring-[#5ba409]/20 transition-all outline-none"
                                    />
                                </div>
                            </>
                        )}

                        <div className="pt-4 flex items-center justify-end gap-3">
                            <button 
                                type="button"
                                onClick={() => setIsRegModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={isRegistering}
                                className="px-6 py-2.5 bg-[#5ba409] text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isRegistering ? 'Processing...' : regType === 'brgy_official' ? 'Generate Link' : 'Register User'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>

        {/* ⚠️ Confirmation Modal for Sensitive Actions */}
        {confirmModal && (
            <ConfirmationModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(null)}
                title={`${confirmModal.action.charAt(0).toUpperCase() + confirmModal.action.slice(1)} ${confirmModal.name.split(' ')[0]}?`}
                message={`Are you sure you want to ${confirmModal.action} this user? ${
                    confirmModal.action === 'suspend' ? 'They will lose access to the platform immediately until restored.' :
                    confirmModal.action === 'delete' ? 'Their account will be permanently moved to deleted records.' :
                    'They will regain full platform access.'
                }`}
                confirmText={confirmModal.action.charAt(0).toUpperCase() + confirmModal.action.slice(1)}
                variant={confirmModal.action === 'suspend' ? 'warning' : confirmModal.action === 'delete' ? 'danger' : 'success'}
                icon={confirmModal.action === 'suspend' ? Ban : confirmModal.action === 'delete' ? Trash2 : RotateCcw}
                onConfirm={() => handleUpdateStatus(confirmModal.userId, confirmModal.action === 'delete' ? 'deleted' : confirmModal.action === 'suspend' ? 'suspended' : 'active')}
            />
        )}
    </div>
  );
};

export default AdminUsersPage;

