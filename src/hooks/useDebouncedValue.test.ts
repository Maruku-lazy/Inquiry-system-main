import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

// Fake timers let us "fast-forward" past the 350ms delay instantly instead
// of the test actually waiting 350 real milliseconds — same behavior,
// runs in microseconds.
describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a'));
    expect(result.current).toBe('a');
  });

  test('does NOT update before the delay has elapsed', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    act(() => {
      vi.advanceTimersByTime(200); // still under the 350ms default
    });

    expect(result.current).toBe('a'); // hasn't caught up yet
  });

  test('updates once the delay has fully elapsed', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current).toBe('b');
  });

  test('rapid changes reset the timer — only the LAST value ever gets committed', () => {
    // This is exactly the "don't fire a request on every keystroke"
    // behavior the whole hook exists for — worth pinning down explicitly.
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'M' },
    });

    rerender({ value: 'Ma' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: 'Mar' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: 'Maria' });
    act(() => vi.advanceTimersByTime(100));

    expect(result.current).toBe('M'); // still hasn't settled — each keystroke reset the clock

    act(() => vi.advanceTimersByTime(350));
    expect(result.current).toBe('Maria'); // only the final value ever commits
  });
});
