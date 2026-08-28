import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { api } from '@/services/api';
import { Store, MapPin, Navigation } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  description: string;
  logo_url: string;
  banner_url: string;
  address: string;
  slug: string;
}

export function BrandLandingPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Select a Branch | Menukit';
    const fetchBranches = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/public/brand/${userId}/branches`);
        const activeBranches = res.data || [];
        
        if (activeBranches.length === 1) {
          // If only one branch, redirect directly to its digital menu
          navigate(`/menu/${activeBranches[0].slug}`, { replace: true });
          return;
        }
        
        setBranches(activeBranches);
      } catch (err: any) {
        console.error('Failed to fetch brand branches', err);
        setError('Failed to load branches. Please check the URL.');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchBranches();
    }
  }, [userId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium text-sm">Loading available branches...</p>
        </div>
      </div>
    );
  }

  if (error || branches.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 text-center border border-slate-200 shadow-sm">
          <Store className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800 mb-1">No Branches Found</h2>
          <p className="text-slate-500 text-sm mb-6">{error || 'There are no active branches available for this brand.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Brand Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 mb-2">
            Welcome!
          </h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto">
            Please select the branch you are visiting today to view the menu.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {branches.map((branch) => (
            <div 
              key={branch.id}
              onClick={() => navigate(`/menu/${branch.slug}`)}
              className="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 cursor-pointer"
            >
              {/* Branch Banner */}
              {branch.banner_url ? (
                <div className="h-24 sm:h-32 w-full bg-slate-100 overflow-hidden relative">
                  <img 
                    src={branch.banner_url} 
                    alt={branch.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              ) : (
                <div className="h-16 w-full bg-gradient-to-r from-slate-100 to-slate-50" />
              )}

              <div className="p-4 sm:p-5 relative">
                {/* Branch Logo */}
                {branch.logo_url && (
                  <div className="absolute -top-12 sm:-top-16 left-4 sm:left-5 w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl border-4 border-white shadow-md bg-white overflow-hidden">
                    <img src={branch.logo_url} alt={branch.name} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className={`${branch.banner_url && branch.logo_url ? 'mt-6 sm:mt-8' : ''}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                        {branch.name}
                      </h3>
                      {branch.description && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                          {branch.description}
                        </p>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-primary/10 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors shrink-0">
                      <Navigation size={18} />
                    </div>
                  </div>

                  {branch.address && (
                    <div className="flex items-start gap-2 mt-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                      <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-tight">{branch.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {branches.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No Branches Available</h3>
              <p className="text-slate-500 mt-1">This brand currently has no active branches to display.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
