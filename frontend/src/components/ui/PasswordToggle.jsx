import { Eye, EyeOff } from 'lucide-react';

export default function PasswordToggle({ show, onToggle, id }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
      aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
      aria-controls={id}
      tabIndex={-1}
    >
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}
