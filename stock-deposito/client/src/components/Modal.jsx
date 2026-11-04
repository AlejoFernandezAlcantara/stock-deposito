import { useEffect } from 'react';

// Modal accesible: cierra con Escape o al hacer clic fuera.
export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/50 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
           className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl"
           onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-2xl leading-none text-muted hover:text-ink">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
