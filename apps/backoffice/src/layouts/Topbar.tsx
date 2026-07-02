import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../hooks/useAuth';

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const initials = user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) ?? 'MF';

  const submitSearch = () => {
    const q = term.trim();
    navigate(q ? `/inventory?q=${encodeURIComponent(q)}` : '/inventory');
  };

  return (
    <header className="h-[52px] bg-[#0d0d0d] border-b border-[#1e1e1e] flex items-center px-5 gap-3 flex-shrink-0">
      <div className="flex items-center gap-2 bg-[#161616] border border-[#232323] rounded-md px-3 py-1.5 flex-1 max-w-[460px]">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#444] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          className="bg-transparent border-none outline-none text-[#bbb] text-[12px] w-full placeholder:text-[#333]"
          placeholder="Search releases — artist, title, label, cat# or barcode…"
          value={term}
          onChange={e => setTerm(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitSearch(); }}
          aria-label="Search inventory"
        />
      </div>

      <div className="flex-1" />

      <ThemeToggle />

      <button
        onClick={logout}
        title="Sign out"
        className="w-7 h-7 rounded-full bg-[var(--brand)] flex items-center justify-center text-[10px] font-black text-white cursor-pointer hover:opacity-80 transition-opacity"
      >
        {initials}
      </button>
    </header>
  );
}
