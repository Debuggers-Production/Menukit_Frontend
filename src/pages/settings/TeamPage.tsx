import { useState, useEffect } from 'react';
import { Mail, Shield, Trash2, Send, RefreshCw, UserPlus, ChevronDown, ChevronUp, Link } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';

type TabType = 'members' | 'invitations';
type PermissionLevel = 'none' | 'read' | 'write';

interface ServiceAccess {
  id: string;
  label: string;
  level: PermissionLevel;
}

export function TeamPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  
  const { user } = useAuthStore();
  
  // New employee state
  const [email, setEmail] = useState('');
  const [services, setServices] = useState<ServiceAccess[]>([
    { id: 'menu_categories', label: 'Categories', level: 'none' },
    { id: 'menu_items', label: 'Menus', level: 'none' },
    { id: 'orders', label: 'Orders Management', level: 'none' },
    { id: 'discounts', label: 'Discounts & Offers', level: 'none' },
    { id: 'contests', label: 'Contests & Rewards', level: 'none' },
    { id: 'customers', label: 'Members & Customers', level: 'none' },
    { id: 'marketing', label: 'Marketing & Campaigns (Broadcasts)', level: 'none' },
    { id: 'analytics', label: 'Analytics & Reports', level: 'none' },
    { id: 'team', label: 'Team Management', level: 'none' },
    { id: 'subscription', label: 'Subscriptions', level: 'none' },
    { id: 'settlements', label: 'Settlements & Payouts', level: 'none' },
    { id: 'settings', label: 'Shop Settings', level: 'none' },
  ]);

  const [editingPermissions, setEditingPermissions] = useState<Record<string, Record<string, string[]>>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // OTP Deletion State
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; email: string } | null>(null);
  const [deleteOtpCode, setDeleteOtpCode] = useState('');
  const [isSendingDeleteOtp, setIsSendingDeleteOtp] = useState(false);
  const [sendingOtpForId, setSendingOtpForId] = useState<string | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  const { setTitle } = useHeaderStore();

  useEffect(() => {
    setTitle('Staff Management', 'Invite new staff members, assign access roles, and manage permissions.');
  }, [setTitle]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (error) {
      toast.error('Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceChange = (serviceId: string, level: PermissionLevel) => {
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, level } : s));
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email is required');
      return;
    }
    if (user?.email && email.trim().toLowerCase() === user.email.trim().toLowerCase()) {
      toast.error('Cannot invite yourself (the shop owner) as a team member.');
      return;
    }

    setIsSending(true);
    try {
      const permissions: Record<string, string[]> = {};
      services.forEach(s => {
        if (s.level === 'read') permissions[s.id] = ['read'];
        if (s.level === 'write') permissions[s.id] = ['read', 'write', 'delete'];
      });

      await api.post('/employees', {
        email,
        permissions
      });
      toast.success('Invitation link created successfully!');
      setEmail('');
      setServices([
        { id: 'menu_categories', label: 'Categories', level: 'none' },
        { id: 'menu_items', label: 'Menus', level: 'none' },
        { id: 'orders', label: 'Orders Management', level: 'none' },
        { id: 'discounts', label: 'Discounts & Offers', level: 'none' },
        { id: 'contests', label: 'Contests & Rewards', level: 'none' },
        { id: 'analytics', label: 'Analytics & Reports', level: 'none' },
        { id: 'settlements', label: 'Settlements & Payouts', level: 'none' },
        { id: 'settings', label: 'Shop Settings', level: 'none' },
      ]);
      setActiveTab('invitations');
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenDeleteModal = async (employeeId: string, employeeEmail: string) => {
    setIsSendingDeleteOtp(true);
    setSendingOtpForId(employeeId);
    try {
      await api.post(`/employees/request-deletion-otp?target=team_member_${encodeURIComponent(employeeEmail)}`);
      toast.success(`Deletion OTP code sent to your registered email (${user?.email})`);
      setDeleteOtpCode('');
      setMemberToDelete({ id: employeeId, email: employeeEmail });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP email');
    } finally {
      setIsSendingDeleteOtp(false);
      setSendingOtpForId(null);
    }
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    if (!deleteOtpCode || deleteOtpCode.length < 6) {
      return toast.error('Please enter valid 6-digit OTP code');
    }
    setIsDeletingMember(true);
    try {
      await api.delete(`/employees/${memberToDelete.id}?code=${encodeURIComponent(deleteOtpCode.trim())}`);
      toast.success(`Team member (${memberToDelete.email}) removed successfully`);
      setMemberToDelete(null);
      setDeleteOtpCode('');
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Invalid or expired OTP code');
    } finally {
      setIsDeletingMember(false);
    }
  };

  const handleDirectRemove = async (employeeId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) return;
    try {
      await api.delete(`/employees/${employeeId}`);
      toast.success(`Invitation for ${email} revoked successfully`);
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to revoke invitation');
    }
  };

  const handleResend = async (employeeId: string, email: string) => {
    setResendingId(employeeId);
    try {
      await api.post(`/employees/${employeeId}/resend`);
      toast.success(`Invitation resent to ${email}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const activeMembers = employees.filter(e => e.status === 'active');
  const pendingMembers = employees.filter(e => e.status === 'pending');

  const getServiceLevelFromPerms = (perms: string[] | undefined): PermissionLevel => {
    if (!perms || perms.length === 0) return 'none';
    if (perms.includes('write')) return 'write';
    if (perms.includes('read')) return 'read';
    return 'none';
  };

  const toggleExpand = (id: string, currentPerms: Record<string, string[]>) => {
    if (expandedMember === id) {
      setExpandedMember(null);
    } else {
      setExpandedMember(id);
      setEditingPermissions(prev => ({ ...prev, [id]: currentPerms || {} }));
    }
  };

  const handleUpdatePermission = (empId: string, serviceId: string, level: PermissionLevel) => {
    setEditingPermissions(prev => {
      const current = { ...prev[empId] } || {};
      if (level === 'none') {
        delete current[serviceId];
      } else if (level === 'read') {
        current[serviceId] = ['read'];
      } else if (level === 'write') {
        current[serviceId] = ['read', 'write', 'delete'];
      }
      return { ...prev, [empId]: current };
    });
  };

  const saveUpdatedPermissions = async (empId: string) => {
    setIsUpdating(true);
    try {
      await api.put(`/employees/${empId}`, {
        permissions: editingPermissions[empId]
      });
      toast.success('Permissions updated successfully!');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to update permissions');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-0 animate-in fade-in duration-300">
      
      <HeaderActions>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shadow-inner shrink-0">
          <button 
            onClick={() => setActiveTab('members')} 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${activeTab === 'members' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            Staff <span className="bg-slate-200 dark:bg-slate-600 text-[10px] px-2 py-0.5 rounded-full">{activeMembers.length + 1}</span>
          </button>
          <button 
            onClick={() => setActiveTab('invitations')} 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${activeTab === 'invitations' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            Invitations <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full">{pendingMembers.length}</span>
          </button>
        </div>
      </HeaderActions>

      {/* Mobile-Only Tab Switcher matching Menus & Orders sticky header UI */}
      <div className="sticky top-[-16px] sm:top-[-24px] lg:top-[-32px] z-20 flex lg:hidden bg-background/95 backdrop-blur-md pb-3 pt-3 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-border mb-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl">
          <button 
            onClick={() => setActiveTab('members')} 
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-extrabold transition-all cursor-pointer ${activeTab === 'members' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Staff <span className="bg-slate-200/80 dark:bg-slate-700 text-[10px] px-2 py-0.5 rounded-full">{activeMembers.length + 1}</span>
          </button>
          <button 
            onClick={() => setActiveTab('invitations')} 
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-extrabold transition-all cursor-pointer ${activeTab === 'invitations' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            Invitations <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-black">{pendingMembers.length}</span>
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-6 items-start mt-4">
        
        {/* Left Column */}
        <div className="flex-1 w-full min-w-0 space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : activeTab === 'members' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Active Staff</h3>
                  <p className="text-xs text-slate-500">{activeMembers.length + 1} user(s) with active workspace access</p>
                </div>
              </div>

              {/* Owner Card (Current User) */}
              <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-white">You</h4>
                        <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Owner</span>
                      </div>
                      <p className="text-sm text-slate-500">{user?.email}</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 flex items-center gap-1 font-medium">
                    <Shield size={14} /> Owner
                  </div>
                </div>
              </Card>

              {/* Active Employees */}
              {activeMembers.map(emp => (
                <Card key={emp.id} className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                  <div className="p-3.5 sm:p-5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold uppercase shrink-0">
                        {emp.email.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-slate-900 dark:text-white truncate text-xs sm:text-sm max-w-[130px] sm:max-w-xs">{emp.email.split('@')[0]}</h4>
                        <p className="text-[11px] sm:text-sm text-slate-500 truncate max-w-[130px] sm:max-w-xs">{emp.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                      <span className="hidden sm:inline text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">Staff</span>
                      <button 
                        onClick={() => toggleExpand(emp.id, emp.permissions)}
                        className={`p-1.5 sm:p-2 rounded-lg transition-colors ${expandedMember === emp.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        title="Edit Permissions"
                      >
                        {expandedMember === emp.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button 
                        onClick={() => handleOpenDeleteModal(emp.id, emp.email)} 
                        disabled={sendingOtpForId === emp.id}
                        className="p-1.5 sm:p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove member (Requires OTP verification)"
                      >
                        {sendingOtpForId === emp.id ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Permissions Accordion Content */}
                  {expandedMember === emp.id && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-2.5">
                        <Shield size={14} /> Editing Permissions — {emp.email.split('@')[0]}
                      </div>
                      
                      <div className="w-full overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="pb-1.5 font-bold">Service</th>
                              <th className="pb-1.5 text-center w-14">None</th>
                              <th className="pb-1.5 text-center text-blue-600 dark:text-blue-400 w-14">Read</th>
                              <th className="pb-1.5 text-center text-emerald-600 dark:text-emerald-400 w-14">Write</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {services.map(s => {
                              const empPerms = editingPermissions[emp.id] || {};
                              const currentLevel = getServiceLevelFromPerms(empPerms[s.id]);
                              return (
                                <tr key={s.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="py-1.5 font-medium text-slate-700 dark:text-slate-300">{s.label}</td>
                                  <td className="py-1.5 text-center">
                                    <input 
                                      type="radio" 
                                      name={`${emp.id}-${s.id}`} 
                                      checked={currentLevel === 'none'} 
                                      onChange={() => handleUpdatePermission(emp.id, s.id, 'none')}
                                      className="w-3.5 h-3.5 text-slate-400 border-slate-300 focus:ring-slate-400 cursor-pointer" 
                                    />
                                  </td>
                                  <td className="py-1.5 text-center">
                                    <input 
                                      type="radio" 
                                      name={`${emp.id}-${s.id}`} 
                                      checked={currentLevel === 'read'} 
                                      onChange={() => handleUpdatePermission(emp.id, s.id, 'read')}
                                      className="w-3.5 h-3.5 text-blue-500 border-slate-300 focus:ring-blue-500 cursor-pointer" 
                                    />
                                  </td>
                                  <td className="py-1.5 text-center">
                                    <input 
                                      type="radio" 
                                      name={`${emp.id}-${s.id}`} 
                                      checked={currentLevel === 'write'} 
                                      onChange={() => handleUpdatePermission(emp.id, s.id, 'write')}
                                      className="w-3.5 h-3.5 text-emerald-500 border-slate-300 focus:ring-emerald-500 cursor-pointer" 
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-end mt-2.5">
                        <Button 
                          onClick={() => saveUpdatedPermissions(emp.id)} 
                          disabled={isUpdating}
                          size="sm"
                          className="h-8 text-xs px-3"
                        >
                          {isUpdating ? 'Saving...' : 'Save Permissions'}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
              
              {activeMembers.length === 0 && (
                <div className="text-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p>No additional active members.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Sent Invitations</h3>
                  <p className="text-xs text-slate-500">All invitation links — pending, accepted, expired</p>
                </div>
              </div>

              {pendingMembers.length === 0 ? (
                 <div className="text-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                   <Mail size={32} className="mx-auto mb-3 opacity-50" />
                   <p>No pending invitations.</p>
                 </div>
              ) : (
                pendingMembers.map(emp => (
                  <Card key={emp.id} className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-slate-900 dark:text-white">{emp.email}</h4>
                          <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                            Pending
                          </span>
                          <span className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                            <Link size={10} /> Link only
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">
                          Invited by <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.email}</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(emp.permissions || {}).map(([res, perms]) => {
                             const pArr = perms as string[];
                             if (!pArr.length) return null;
                             const level = pArr.includes('write') ? 'Write' : 'Read';
                             return (
                               <span key={res} className="text-[10px] font-medium px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 rounded-md capitalize">
                                 {res} - {level}
                               </span>
                             )
                          })}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleResend(emp.id, emp.email)}
                          disabled={resendingId === emp.id}
                          className="flex-1 md:flex-none text-xs h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900/50 dark:hover:bg-blue-900/20"
                        >
                          <RefreshCw size={14} className={`mr-1.5 ${resendingId === emp.id ? 'animate-spin' : ''}`} />
                          {resendingId === emp.id ? 'Sending...' : 'Resend'}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDirectRemove(emp.id, emp.email)} 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Revoke invitation"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Column — Sticky Fixed Invite Collaborator Panel */}
        <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            {/* Panel Header */}
            <div className="bg-primary p-4 text-white">
              <div className="flex items-center gap-2 mb-0.5">
                <UserPlus size={18} className="text-white/80" />
                <h3 className="font-bold text-base">Invite Staff</h3>
              </div>
              <p className="text-primary-100 text-xs">
                An invite link will be sent to their email
              </p>
            </div>

            {/* Panel Body */}
            <div className="p-4">
              <form onSubmit={handleInvite}>
                {/* Email field */}
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="collaborator@example.com"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">
                    Works for registered and new users — both receive a link to accept.
                  </p>
                </div>

                {/* Service Access */}
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <Shield size={13} /> Service Access
                  </div>
                  
                  <div className="overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2 px-2.5 font-semibold text-slate-600 dark:text-slate-300">Service</th>
                          <th className="py-2 text-center font-semibold text-slate-500 w-11">None</th>
                          <th className="py-2 text-center font-semibold text-blue-600 w-11">Read</th>
                          <th className="py-2 text-center font-semibold text-emerald-600 w-11">Write</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {services.map((s) => (
                          <tr key={s.id} className="hover:bg-white dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-1.5 px-2.5 font-medium text-slate-700 dark:text-slate-300 text-[11px]">{s.label}</td>
                            <td className="py-1.5 text-center">
                              <input 
                                type="radio" 
                                name={`perm-${s.id}`} 
                                checked={s.level === 'none'}
                                onChange={() => handleServiceChange(s.id, 'none')}
                                className="w-3.5 h-3.5 text-slate-400 border-slate-300 focus:ring-slate-400 cursor-pointer"
                              />
                            </td>
                            <td className="py-1.5 text-center">
                              <input 
                                type="radio" 
                                name={`perm-${s.id}`}
                                checked={s.level === 'read'}
                                onChange={() => handleServiceChange(s.id, 'read')}
                                className="w-3.5 h-3.5 text-blue-500 border-slate-300 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-1.5 text-center">
                              <input 
                                type="radio" 
                                name={`perm-${s.id}`}
                                checked={s.level === 'write'}
                                onChange={() => handleServiceChange(s.id, 'write')}
                                className="w-3.5 h-3.5 text-emerald-500 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Send Button */}
                <Button 
                  type="submit" 
                  disabled={isSending} 
                  className="w-full h-10 text-sm shadow-md font-bold mt-1"
                >
                  {isSending ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw size={15} className="animate-spin" />
                      Sending...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send size={15} />
                      Send Invitation
                    </div>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
        
      </div>

      {/* Security OTP Verification Modal for Team Member Removal */}
      <Modal
        isOpen={!!memberToDelete}
        onClose={() => {
          if (!isDeletingMember) {
            setMemberToDelete(null);
            setDeleteOtpCode('');
          }
        }}
        title="Confirm Member Removal"
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs sm:text-sm font-semibold leading-relaxed flex items-start gap-2.5">
            <Shield className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              Security Verification Required: A 6-digit verification OTP has been sent to your email (<span className="font-bold underline">{user?.email}</span>) to confirm removing <span className="font-bold">{memberToDelete?.email}</span> from workspace team access.
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Enter the 6-digit verification code below to authorize deletion:
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Enter 6-Digit Email OTP
            </label>
            <Input
              value={deleteOtpCode}
              onChange={(e) => setDeleteOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center font-mono text-lg tracking-[6px] font-bold"
              disabled={isDeletingMember}
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setMemberToDelete(null);
                setDeleteOtpCode('');
              }}
              disabled={isDeletingMember}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeleteMember}
              isLoading={isDeletingMember}
              disabled={deleteOtpCode.length < 6}
              className="flex-1 font-bold"
            >
              Confirm Removal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
