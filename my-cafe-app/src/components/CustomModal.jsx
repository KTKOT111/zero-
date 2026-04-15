import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

export const CustomModal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
      <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 shrink-0">
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{title}</h3>
        {onClose && (
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors bg-slate-100 dark:bg-slate-700 p-1.5 rounded-lg">
            <X size={20} />
          </button>
        )}
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  </div>
);

export const SafeNumberInput = ({ value, onSave, colorClass }) => {
  const [val, setVal] = useState(value == null || value === 0 ? '' : value);
  useEffect(() => {
    setVal(value == null || value === 0 ? '' : value);
  }, [value]);
  return (
    <input
      type="number"
      min="0"
      step="any"
      placeholder="0"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onSave(val === '' ? 0 : parseFloat(val))}
      className={`w-20 md:w-28 p-2 md:p-2.5 text-center border-2 rounded-xl bg-transparent dark:border-slate-600 focus:outline-none font-bold transition-colors ${colorClass}`}
    />
  );
};
