import { renderHook, act } from '@testing-library/react';
import { useFavorites } from './useFavorites';

describe('useFavorites user isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('favorites starred by User A do not appear for User B', () => {
    // User A stars inquiry-1
    const { result: userA } = renderHook(() => useFavorites('user-a'));
    act(() => {
      userA.current.toggleStar('inquiry-1');
    });

    expect(userA.current.isStarred('inquiry-1')).toBe(true);

    // User B should NOT see inquiry-1 as starred
    const { result: userB } = renderHook(() => useFavorites('user-b'));
    expect(userB.current.isStarred('inquiry-1')).toBe(false);
  });

  test('unstarring by User B does not affect User A', () => {
    const { result: userA } = renderHook(() => useFavorites('user-a'));
    const { result: userB } = renderHook(() => useFavorites('user-b'));

    // User A stars inquiry-1 and inquiry-2
    act(() => {
      userA.current.setStarred(['inquiry-1', 'inquiry-2'], true);
    });

    // User B stars inquiry-2 and unstars it
    act(() => {
      userB.current.setStarred(['inquiry-2'], true);
    });
    expect(userB.current.isStarred('inquiry-2')).toBe(true);

    act(() => {
      userB.current.toggleStar('inquiry-2');
    });
    expect(userB.current.isStarred('inquiry-2')).toBe(false);

    // User A must STILL have inquiry-1 and inquiry-2 starred!
    expect(userA.current.isStarred('inquiry-1')).toBe(true);
    expect(userA.current.isStarred('inquiry-2')).toBe(true);
  });

  test('switching user reloads the corresponding user favorites', () => {
    localStorage.setItem('inquireos_starred_inquiries_manager-1', JSON.stringify(['inquiry-100']));
    localStorage.setItem('inquireos_starred_inquiries_agent-1', JSON.stringify(['inquiry-200']));

    const { result, rerender } = renderHook(({ userId }) => useFavorites(userId), {
      initialProps: { userId: 'manager-1' },
    });

    expect(result.current.isStarred('inquiry-100')).toBe(true);
    expect(result.current.isStarred('inquiry-200')).toBe(false);

    // Switch to agent-1
    rerender({ userId: 'agent-1' });

    expect(result.current.isStarred('inquiry-100')).toBe(false);
    expect(result.current.isStarred('inquiry-200')).toBe(true);
  });
});
