import { PanelHeader } from './PanelHeader';
import { CHANNELS } from './shared';
import type { SectionProps } from './types';

export function Channels({ value, onChange }: SectionProps) {
  const channels = value.channelListings ?? ['website', 'pos'];

  const toggle = (key: string) => {
    const on = channels.includes(key);
    const next = on ? channels.filter((c) => c !== key) : [...channels, key];
    onChange({ channelListings: next });
  };

  return (
    <PanelHeader number={5} title="Channels" note="Where this release is listed">
      <div className="space-y-1.5">
        {CHANNELS.map(([key, name, meta]) => {
          const on = channels.includes(key);
          const priceLabel =
            key === 'website' && value.priceIdr
              ? `Rp ${Number(value.priceIdr).toLocaleString('id-ID')}`
              : meta;
          return (
            <label
              key={key}
              className="flex items-center gap-3 px-2.5 py-2 rounded-[6px] hover:bg-[var(--bg-overlay)] cursor-pointer"
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() => toggle(key)}
              />
              <span
                className={`w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center flex-shrink-0 ${
                  on
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)]'
                    : 'border-[var(--border)] text-transparent'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="text-[13px] text-[var(--text-primary)] flex-1">{name}</span>
              <span className="text-[11px] text-[var(--text-muted)]">{priceLabel}</span>
            </label>
          );
        })}
      </div>
    </PanelHeader>
  );
}
