import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Link } from 'react-router-dom';
import { PageHeader, Panel } from '../../components/ui/Page';

export function Preferences() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader title="Preferences" sub="Account, appearance and integrations" />

      <Panel title="Account">
        <div className="space-y-2 text-[12px] p-1">
          <div className="flex justify-between"><span className="text-[var(--text-muted)]">Name</span><span className="text-[var(--text-primary)]">{user?.name}</span></div>
          <div className="flex justify-between"><span className="text-[var(--text-muted)]">Email</span><span className="font-mono text-[var(--text-primary)]">{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-[var(--text-muted)]">Role</span><span className="text-[var(--text-primary)]">{user?.role}</span></div>
        </div>
      </Panel>

      <Panel title="Appearance">
        <div className="flex items-center justify-between p-1">
          <div>
            <p className="text-[12px] text-[var(--text-primary)]">Theme</p>
            <p className="text-[10px] text-[var(--text-muted)]">Dark is the house default; the accent always inverts with it.</p>
          </div>
          <button
            onClick={toggle}
            className="text-[11px] px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors capitalize"
          >
            {theme} — switch
          </button>
        </div>
      </Panel>

      <Panel title="Integrations">
        <div className="space-y-2.5 p-1 text-[12px]">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[var(--text-primary)]">DealPOS sync</p>
              <p className="text-[10px] text-[var(--text-muted)]">Products, orders, customers — status on the Finance page</p>
            </div>
            <Link to="/sales" className="text-[11px] text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]">Open</Link>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[var(--text-primary)]">Meta catalogue &amp; WhatsApp</p>
              <p className="text-[10px] text-[var(--text-muted)]">Feed URL, Buy-Now template and IG/FB settings</p>
            </div>
            <Link to="/social" className="text-[11px] text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]">Open</Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}
