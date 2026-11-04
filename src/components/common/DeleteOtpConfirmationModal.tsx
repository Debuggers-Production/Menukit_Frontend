import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Mail, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface DeleteOtpConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  targetName?: string;
  itemCount?: number;
  itemLabel?: string;
  description?: string;
  userEmail?: string | null;
  otpCode: string;
  onOtpChange: (code: string) => void;
  onConfirm: () => void;
  onResendOtp?: () => Promise<void> | void;
  isLoading?: boolean;
  confirmButtonText?: string;
}

export const DeleteOtpConfirmationModal: React.FC<DeleteOtpConfirmationModalProps> = ({
  isOpen,
  onClose,
  title = "Delete Category",
  targetName,
  itemCount,
  itemLabel = "menu items",
  description,
  userEmail,
  otpCode,
  onOtpChange,
  onConfirm,
  onResendOtp,
  isLoading = false,
  confirmButtonText = "Confirm Delete",
}) => {
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [isResending, setIsResending] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset countdown and auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setResendTimer(30);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen || resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, resendTimer]);

  const handleResend = async () => {
    if (resendTimer > 0 || isResending || !onResendOtp) return;
    setIsResending(true);
    try {
      await onResendOtp();
      setResendTimer(30);
    } finally {
      setIsResending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && otpCode.length === 6 && !isLoading) {
      e.preventDefault();
      onConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      hideCloseButton
      className="max-w-md p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-2xl"
    >
      {/* Top Rose Accent Strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />

      {/* Header */}
      <div className="p-4 sm:p-5 pb-3 border-b border-border/70 flex items-center justify-between gap-3 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 size={16} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground leading-tight">
              {title}
            </h3>
            <span className="text-[11px] text-muted-foreground font-medium">
              Permanent Deletion Authorization
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          disabled={isLoading}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Warning & Context Target Card */}
        <div className="rounded-xl border border-rose-200/90 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/25 p-3.5 space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={17} />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-bold text-xs sm:text-sm text-rose-950 dark:text-rose-100 truncate">
                  {targetName || "Selected Item"}
                </span>
                {itemCount !== undefined && (
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-rose-200/80 dark:bg-rose-900/70 text-rose-800 dark:text-rose-200 shrink-0">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300/90 leading-relaxed">
                {description || (
                  <>
                    Deleting this category will permanently erase all{' '}
                    <strong className="font-bold text-rose-900 dark:text-rose-100">
                      {itemCount ?? 0} {itemLabel}
                    </strong>{' '}
                    linked inside it. This action cannot be undone.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Email OTP Delivery Notice & Resend */}
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 border border-border/80 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 min-w-0">
            <Mail size={15} className="text-primary shrink-0" />
            <span className="truncate">
              Code sent to{' '}
              <strong className="text-foreground font-semibold">
                {userEmail || 'registered email'}
              </strong>
            </span>
          </div>

          {onResendOtp && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendTimer > 0 || isResending || isLoading}
              className="text-primary hover:underline font-bold text-[11px] shrink-0 disabled:opacity-50 disabled:no-underline cursor-pointer flex items-center gap-1 transition-opacity"
            >
              {isResending ? (
                <>
                  <RefreshCw size={11} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : resendTimer > 0 ? (
                <span>Resend in {resendTimer}s</span>
              ) : (
                <span>Resend Code</span>
              )}
            </button>
          )}
        </div>

        {/* 6-Digit Segmented OTP Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldAlert size={13} className="text-rose-500" />
              <span>Enter 6-Digit Security OTP</span>
            </label>
            <span className="text-[10px] font-mono font-semibold text-muted-foreground">
              {otpCode.length}/6 digits
            </span>
          </div>

          <div
            className="relative cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            {/* 6 Visual Segmented Boxes */}
            <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const digit = otpCode[index] || '';
                const isCurrent =
                  otpCode.length === index ||
                  (otpCode.length === 6 && index === 5);

                return (
                  <div
                    key={index}
                    className={cn(
                      "h-12 sm:h-13 rounded-xl border flex items-center justify-center font-mono text-xl sm:text-2xl font-bold transition-all select-none shadow-2xs",
                      digit
                        ? "border-rose-400/80 dark:border-rose-600/80 bg-rose-50/40 dark:bg-rose-950/20 text-foreground"
                        : "border-border bg-muted/20 text-muted-foreground/30",
                      isCurrent && !digit && "ring-2 ring-rose-500/30 border-rose-500 bg-background"
                    )}
                  >
                    {digit ? (
                      digit
                    ) : isCurrent ? (
                      <span className="w-0.5 h-5 bg-rose-500 animate-pulse rounded-full" />
                    ) : (
                      <span className="text-muted-foreground/30 text-sm">•</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hidden Input Layer for native keyboard, auto-tab, paste, and accessibility */}
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={otpCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                onOtpChange(val);
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="6-Digit OTP"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 font-semibold text-xs h-9.5 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={otpCode.length < 6 || isLoading}
            leftIcon={<Trash2 size={14} />}
            className="flex-1 font-bold text-xs h-9.5 rounded-lg shadow-sm"
          >
            {confirmButtonText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

