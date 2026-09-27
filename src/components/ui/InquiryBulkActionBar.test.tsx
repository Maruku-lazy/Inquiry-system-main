import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { InquiryBulkActionBar } from './InquiryBulkActionBar';

describe('InquiryBulkActionBar', () => {
  it('renders total items count and master checkbox', () => {
    render(
      <InquiryBulkActionBar
        totalVisible={5}
        selectedCount={0}
        onToggleSelectAll={vi.fn()}
        onSelectPreset={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );

    expect(screen.getByText('5 items')).toBeInTheDocument();
    expect(screen.getByLabelText(/select all visible/i)).not.toBeChecked();
  });

  it('renders preset options dropdown when chevron is clicked', async () => {
    const user = userEvent.setup();
    const onSelectPreset = vi.fn();

    render(
      <InquiryBulkActionBar
        totalVisible={5}
        selectedCount={0}
        onToggleSelectAll={vi.fn()}
        onSelectPreset={onSelectPreset}
        onClearSelection={vi.fn()}
      />
    );

    const dropdownBtn = screen.getByTitle('Selection options');
    await user.click(dropdownBtn);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('Starred')).toBeInTheDocument();
    expect(screen.getByText('Unstarred')).toBeInTheDocument();

    await user.click(screen.getByText('Read'));
    expect(onSelectPreset).toHaveBeenCalledWith('read');
  });

  it('displays Priority and 3-dot menu when items are selected', async () => {
    const user = userEvent.setup();
    const onMarkAsRead = vi.fn();
    const onMarkAsComplete = vi.fn();
    const onSetPriority = vi.fn();
    const onClearSelection = vi.fn();

    render(
      <InquiryBulkActionBar
        totalVisible={5}
        selectedCount={2}
        onToggleSelectAll={vi.fn()}
        onSelectPreset={vi.fn()}
        onClearSelection={onClearSelection}
        onSetPriority={onSetPriority}
        onMarkAsRead={onMarkAsRead}
        onMarkAsComplete={onMarkAsComplete}
        completeActionLabel="Mark Complete"
      />
    );

    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByTitle('More bulk actions')).toBeInTheDocument();

    // Priority dropdown
    await user.click(screen.getByText('Priority'));
    expect(screen.getByText('Critical')).toBeInTheDocument();
    await user.click(screen.getByText('Critical'));
    expect(onSetPriority).toHaveBeenCalledWith('critical');

    // 3-dot overflow menu
    await user.click(screen.getByTitle('More bulk actions'));
    expect(screen.getByText('Mark as Read')).toBeInTheDocument();
    expect(screen.getByText('Mark Complete')).toBeInTheDocument();

    await user.click(screen.getByText('Mark as Read'));
    expect(onMarkAsRead).toHaveBeenCalled();

    await user.click(screen.getByText('(Clear)'));
    expect(onClearSelection).toHaveBeenCalled();
  });
});
