import { useState, useEffect } from 'react';

export default function Timer({ timeStartedEpoch, timeLimitSeconds, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);

  useEffect(() => {
    if (!timeStartedEpoch || !timeLimitSeconds) return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - timeStartedEpoch) / 1000);
      const remaining = Math.max(0, timeLimitSeconds - elapsedSeconds);
      
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(intervalId);
        onTimeUp();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeStartedEpoch, timeLimitSeconds, onTimeUp]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isWarning = timeLeft <= 10;

  return (
    <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-2 rounded-xl transition-colors ${
      isWarning ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-gray-800 text-brand-400'
    }`}>
      {formatTime(timeLeft)}
    </div>
  );
}
