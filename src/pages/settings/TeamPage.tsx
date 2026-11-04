import { cn } from '@/utils/cn';
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

import { useShopStore } from '@/store/shopStore';
import { isSchemeEnabledShop } from '@/config/businessCategories';

type TabType = 'members' | 'invitations';
type PermissionLevel = 'none' | 'read' | 'write';

interface ServiceAccess {
  id: string;
  label: string;
  level: PermissionLevel;
}

export const getAvailableServices = (shopCategory?: string | null): ServiceAccess[] => {
  const isScheme = isSchemeEnabledShop(shopCategory);
  return [
    { id: 'menu_categories', label: 'Categories', level: 'none' },
    { id: 'menu_items', label: 'Menus', level: 'none' },
    { id: 'orders', label: 'Orders Management', level: 'none' },
    ...(isScheme ? [{ id: 'schemes', label: 'Schemes', level: 'none' as PermissionLevel }] : []),
    { id: 'discounts', label: 'Discounts & Offers', level: 'none' },
    { id: 'contests', label: 'Contests & Rewards', level: 'none' },
    { id: 'customers', label: 'Members & Customers', level: 'none' },
    { id: 'campaigns', label: 'Campaigns & Marketing', level: 'none' },
    { id: 'chalkboard', label: 'Chalkboard Sign', level: 'none' },
    { id: 'analytics', label: 'Analytics & Reports', level: 'none' },
    { id: 'team', label: 'Team Management', level: 'none' },
    { id: 'subscription', label: 'Subscriptions', level: 'none' },
    { id: 'settlements', label: 'Settlements & Payouts', level: 'none' },
    { id: 'settings', label: 'Shop Settings', level: 'none' },
  ];
};

export const DEFAULT_SERVICES: ServiceAccess[] = getAvailableServices();

