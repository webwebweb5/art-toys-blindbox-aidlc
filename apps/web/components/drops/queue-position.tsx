'use client';

interface QueuePositionProps {
  position: number;
  estimatedWaitSeconds: number;
}

export function QueuePosition({ position, estimatedWaitSeconds }: QueuePositionProps) {
  const minutes = Math.ceil(estimatedWaitSeconds / 60);

  return (
    <div className="text-center p-6 bg-white rounded-2xl shadow-lg">
      <p className="text-sm text-gray-500 uppercase tracking-wide">Your Position</p>
      <p className="text-5xl font-bold text-primary-500 my-3">#{position}</p>
      <p className="text-sm text-gray-500">
        Estimated wait: <span className="font-medium">{minutes} min{minutes > 1 ? 's' : ''}</span>
      </p>
      <div className="mt-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-400 to-accent-500 rounded-full animate-pulse"
            style={{ width: `${Math.min(100, Math.max(5, 100 - position))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
