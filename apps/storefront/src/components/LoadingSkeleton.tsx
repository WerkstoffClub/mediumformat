interface LoadingSkeletonProps {
  count?: number;
  height?: number;
  className?: string;
}

/**
 * Minimal, monochrome skeleton. Used while lists load.
 * Renders `count` blocks; the container decides layout (grid/flex).
 */
export function LoadingSkeleton({
  count = 4,
  height = 240,
  className,
}: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={className}
          style={{
            height,
            background: 'var(--raised)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-lg)',
            animation: 'mf-pulse 1.4s ease-in-out infinite',
            opacity: 0.65,
          }}
        />
      ))}
      <style>{`
        @keyframes mf-pulse {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 0.65; }
        }
      `}</style>
    </>
  );
}
