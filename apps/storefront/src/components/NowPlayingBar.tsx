import { useState } from 'react';

/**
 * Sticky Now-Playing bar per mockup-storefront (lines ~957+).
 * Faked player content — no real audio. Can be dismissed via the close
 * button; state is per-page-load only.
 */
export function NowPlayingBar() {
  const [visible, setVisible] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(70);

  if (!visible) return null;

  return (
    <div className="player" role="region" aria-label="Now playing at Medium Format">
      <div className="pcover">
        <div className="cover-art sm" aria-hidden>
          <div className="grooves" />
        </div>
      </div>
      <div className="pinfo">
        <div className="ptrack">LesAlpx</div>
        <div className="prelease">Floating Points — Promises</div>
      </div>
      <div className="pcontrols">
        <button className="pbtn" aria-label="Previous track" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>
        <button
          type="button"
          className={playing ? 'pplay playing' : 'pplay'}
          onClick={() => setPlaying((v) => !v)}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
        <button className="pbtn" aria-label="Next track" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
      </div>
      <div className="pprog">
        <div className="pbar-wrap" role="progressbar" aria-valuenow={38} aria-valuemin={0} aria-valuemax={100}>
          <div className="pbar-fill" />
          <div className="pbar-thumb" />
        </div>
        <div className="ptimes">
          <span>3:15</span>
          <span>8:31</span>
        </div>
      </div>
      <div className="pvol">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
        <input
          type="range"
          className="pvol-slider"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume"
        />
      </div>
      <button
        className="pclose"
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Close player"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
