
import { useParams, useNavigate } from 'react-router';
import { ContestHub } from '@/components/public/ContestHub';

export function PublicContestPage() {
  const { id, contestId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-slate-50 text-slate-800 z-50 overflow-hidden flex flex-col items-center justify-center p-4">
      {/* 
         We bypass the basic summary menu cards.
         By passing initialViewMode="reels", the component launches directly into full-screen video mode.
      */}
      <ContestHub 
        shopId={id!} 
        initialViewMode="reels" 
        targetContestId={contestId}
        onBack={() => navigate(-1)} 
      />
    </div>
  );
}