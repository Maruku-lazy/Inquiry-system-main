import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InquiryFilterBar, EMPTY_INQUIRY_FILTERS, type InquiryFiltersState } from './InquiryFilterBar';

// InquiryFilterBar is a fully "controlled" component (value + onChange
// props) — exactly like ActiveInquiriesPage/CompletedInquiriesPage/etc.
// actually use it. A real useState wrapper is required to test it
// properly: a plain variable mutated inside onChange would never trigger
// a re-render, so the component would keep seeing stale props no matter
// how many times onChange fired — this bit us on the first pass writing
// these tests, worth remembering for any other controlled-component test.
function Wrapper({
  canSearchAssignee = true,
  initial = EMPTY_INQUIRY_FILTERS,
  onChangeSpy,
}: {
  canSearchAssignee?: boolean;
  initial?: InquiryFiltersState;
  onChangeSpy?: (next: InquiryFiltersState) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <InquiryFilterBar
      value={value}
      onChange={(next) => {
        setValue(next);
        onChangeSpy?.(next);
      }}
      canSearchAssignee={canSearchAssignee}
    />
  );
}

describe('InquiryFilterBar', () => {
  test('search placeholder mentions "assigned rep" only when canSearchAssignee is true', () => {
    render(<Wrapper canSearchAssignee />);
    expect(screen.getByPlaceholderText(/assigned rep/i)).toBeInTheDocument();
  });

  test('search placeholder omits "assigned rep" for roles that cannot search by it (e.g. Sales)', () => {
    render(<Wrapper canSearchAssignee={false} />);
    expect(screen.queryByPlaceholderText(/assigned rep/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search id or customer name/i)).toBeInTheDocument();
  });

  test('the Month dropdown starts disabled — Month is meaningless without a Year', () => {
    render(<Wrapper />);
    expect(screen.getByDisplayValue('All months')).toBeDisabled();
  });

  test('selecting a Year enables the Month dropdown', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const yearSelect = screen.getByDisplayValue('All years');
    await user.selectOptions(yearSelect, new Date().getFullYear().toString());

    expect(screen.getByDisplayValue('All months')).toBeEnabled();
  });

  test('clearing the Year back to "All years" also clears any selected Month', async () => {
    // This is the one genuinely non-obvious bit of logic in this
    // component (the `if (key === 'postedYear' && !v) next.postedMonth = ''`
    // guard) — exactly the kind of behavior a future refactor could
    // silently break without a test catching it.
    const onChangeSpy = vi.fn();
    render(
      <Wrapper
        initial={{ ...EMPTY_INQUIRY_FILTERS, postedYear: '2026', postedMonth: '7' }}
        onChangeSpy={onChangeSpy}
      />,
    );

    const user = userEvent.setup();
    await user.selectOptions(screen.getByDisplayValue('2026'), '');

    expect(onChangeSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ postedYear: '', postedMonth: '' }),
    );
  });

  test('typing in the search box calls onChange once per keystroke, accumulating correctly', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<Wrapper onChangeSpy={onChangeSpy} />);

    await user.type(screen.getByPlaceholderText(/search id, customer/i), 'Maria');

    // Called once per keystroke — onChange itself doesn't debounce (that's
    // the caller's job via useDebouncedValue), so 5 keystrokes = 5 calls.
    expect(onChangeSpy).toHaveBeenCalledTimes(5);
    expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'Maria' }));
  });
});