export function TeamPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  
  const { user } = useAuthStore();
  const { shop } = useShopStore();
  
  // New employee state
  const [email, setEmail] = useState('');
  const [services, setServices] = useState<ServiceAccess[]>(() => getAvailableServices(shop?.category));

  useEffect(() => {
    setServices(prev => {
      const available = getAvailableServices(shop?.category);
      return available.map(s => {
        const existing = prev.find(p => p.id === s.id);
        return existing ? { ...s, level: existing.level } : s;
      });
    });
  }, [shop?.category]);

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
    setTitle('Staff & Team');
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
        if (s.level === 'read') {
          permissions[s.id] = ['read'];
          if (s.id === 'campaigns') permissions['marketing'] = ['read'];
        }
        if (s.level === 'write') {
          permissions[s.id] = ['read', 'write', 'delete'];
          if (s.id === 'campaigns') permissions['marketing'] = ['read', 'write', 'delete'];
        }
      });

      await api.post('/employees', {
        email,
        permissions
      });
      toast.success('Invitation link created successfully!');
      setEmail('');
      setServices(getAvailableServices(shop?.category));
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

  const getServiceLevelFromPerms = (empPerms: Record<string, string[]> | undefined, serviceId: string): PermissionLevel => {
    if (!empPerms) return 'none';
    let perms = empPerms[serviceId];
    if ((!perms || perms.length === 0) && (serviceId === 'campaigns' || serviceId === 'marketing')) {
      perms = empPerms['campaigns'] || empPerms['marketing'];
    }
    if ((!perms || perms.length === 0) && serviceId === 'chalkboard') {
      perms = empPerms['chalkboard'] || empPerms['settings'];
    }
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
      const current = { ...(prev[empId] || {}) };
      if (level === 'none') {
        delete current[serviceId];
        if (serviceId === 'campaigns') delete current['marketing'];
      } else if (level === 'read') {
        current[serviceId] = ['read'];
        if (serviceId === 'campaigns') current['marketing'] = ['read'];
      } else if (level === 'write') {
        current[serviceId] = ['read', 'write', 'delete'];
        if (serviceId === 'campaigns') current['marketing'] = ['read', 'write', 'delete'];
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
    <div className="flex flex-col h-full gap-4 animate-in fade-in duration-200">
      
      <HeaderActions>
        <div className="flex items-center gap-1 bg-card border border-border/80 p-1 rounded-lg shadow-2xs shrink-0">
          <button 
            onClick={() => setActiveTab('members')} 
            className={cn(
              "flex items-center gap-1.5 px-3 h-7.5 rounded-md text-xs font-bold transition-all cursor-pointer",
              activeTab === 'members'
                ? "bg-primary text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Staff</span>
            <span className={cn(
              "text-[9.5px] px-1.5 py-0.2 rounded-md font-bold",
              activeTab === 'members' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}>
              {activeMembers.length + 1}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('invitations')} 
            className={cn(
              "flex items-center gap-1.5 px-3 h-7.5 rounded-md text-xs font-bold transition-all cursor-pointer",
              activeTab === 'invitations'
                ? "bg-primary text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Invitations</span>
            <span className={cn(
              "text-[9.5px] px-1.5 py-0.2 rounded-md font-bold",
              activeTab === 'invitations' ? "bg-white/20 text-white" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            )}>
              {pendingMembers.length}
            </span>
          </button>
        </div>
      </HeaderActions>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden items-center gap-1 p-1 bg-card rounded-lg border border-border/80 shadow-2xs">
        <button 
          onClick={() => setActiveTab('members')} 
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-bold transition-all cursor-pointer",
            activeTab === 'members'
              ? "bg-primary text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>Staff</span>
          <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-bold">
            {activeMembers.length + 1}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('invitations')} 
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-bold transition-all cursor-pointer",
            activeTab === 'invitations'
              ? "bg-primary text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>Invitations</span>
          <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 font-bold">
            {pendingMembers.length}
          </span>
        </button>
      </div>

      {/* Main Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        {/* Left Column — Active Staff / Invitations View */}
        <div className="flex-1 w-full min-w-0 space-y-3.5">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary"></div>
            </div>
          ) : activeTab === 'members' ? (
            <div className="space-y-3">
              {/* Owner Card (Current User) */}
              <div className="bg-card border border-border/80 rounded-lg p-3.5 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shadow-2xs">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-foreground">You</h4>
                      <span className="bg-primary/10 text-primary text-[9.5px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-primary/20">
                        Owner
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                  <Shield size={13} className="text-primary" /> Full Workspace Access
                </div>
              </div>

              {/* Active Employees */}
              {activeMembers.map(emp => (
                <div key={emp.id} className="bg-card border border-border/80 rounded-lg shadow-2xs transition-all hover:border-primary/40 overflow-hidden">
                  <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8.5 h-8.5 rounded-md bg-muted text-foreground border border-border flex items-center justify-center font-bold uppercase shrink-0 text-xs shadow-2xs">
                        {emp.email.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-foreground truncate max-w-[130px] sm:max-w-xs">{emp.email.split('@')[0]}</h4>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-semibold">Staff</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[130px] sm:max-w-xs">{emp.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        onClick={() => toggleExpand(emp.id, emp.permissions)}
                        className={cn(
                          "h-7.5 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border",
                          expandedMember === emp.id 
                            ? "bg-primary text-white border-primary" 
                            : "bg-muted text-foreground border-border hover:bg-muted/80"
                        )}
                        title="Edit Permissions"
                      >
                        <span>Permissions</span>
                        {expandedMember === emp.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <button 
                        onClick={() => handleOpenDeleteModal(emp.id, emp.email)} 
                        disabled={sendingOtpForId === emp.id}
                        className="w-7.5 h-7.5 flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors disabled:opacity-50 border border-border hover:border-rose-300 cursor-pointer"
                        title="Remove member"
                      >
                        {sendingOtpForId === emp.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Permissions Accordion Content */}
                  {expandedMember === emp.id && (
                    <div className="bg-muted/20 p-3.5 border-t border-border/80 space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <Shield size={13} className="text-primary" />
                          <span>Configure Module Permissions — {emp.email.split('@')[0]}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Select access level per service</span>
                      </div>
                      
                      <div className="rounded-md border border-border/80 overflow-hidden bg-card">
                        <table className="w-full text-xs text-left">
                          <thead className="text-[10px] uppercase text-muted-foreground font-bold bg-muted/50 border-b border-border/80">
                            <tr>
                              <th className="py-2 px-3 font-bold">Module / Service</th>
                              <th className="py-2 text-center w-14">None</th>
                              <th className="py-2 text-center text-blue-600 dark:text-blue-400 w-14">Read</th>
                              <th className="py-2 text-center text-emerald-600 dark:text-emerald-400 w-14">Write</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {services.map(s => {
                              const empPerms = editingPermissions[emp.id] || emp.permissions || {};
                              const currentLevel = getServiceLevelFromPerms(empPerms, s.id);
                              return (
                                <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                                  <td className="py-2 px-3 font-semibold text-foreground text-xs">{s.label}</td>
                                  <td className="py-2 text-center">
                                    <input 
                                      type="radio" 
                                      name={`${emp.id}-${s.id}`} 
                                      checked={currentLevel === 'none'} 
                                      onChange={() => handleUpdatePermission(emp.id, s.id, 'none')}
                                      className="w-3.5 h-3.5 text-muted-foreground border-border cursor-pointer" 
                                    />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input 
                                      type="radio" 
                                      name={`${emp.id}-${s.id}`} 
                                      checked={currentLevel === 'read'} 
                                      onChange={() => handleUpdatePermission(emp.id, s.id, 'read')}
                                      className="w-3.5 h-3.5 text-blue-600 border-border cursor-pointer" 
                                    />
                                  </td>
                                  <td className="py-2 text-center">
                                    <input 
                                      type="radio" 
                                      name={`${emp.id}-${s.id}`} 
                                      checked={currentLevel === 'write'} 
                                      onChange={() => handleUpdatePermission(emp.id, s.id, 'write')}
                                      className="w-3.5 h-3.5 text-emerald-600 border-border cursor-pointer" 
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button 
                          onClick={() => saveUpdatedPermissions(emp.id)} 
                          disabled={isUpdating}
                          size="sm"
                          className="h-8 text-xs px-3 rounded-md font-bold shadow-2xs cursor-pointer"
                        >
                          {isUpdating ? 'Saving...' : 'Save Permissions'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {activeMembers.length === 0 && (
                <div className="text-center py-10 text-muted-foreground bg-card rounded-lg border border-dashed border-border/80">
                  <p className="text-xs font-semibold">No additional staff members added yet.</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Use the invitation panel to invite colleagues.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {pendingMembers.length === 0 ? (
                 <div className="text-center py-10 text-muted-foreground bg-card rounded-lg border border-dashed border-border/80 space-y-1">
                   <Mail size={24} className="mx-auto opacity-40" />
                   <p className="text-xs font-bold text-foreground">No Pending Invitations</p>
                   <p className="text-[11px] text-muted-foreground">Sent employee invitation links will appear here.</p>
                 </div>
              ) : (
                pendingMembers.map(emp => (
                  <div key={emp.id} className="bg-card border border-border/80 rounded-lg p-3.5 sm:p-4 shadow-2xs space-y-2.5">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-foreground">{emp.email}</h4>
                          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9.5px] px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                            Pending
                          </span>
                          <span className="bg-muted text-muted-foreground text-[9.5px] px-1.5 py-0.5 rounded-md font-medium border border-border flex items-center gap-1">
                            <Link size={10} /> Link only
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-2">
                          Invited by <span className="font-semibold text-foreground">{user?.email}</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(emp.permissions || {}).map(([res, perms]) => {
                             if (res === 'marketing' && (emp.permissions as any)?.['campaigns']) return null;
                             const pArr = perms as string[];
                             if (!pArr.length) return null;
                             const level = pArr.includes('write') ? 'Write' : 'Read';
                             const displayLabel = res === 'chalkboard'
                               ? 'Chalkboard'
                               : res === 'campaigns' || res === 'marketing'
                                 ? 'Campaigns'
                                 : res.replace(/_/g, ' ');
                             return (
                               <span key={res} className="text-[9.5px] font-medium px-1.5 py-0.5 bg-muted text-foreground border border-border rounded-md capitalize">
                                 {displayLabel} ({level})
                               </span>
                             );
                          })}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleResend(emp.id, emp.email)}
                          disabled={resendingId === emp.id}
                          className="flex-1 md:flex-none text-xs h-7.5 px-3 rounded-md font-semibold text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                        >
                          <RefreshCw size={12} className={`mr-1.5 ${resendingId === emp.id ? 'animate-spin' : ''}`} />
                          {resendingId === emp.id ? 'Sending...' : 'Resend'}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDirectRemove(emp.id, emp.email)} 
                          className="h-7.5 w-7.5 p-0 text-muted-foreground hover:text-rose-500 rounded-md border border-border cursor-pointer"
                          title="Revoke invitation"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Column — Scrollable Invite Collaborator Panel */}
        <div data-lenis-prevent className="w-full lg:w-[380px] shrink-0 lg:sticky lg:top-2">
          <div className="bg-card rounded-lg border border-border/80 shadow-2xs overflow-hidden flex flex-col">
            {/* Panel Header */}
            <div className="p-3.5 border-b border-border/80 bg-muted/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs">
                  <UserPlus size={14} />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-foreground">Invite Staff</h3>
                  <p className="text-[10px] text-muted-foreground">Send an invite link to colleague's email</p>
                </div>
              </div>
            </div>

            {/* Panel Body */}
            <div className="p-4 flex-1">
              <form onSubmit={handleInvite} className="space-y-3.5">
                {/* Email field */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="collaborator@example.com"
                    className="w-full px-3 h-8.5 text-xs rounded-md border border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Works for existing or new accounts.
                  </p>
                </div>

                {/* Service Access */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Shield size={12} className="text-primary" /> Service Access Matrix
                  </div>
                  
                  <div className="rounded-md border border-border/80 bg-card overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b border-border/80">
                        <tr>
                          <th className="py-1.5 px-2.5 font-bold text-muted-foreground text-[10px] uppercase">Service</th>
                          <th className="py-1.5 text-center font-bold text-muted-foreground text-[10px] uppercase w-11">None</th>
                          <th className="py-1.5 text-center font-bold text-blue-600 dark:text-blue-400 text-[10px] uppercase w-11">Read</th>
                          <th className="py-1.5 text-center font-bold text-emerald-600 dark:text-emerald-400 text-[10px] uppercase w-11">Write</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {services.map((s) => (
                          <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                            <td className="py-1.5 px-2.5 font-semibold text-foreground text-[11px]">{s.label}</td>
                            <td className="py-1.5 text-center">
                              <input 
                                type="radio" 
                                name={`perm-${s.id}`} 
                                checked={s.level === 'none'}
                                onChange={() => handleServiceChange(s.id, 'none')}
                                className="w-3.5 h-3.5 text-muted-foreground border-border cursor-pointer"
                              />
                            </td>
                            <td className="py-1.5 text-center">
                              <input 
                                type="radio" 
                                name={`perm-${s.id}`}
                                checked={s.level === 'read'}
                                onChange={() => handleServiceChange(s.id, 'read')}
                                className="w-3.5 h-3.5 text-blue-600 border-border cursor-pointer"
                              />
                            </td>
                            <td className="py-1.5 text-center">
                              <input 
                                type="radio" 
                                name={`perm-${s.id}`}
                                checked={s.level === 'write'}
                                onChange={() => handleServiceChange(s.id, 'write')}
                                className="w-3.5 h-3.5 text-emerald-600 border-border cursor-pointer"
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
                  className="w-full h-8.5 text-xs shadow-2xs font-bold rounded-md cursor-pointer mt-1"
                >
                  {isSending ? (
                    <div className="flex items-center gap-1.5">
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Sending Invitation...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Send size={13} />
                      <span>Send Invitation</span>
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
        <div className="space-y-3.5 pt-1">
          <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-medium leading-relaxed flex items-start gap-2">
            <Shield className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              Security Verification Required: A 6-digit verification OTP has been sent to your email (<span className="font-bold underline">{user?.email}</span>) to confirm removing <span className="font-bold">{memberToDelete?.email}</span> from workspace team access.
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Enter the 6-digit verification code below to authorize removal:
          </p>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Enter 6-Digit Email OTP
            </label>
            <Input
              value={deleteOtpCode}
              onChange={(e) => setDeleteOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center font-mono text-base tracking-[4px] font-bold h-9 rounded-md"
              disabled={isDeletingMember}
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              onClick={() => {
                setMemberToDelete(null);
                setDeleteOtpCode('');
              }}
              disabled={isDeletingMember}
              className="flex-1 h-8.5 rounded-md text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeleteMember}
              isLoading={isDeletingMember}
              disabled={deleteOtpCode.length < 6}
              className="flex-1 h-8.5 rounded-md text-xs font-bold"
            >
              Confirm Removal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
