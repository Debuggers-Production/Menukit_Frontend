import { useState } from 'react';
import { Database, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/Button';

type UploadType = 'categories' | 'menus' | 'discounts';

const EXAMPLES = {
  categories: `[
  {
    "name": "Pizza",
    "display_order": 1,
    "is_active": true
  },
  {
    "name": "Burgers",
    "display_order": 2,
    "is_active": true
  }
]`,
  menus: `[
  {
    "category_id": "paste-category-uuid-here",
    "name": "Margherita Pizza",
    "description": "Classic delight with 100% real mozzarella cheese",
    "price": 199.00,
    "food_types": ["veg"],
    "is_available": true,
    "display_order": 1
  }
]`,
  discounts: `[
  {
    "title": "Weekend Combo",
    "description": "Buy 2 Pizzas Get 1 Coke Free",
    "discount_type": "combo",
    "discount_value": 0,
    "applies_to": "all",
    "is_active": true
  },
  {
    "title": "10% Off",
    "description": "Flat 10% off on all items",
    "discount_type": "percentage",
    "discount_value": 10,
    "applies_to": "all",
    "is_active": true
  }
]`
};

const ENDPOINTS = {
  categories: '/bulk-upload/internal/categories',
  menus: '/bulk-upload/internal/menus',
  discounts: '/bulk-upload/internal/discounts',
};

export const InternalBulkPage = () => {
  const [uploadType, setUploadType] = useState<UploadType>('categories');
  const [jsonData, setJsonData] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleUpload = async () => {
    try {
      setStatus(null);
      setIsLoading(true);

      // Validate JSON
      if (!jsonData.trim()) {
        throw new Error('Please enter JSON data');
      }

      let parsedData;
      try {
        parsedData = JSON.parse(jsonData);
      } catch (e) {
        throw new Error('Invalid JSON format');
      }

      if (!Array.isArray(parsedData)) {
        throw new Error('JSON data must be an array of objects');
      }

      // Send to API
      const endpoint = ENDPOINTS[uploadType];
      const response = await api.post(endpoint, parsedData);
      
      setStatus({ 
        type: 'success', 
        message: response.data.message || `Successfully uploaded ${parsedData.length} items.` 
      });
      setJsonData(''); // Clear on success
    } catch (err: any) {
      console.error('Upload failed:', err);
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.detail || err.message || 'Failed to upload data' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading mb-2 flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          Internal Bulk JSON Upload
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Directly create Categories, Menus, Discounts, and Combos using raw JSON payloads.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Entity Type</label>
              <select 
                className="w-full sm:w-64 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={uploadType}
                onChange={(e) => {
                  setUploadType(e.target.value as UploadType);
                  setStatus(null);
                }}
              >
                <option value="categories">Categories</option>
                <option value="menus">Menu Items</option>
                <option value="discounts">Discounts & Combos</option>
              </select>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">JSON Payload</label>
                <button 
                  onClick={() => setJsonData(EXAMPLES[uploadType])}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Load Example
                </button>
              </div>
              <textarea
                className="w-full h-[400px] font-mono text-sm bg-slate-950 text-emerald-400 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y"
                placeholder="Paste your JSON array here..."
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                spellCheck={false}
              />
            </div>

            {status && (
              <div className={`p-4 rounded-xl flex items-start gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2 ${
                status.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
              }`}>
                {status.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <p className="text-sm font-medium">{status.message}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={handleUpload}
                isLoading={isLoading}
                disabled={!jsonData.trim()}
                className="min-w-[150px]"
              >
                Upload {uploadType}
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sticky top-6">
            <h3 className="text-lg font-bold font-heading mb-4 flex items-center gap-2">
              <FileJson className="w-5 h-5 text-slate-400" />
              Example Format
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Your payload must be a valid JSON array containing objects that match the schema for {uploadType}.
            </p>
            <div className="bg-slate-950 rounded-xl overflow-hidden relative group">
              <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
                {EXAMPLES[uploadType]}
              </pre>
              <button 
                onClick={() => navigator.clipboard.writeText(EXAMPLES[uploadType])}
                className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all text-xs"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
