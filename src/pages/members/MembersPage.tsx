import { useState, useEffect } from 'react';
import { Users, ShieldCheck, Smartphone, Plus, Edit2, Trash2, Info, Search } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { membershipService, MembershipAnalytics, Member, RepeatedCustomer } from '@/services/memberships';
import { useShopStore } from '@/store/shopStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
export function MembersPage() {
  const { shop } = useShopStore();

  const [analytics, setAnalytics] = useState<MembershipAnalytics | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', mobile_number: '' });
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const [activeTab, setActiveTab] = useState<'existing' | 'new' | 'repeated'>('existing');
  const [autoMembers, setAutoMembers] = useState<Member[]>([]);
  const [repeatedMembers, setRepeatedMembers] = useState<RepeatedCustomer[]>([]);
  const [minVisits, setMinVisits] = useState(2);
  const [isConverting, setIsConverting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = (
    activeTab === 'existing' ? members : 
    activeTab === 'repeated' ? repeatedMembers : 
    autoMembers
  ).filter(m => 
    (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.mobile_number.includes(searchQuery)
  );

  useEffect(() => {
    if (shop?.id) {
      fetchAnalytics();
    }
  }, [shop?.id]);

  const fetchAnalytics = async () => {
    if (!shop?.id) return;
    try {
      const data = await membershipService.getAnalytics(shop.id);
      const membersData = await membershipService.getMembers(shop.id);
      const autoData = await membershipService.getAutoRegisteredMembers(shop.id);
      const repeatedData = await membershipService.getRepeatedCustomers(shop.id, minVisits);
      setAnalytics(data);
      setMembers(membersData);
      setAutoMembers(autoData);
      setRepeatedMembers(repeatedData);
    } catch (err) {
      console.error('Failed to load membership analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (shop?.id && activeTab === 'repeated') {
      const fetchRepeated = async () => {
        try {
          const repeatedData = await membershipService.getRepeatedCustomers(shop.id, minVisits);
          setRepeatedMembers(repeatedData);
        } catch (err) {
          console.error('Failed to load repeated customers', err);
        }
      };
      fetchRepeated();
    }
  }, [shop?.id, minVisits, activeTab]);

  const handleConvertToMember = async (memberId: string) => {
    if (!shop?.id) return;
    setIsConverting(true);
    try {
      await membershipService.convertToMember(shop.id, memberId);
      toast.success('Customer converted to verified member!');
      fetchAnalytics();
      setActiveTab('existing');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to convert customer');
    } finally {
      setIsConverting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id) return;

    if (!formData.mobile_number.trim() || formData.mobile_number.length < 10) {
      toast.error('Please enter a valid mobile number');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingMemberId) {
        await membershipService.editMember(shop.id, editingMemberId, formData.name, formData.mobile_number);
        toast.success('Member updated successfully!');
        setIsEditModalOpen(false);
      } else {
        await membershipService.addMember(shop.id, formData.name, formData.mobile_number);
        toast.success('Member verified and added successfully!');
        setIsAddModalOpen(false);
      }
      setFormData({ name: '', mobile_number: '' });
      setEditingMemberId(null);
      fetchAnalytics();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || (editingMemberId ? 'Failed to update member' : 'Failed to add member'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!shop?.id || !memberToDelete) return;
    setIsDeleting(true);
    try {
      await membershipService.deleteMember(shop.id, memberToDelete);
      toast.success('Member removed successfully');
      setMembers(members.filter(m => m.id !== memberToDelete));
      fetchAnalytics();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to remove member');
    } finally {
      setIsDeleting(false);
      setMemberToDelete(null);
    }
  };

  const handleDeleteAll = async (type: 'existing' | 'new' | 'all') => {
    if (!shop?.id) return;
    setIsDeletingAll(true);
    try {
      await membershipService.deleteAllMembers(shop.id, type);
      if (type === 'existing' || type === 'all') setMembers([]);
      if (type === 'new' || type === 'all') setAutoMembers([]);
      fetchAnalytics();
      setShowDeleteAllConfirm(false);
      toast.success(
        type === 'existing' ? 'All verified members deleted' :
        type === 'new' ? 'All new customers deleted' :
        'All members deleted successfully'
      );
    } catch {
      toast.error('Failed to delete members');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const openEditModal = (member: Member) => {
    setEditingMemberId(member.id);
    setFormData({ name: member.name || '', mobile_number: member.mobile_number });
    setIsEditModalOpen(true);
  };

  if (!shop) return null;

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in pb-24 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Members & Verified Customers"
          subtitle="Manage your exclusive member base and view analytics."
          className="mb-0"
        />
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <CardHeader className="p-3 sm:p-6 pb-0 sm:pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <CardTitle className="text-[10px] sm:text-sm font-semibold text-slate-600 leading-tight">Total Members</CardTitle>
            <div className="hidden sm:flex w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 items-center justify-center">
              <Users size={16} />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-2 sm:pt-4">
            <div className="text-xl sm:text-3xl font-bold text-slate-800">
              {isLoading ? '...' : analytics?.total_members || 0}
            </div>
            <p className="text-[9px] sm:text-xs text-slate-500 mt-1 leading-tight line-clamp-2 hidden sm:block">Total registered customers</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardHeader className="p-3 sm:p-6 pb-0 sm:pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <CardTitle className="text-[10px] sm:text-sm font-semibold text-slate-600 leading-tight">Manually Verified</CardTitle>
            <div className="hidden sm:flex w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-2 sm:pt-4">
            <div className="text-xl sm:text-3xl font-bold text-slate-800">
              {isLoading ? '...' : analytics?.manually_added || 0}
            </div>
            <p className="text-[9px] sm:text-xs text-slate-500 mt-1 leading-tight line-clamp-2 hidden sm:block">Added by you</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <CardHeader className="p-3 sm:p-6 pb-0 sm:pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <CardTitle className="text-[10px] sm:text-sm font-semibold text-slate-600 leading-tight">Auto Registered</CardTitle>
            <div className="hidden sm:flex w-8 h-8 rounded-full bg-amber-100 text-amber-600 items-center justify-center">
              <Smartphone size={16} />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-2 sm:pt-4">
            <div className="text-xl sm:text-3xl font-bold text-slate-800">
              {isLoading ? '...' : analytics?.auto_registered || 0}
            </div>
            <p className="text-[9px] sm:text-xs text-slate-500 mt-1 leading-tight line-clamp-2 hidden sm:block">New interested customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Search */}
      <div className="sticky top-[-16px] sm:top-[-24px] lg:top-[-32px] z-20 bg-[#f8fafc]/90 backdrop-blur-md pb-4 pt-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:max-w-sm">
        <button
          onClick={() => setActiveTab('existing')}
          data-tooltip-id="existing-tab-info"
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'existing'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          Existing
          <Info size={14} className="text-slate-400" />
        </button>
        <Tooltip id="existing-tab-info" place="top" style={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px', maxWidth: '250px', zIndex: 100 }}>
          Customers you have manually added to your membership program.
        </Tooltip>

        <button
          onClick={() => setActiveTab('new')}
          data-tooltip-id="new-tab-info"
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'new'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          New
          <Info size={14} className="text-slate-400" />
          {autoMembers.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'new' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
              {autoMembers.length}
            </span>
          )}
        </button>
        <Tooltip id="new-tab-info" place="top" style={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px', maxWidth: '250px', zIndex: 100 }}>
          New customers who joined via OTP. Convert them to verified members.
        </Tooltip>

        <button
          onClick={() => setActiveTab('repeated')}
          data-tooltip-id="repeated-tab-info"
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'repeated'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          Repeated
          <Info size={14} className="text-slate-400" />
          {repeatedMembers.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'repeated' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
              {repeatedMembers.length}
            </span>
          )}
        </button>
        <Tooltip id="repeated-tab-info" place="top" style={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px', maxWidth: '250px', zIndex: 100 }}>
          Customers who have visited your shop multiple times.
        </Tooltip>
        </div>

        {activeTab === 'repeated' && (
          <div className="w-full sm:max-w-[120px] shrink-0">
            <Input
              type="number"
              min={2}
              value={minVisits}
              onChange={(e) => setMinVisits(parseInt(e.target.value) || 2)}
              placeholder="Min visits"
              className="w-full bg-white h-10"
              label="Min Visits"
            />
          </div>
        )}

        <div className="w-full sm:max-w-xs flex gap-2">
          <Input
            leftIcon={<Search size={18} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or mobile..."
            className="w-full bg-white flex-1"
          />
          {(members.length > 0 || autoMembers.length > 0) && (
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="flex items-center justify-center gap-2 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium text-sm transition-colors border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:hover:bg-red-900/40 shrink-0 h-10"
              title="Delete All Members"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Delete All</span>
            </button>
          )}
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-24">
        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <div className="py-8 text-center text-slate-500">Loading members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-slate-500 border-b border-slate-100">
              {searchQuery ? 'No members match your search.' : (activeTab === 'existing' ? 'No manually verified members yet.' : activeTab === 'repeated' ? 'No repeated customers found.' : 'No auto-registered customers yet.')}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-4 font-semibold text-sm text-slate-600 bg-slate-50/80 backdrop-blur">Name</th>
                  <th className="py-3 px-4 font-semibold text-sm text-slate-600 bg-slate-50/80 backdrop-blur">Mobile Number</th>
                  <th className="py-3 px-4 font-semibold text-sm text-slate-600 bg-slate-50/80 backdrop-blur">Joined On</th>
                  {activeTab === 'repeated' && (
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 bg-slate-50/80 backdrop-blur text-center">Visits</th>
                  )}
                  <th className="py-3 px-4 font-semibold text-sm text-slate-600 text-right bg-slate-50/80 backdrop-blur">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(member => (
                    <tr key={member.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm font-medium text-slate-800">
                        {member.name || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {member.mobile_number}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </td>
                      {activeTab === 'repeated' && (
                        <td className="py-3 px-4 text-sm font-semibold text-indigo-600 text-center">
                          <span className="bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                            {(member as RepeatedCustomer).visit_count}
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === 'new' && (
                            <button
                              onClick={() => handleConvertToMember(member.id)}
                              disabled={isConverting}
                              className="px-3 py-1.5 text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Convert to Member
                            </button>
                          )}
                          {activeTab === 'existing' && (
                            <button
                              onClick={() => openEditModal(member)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => setMemberToDelete(member.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Manually Verify Member"
        className="max-w-md"
      >
        <form onSubmit={handleAddMember} className="space-y-4 mt-4">
          <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-lg flex items-start gap-2 mb-4">
            <ShieldCheck className="shrink-0 mt-0.5" size={16} />
            <p className="text-xs leading-relaxed">
              Use this if a customer is physically present and you want to grant them membership status instantly.
            </p>
          </div>

          <Input
            label="Customer Mobile Number *"
            value={formData.mobile_number}
            onChange={e => setFormData({ ...formData, mobile_number: e.target.value })}
            placeholder="e.g. 9876543210"
            required
          />

          <Input
            label="Customer Name (Optional)"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. John Doe"
          />

          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verifying...' : 'Verify Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingMemberId(null); setFormData({ name: '', mobile_number: '' }); }}
        title="Edit Member"
        className="max-w-md"
      >
        <form onSubmit={handleAddMember} className="space-y-4 mt-4">
          <Input
            label="Customer Mobile Number *"
            value={formData.mobile_number}
            onChange={e => setFormData({ ...formData, mobile_number: e.target.value })}
            placeholder="e.g. 9876543210"
            required
          />

          <Input
            label="Customer Name (Optional)"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. John Doe"
          />

          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsEditModalOpen(false); setEditingMemberId(null); setFormData({ name: '', mobile_number: '' }); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleDeleteMember}
        title="Remove Member"
        message="Are you sure you want to remove this member from your shop? They will lose access to member-only discounts."
        confirmText={isDeleting ? 'Removing...' : 'Remove Member'}
        isDestructive
      />

      <Modal
        isOpen={showDeleteAllConfirm}
        onClose={() => setShowDeleteAllConfirm(false)}
        title="Delete Members"
        className="max-w-md"
      >
        <div className="mt-4">
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
            Choose which group of members you want to completely delete. This action cannot be undone.
          </p>
          
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={() => handleDeleteAll('existing')}
              disabled={isDeletingAll}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 size={16} className="mr-2" />
              Delete All Existing Members
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleDeleteAll('new')}
              disabled={isDeletingAll}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 size={16} className="mr-2" />
              Delete All New Customers
            </Button>

            <Button
              onClick={() => setShowDeleteAllConfirm(false)}
              disabled={isDeletingAll}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center hover:bg-primary/90 hover:scale-105 transition-all z-50 hover:shadow-2xl active:scale-95"
        title="Add Member Manually"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
