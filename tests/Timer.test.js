import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Timer from '../src/components/Timer';

describe('Timer Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders correctly and formats time', () => {
    const timeLimit = 60; // 1 minute
    const start = Date.now();
    render(<Timer timeStartedEpoch={start} timeLimitSeconds={timeLimit} onTimeUp={() => {}} />);
    
    // Check initial render, should be "1:00"
    expect(screen.getByText('1:00')).toBeInTheDocument();
  });

  it('counts down and triggers onTimeUp when reaching 0', () => {
    const onTimeUpMock = vi.fn();
    const timeLimit = 15;
    const start = Date.now();
    
    render(<Timer timeStartedEpoch={start} timeLimitSeconds={timeLimit} onTimeUp={onTimeUpMock} />);
    
    expect(screen.getByText('0:15')).toBeInTheDocument();
    
    // Advance time by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('0:10')).toBeInTheDocument();
    
    // Advance time by another 10 seconds to hit 0
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(onTimeUpMock).toHaveBeenCalledTimes(1);
  });

  it('applies warning styling when time is low (<= 10 seconds)', () => {
    const timeLimit = 12;
    const start = Date.now();
    
    const { container } = render(<Timer timeStartedEpoch={start} timeLimitSeconds={timeLimit} onTimeUp={() => {}} />);
    
    // Low time warning classes should NOT be applied initially
    let div = container.firstChild;
    expect(div.className).toContain('bg-gray-800');
    expect(div.className).not.toContain('text-red-500');
    
    // Advance 3 seconds (remaining time 9, which is <= 10)
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    div = container.firstChild;
    expect(div.className).toContain('text-red-500');
    expect(div.className).toContain('bg-red-500/20');
  });

  it('exits early and does not set interval if params are missing', () => {
    const { container } = render(<Timer onTimeUp={() => {}} />);
    expect(container).toBeDefined();
    
    // Should render empty since timeLeft is undefined or defaults to undefined
    expect(container.firstChild.textContent).toBe('');
  });
});
