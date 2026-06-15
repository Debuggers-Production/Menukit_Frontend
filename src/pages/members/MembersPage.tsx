import { useState, useEffect } from 'react';
import { Users, ShieldCheck, Smartphone, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { membershipService, MembershipAnalytics, Member } from '@/services/memberships';
import { useShopStore } from '@/store/shopStore';

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
      setAnalytics(data);
      setMembers(membersData);
    } catch (err) {
      console.error('Failed to load membership analytics', err);
    } finally {
      setIsLoading(false);
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
        <div>
          <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Users className="text-primary" size={24} />
            Members & Verified Customers
          </h2>
          <p className="text-slate-500 mt-1">Manage your exclusive member base and view analytics.</p>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-600">Total Members</CardTitle>
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              {isLoading ? '...' : analytics?.total_members || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Total registered customers</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-600">Manually Verified</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              {isLoading ? '...' : analytics?.manually_added || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Added by you</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-600">Auto Registered</CardTitle>
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <Smartphone size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              {isLoading ? '...' : analytics?.auto_registered || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">New interested customers</p>
          </CardContent>
        </Card>
      </div>



      {/* Retailer Added Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">Manually Verified Members</CardTitle>
          <p className="text-sm text-slate-500">Customers you have manually added to your membership program.</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-slate-500">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-slate-500 border border-dashed rounded-xl">
              No manually verified members yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600">Name</th>
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600">Mobile Number</th>
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600">Joined On</th>
                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
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
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
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
            </div>
          )}
        </CardContent>
      </Card>

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

      <button 
        onClick={() => setIsAddModalOpen(true)} 
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center hover:bg-primary/90 hover:scale-105 transition-all z-50 hover:shadow-2xl active:scale-95"
        title="Add Member Manually"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
