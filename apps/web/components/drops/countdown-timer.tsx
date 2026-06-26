'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  targetDate: string | Date;
  onComplete?: () => void;
}

export function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const left = getTimeLeft(targetDate);
      setTimeLeft(left);
      if (left.total <= 0) {
        clearInterval(timer);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (timeLeft.total <= 0) {
    return <span className="text-green-600 font-bold">LIVE NOW!</span>;
  }

  return (
    <div className="flex gap-2 text-center">
      <TimeBlock value={timeLeft.days} label="Days" />
      <span className="text-2xl font-bold self-start mt-1">:</span>
      <TimeBlock value={timeLeft.hours} label="Hrs" />
      <span className="text-2xl font-bold self-start mt-1">:</span>
      <TimeBlock value={timeLeft.minutes} label="Min" />
      <span className="text-2xl font-bold self-start mt-1">:</span>
      <TimeBlock value={timeLeft.seconds} label="Sec" />
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-gray-900 text-white rounded-lg px-3 py-2 min-w-[50px]">
      <p className="text-xl font-mono font-bold">{String(value).padStart(2, '0')}</p>
      <p className="text-[10px] uppercase text-gray-400">{label}</p>
    </div>
  );
}

function getTimeLeft(targetDate: string | Date) {
  const total = new Date(targetDate).getTime() - Date.now();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}
