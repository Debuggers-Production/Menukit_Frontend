import { useEffect } from 'react';
import { X } from 'lucide-react';

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText?: string;
}

export function Lightbox({ isOpen, onClose, imageUrl, altText = 'Image' }: LightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <button 
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-[100000] p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors cursor-pointer"
        title="Close (Esc)"
      >
        <X size={24} />
      </button>
      
      <div className="relative w-full h-full p-4 md:p-10 flex items-center justify-center pointer-events-none">
        <img 
          src={imageUrl} 
          alt={altText} 
          className="max-w-full max-h-full object-contain animate-in zoom-in-95 duration-200 pointer-events-auto cursor-default shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
