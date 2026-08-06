import React from 'react';
import { ShoppingBag, Truck, Store, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface OrderTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedType: 'dine_in' | 'takeaway' | 'delivery';
  onSelectType: (type: 'takeaway' | 'delivery') => void;
  allowClose?: boolean;
}

export const OrderTypeModal: React.FC<OrderTypeModalProps> = ({
  isOpen,
  onClose,
  selectedType,
  onSelectType,
  allowClose = true,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => allowClose && onClose()}
      title=""
    >
      <div className="text-center pb-2 pt-1">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
          <Store size={26} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          How would you like your order?
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          Select your preferred fulfillment method.
        </p>

        <div className="grid grid-cols-1 gap-3 mt-6">
          {/* Takeaway Option */}
          <button
            type="button"
            onClick={() => onSelectType('takeaway')}
            className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
              selectedType === 'takeaway'
                ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                selectedType === 'takeaway'
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200'
              }`}>
                <ShoppingBag size={22} />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">
                  Takeaway / Store Pickup
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pick up your order directly at the restaurant.
                </p>
              </div>
            </div>

            {selectedType === 'takeaway' && (
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                <Check size={14} />
              </div>
            )}
          </button>

          {/* Delivery Option */}
          <button
            type="button"
            onClick={() => onSelectType('delivery')}
            className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
              selectedType === 'delivery'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                selectedType === 'delivery'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100'
              }`}>
                <Truck size={22} />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">
                  Delivery to Home
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Get your order delivered directly to your doorstep.
                </p>
              </div>
            </div>

            {selectedType === 'delivery' && (
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Check size={14} />
              </div>
            )}
          </button>
        </div>

        {allowClose && (
          <div className="mt-5">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full text-slate-600 dark:text-slate-400"
            >
              Continue Browsing
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
