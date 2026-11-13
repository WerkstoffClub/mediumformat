import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listReleases } from '../api/storefront';
import { playableTracks, type PlayableTrack } from '../lib/preview';

function clock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

/**
 * Sticky Now-Playing bar (mockup-storefront). Plays the real track previews of
 * in-stock catalogue releases (featured first), as set in the back-office release
 * editor. Hidden when no release has a playable preview. Starts paused: browsers
 * block autoplay with sound.
 */
export function NowPlayingBar() {
  const [queue, setQueue] = useState<PlayableTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    listReleases({ limit: 48 })
      .then(rs => { if (alive) setQueue(playableTracks(rs)); })
      .catch(() => { if (alive) setQueue([]); });
    return () => { alive = false; };
  }, []);

  const track = queue[index] ?? null;

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume, track]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !track) return;
    setTime({ current: 0, duration: 0 });
    if (playing) a.play().catch(() => setPlaying(false));
    // Only react to a track change here; play/pause is handled by toggle().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.url]);

  useEffect(() => () => audioRef.current?.pause(), []);

  if (!visible || !track) return null;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else { a.pause(); setPlaying(false); }
  };
  const step = (d: number) => setIndex(i => (i + d + queue.length) % queue.length);
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !time.duration) return;
    const box = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - box.left) / box.width) * time.duration;
  };
  const pct = time.duration ? Math.min(100, (time.current / time.duration) * 100) : 0;
  const { release } = track;

  return (
    <div className="player" role="region" aria-label="Now playing at Medium Format">
      <audio
        ref={audioRef}
        src={track.url}
        preload="none"
        onTimeUpdate={e => setTime({ current: e.currentTarget.currentTime, duration: e.currentTarget.duration || 0 })}
        onLoadedMetadata={e => setTime(t => ({ ...t, duration: e.currentTarget.duration || 0 }))}
        onEnded={() => (queue.length > 1 ? step(1) : setPlaying(false))}
        onError={() => { if (queue.length > 1) step(1); else setQueue([]); }}
      />
      <div className="pcover">
        <div className="cover-art sm" aria-hidden>
          <div className="grooves" />
        </div>
      </div>
      <div className="pinfo">
        <div className="ptrack">{track.title}</div>
        <div className="prelease">
          {release.slug ? <Link to={`/releases/${release.slug}`}>{release.artist} — {release.title}</Link> : `${release.artist} — ${release.title}`}
        </div>
      </div>
      <div className="pcontrols">
        <button className="pbtn" aria-label="Previous track" type="button" onClick={() => step(-1)} disabled={queue.length < 2}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>
        <button type="button" className={playing ? 'pplay playing' : 'pplay'} onClick={toggle} aria-label={playing ? 'Pause' : 'Play preview'}>
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
        <button className="pbtn" aria-label="Next track" type="button" onClick={() => step(1)} disabled={queue.length < 2}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
      </div>
      <div className="pprog">
        <div className="pbar-wrap" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} onClick={seek}>
          <div className="pbar-fill" style={{ width: `${pct}%` }} />
          <div className="pbar-thumb" style={{ left: `${pct}%` }} />
        </div>
        <div className="ptimes">
          <span>{clock(time.current)}</span>
          <span>{clock(time.duration)}</span>
        </div>
      </div>
      <div className="pvol">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
        <input type="range" className="pvol-slider" min={0} max={100} value={volume} onChange={e => setVolume(Number(e.target.value))} aria-label="Volume" />
      </div>
      <button className="pclose" type="button" onClick={() => { audioRef.current?.pause(); setVisible(false); }} aria-label="Close player">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
