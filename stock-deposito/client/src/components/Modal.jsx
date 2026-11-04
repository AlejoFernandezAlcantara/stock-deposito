import { IconClose } from './Icons.jsx';
import { useEffect } from 'react';

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-xs p-0 sm:p-4 transition-all">
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-label={title}
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-card p-5 sm:p-6 shadow-2xl border border-line max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between pb-3 border-b border-line">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button 
            onClick={onClose} 
            aria-label="Cerrar" 
            className="rounded-lg p-1 text-muted hover:bg-paper hover:text-ink transition-colors cursor-pointer"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
