import React from 'react';
import { ShoppingBag, Truck, Store, Check, UtensilsCrossed } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface OrderTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedType: 'dine_in' | 'takeaway' | 'delivery';
  onSelectType: (type: 'dine_in' | 'takeaway' | 'delivery') => void;
  allowClose?: boolean;
  availableTypes?: {
    dine_in?: boolean;
    takeaway?: boolean;
    delivery?: boolean;
  };
}

export const OrderTypeModal: React.FC<OrderTypeModalProps> = ({
  isOpen,
  onClose,
  selectedType,
  onSelectType,
  allowClose = true,
  availableTypes = { dine_in: true, takeaway: true, delivery: true },
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
          {/* Dine-In Option */}
          <button
            type="button"
            disabled={!availableTypes.dine_in}
            onClick={() => availableTypes.dine_in && onSelectType('dine_in')}
            className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
              !availableTypes.dine_in 
                ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
                : selectedType === 'dine_in'
                ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                !availableTypes.dine_in 
                  ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                  : selectedType === 'dine_in'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100'
              }`}>
                <UtensilsCrossed size={22} />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  Dine-In
                  {!availableTypes.dine_in && (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-sm">
                      Unavailable
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Order and eat at the restaurant table.
                </p>
              </div>
            </div>

            {selectedType === 'dine_in' && availableTypes.dine_in && (
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Check size={14} />
              </div>
            )}
          </button>

          {/* Takeaway Option */}
          <button
            type="button"
            disabled={!availableTypes.takeaway}
            onClick={() => availableTypes.takeaway && onSelectType('takeaway')}
            className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
              !availableTypes.takeaway
                ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
                : selectedType === 'takeaway'
                ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                !availableTypes.takeaway
                  ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                  : selectedType === 'takeaway'
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200'
              }`}>
                <ShoppingBag size={22} />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  Takeaway / Store Pickup
                  {!availableTypes.takeaway && (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-sm">
                      Unavailable
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pick up your order directly at the restaurant.
                </p>
              </div>
            </div>

            {selectedType === 'takeaway' && availableTypes.takeaway && (
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                <Check size={14} />
              </div>
            )}
          </button>

          {/* Delivery Option */}
          <button
            type="button"
            disabled={!availableTypes.delivery}
            onClick={() => availableTypes.delivery && onSelectType('delivery')}
            className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
              !availableTypes.delivery
                ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
                : selectedType === 'delivery'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                !availableTypes.delivery
                  ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                  : selectedType === 'delivery'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100'
              }`}>
                <Truck size={22} />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  Delivery to Home
                  {!availableTypes.delivery && (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-sm">
                      Unavailable
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Get your order delivered directly to your doorstep.
                </p>
              </div>
            </div>

            {selectedType === 'delivery' && availableTypes.delivery && (
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
