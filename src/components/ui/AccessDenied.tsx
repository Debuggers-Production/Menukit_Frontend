import { ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export function AccessDenied() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[400px]">
      <Card className="max-w-md w-full text-center border-dashed border-red-200 bg-red-50/30 dark:bg-red-950/20 dark:border-red-900/50">
        <CardContent className="pt-10 pb-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            You don't have permission to view this module. If you believe this is a mistake, please contact the shop owner.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
