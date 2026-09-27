import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeeklyVolumeChart } from './WeeklyVolumeChart';
import { TeamComparisonChart } from './TeamComparisonChart';
import { StatusDonutChart } from './StatusDonutChart';
import { TeamLeaderModal, type TeamLeaderDetail } from './TeamLeaderModal';

describe('Analytics Components', () => {
  it('renders WeeklyVolumeChart with weeks and labels', () => {
    const data = [
      { week: 'Wk 1', total: 6, resolved: 1 },
      { week: 'Wk 2', total: 5, resolved: 3 },
    ];
    render(<WeeklyVolumeChart data={data} title="WEEKLY VOLUME" />);
    expect(screen.getByText('WEEKLY VOLUME')).toBeDefined();
    expect(screen.getByText('Wk 1')).toBeDefined();
    expect(screen.getByText('Wk 2')).toBeDefined();
  });

  it('renders TeamComparisonChart with team groups', () => {
    const data = [
      { id: 'alpha', name: 'Alpha Team', total: 15, resolved: 5 },
      { id: 'beta', name: 'Beta Team', total: 14, resolved: 6 },
    ];
    render(<TeamComparisonChart data={data} title="TEAM COMPARISON" />);
    expect(screen.getByText('TEAM COMPARISON')).toBeDefined();
    expect(screen.getByText('Alpha Team')).toBeDefined();
    expect(screen.getByText('Beta Team')).toBeDefined();
  });

  it('renders StatusDonutChart with status labels and counts', () => {
    const slices = [
      { id: 'new', label: 'New', count: 3, color: '#06b6d4' },
      { id: 'ongoing', label: 'In Progress', count: 8, color: '#d97706' },
    ];
    render(<StatusDonutChart data={slices} title="STATUS DISTRIBUTION" />);
    expect(screen.getByText('STATUS DISTRIBUTION')).toBeDefined();
    expect(screen.getByText('New')).toBeDefined();
    expect(screen.getByText('In Progress')).toBeDefined();
  });

  it('renders TeamLeaderModal with leader details and member table', () => {
    const leader: TeamLeaderDetail = {
      id: 'leader-1',
      name: 'Alice Chen',
      teamName: 'Alpha Team',
      avatarInitials: 'AC',
      specialistsCount: 3,
      monthLabel: 'August',
      year: 2026,
      members: [
        {
          id: 'sp-1',
          name: 'Bob Martinez',
          avatarInitials: 'BM',
          total: 5,
          new: 1,
          inProgress: 1,
          pending: 0,
          resolved: 2,
          rate: 40,
        },
      ],
      statusDistribution: [
        { id: 'completed', label: 'Resolved', count: 5, color: '#047857' },
      ],
    };

    render(<TeamLeaderModal leader={leader} onClose={() => {}} />);
    expect(screen.getByText('Alice Chen')).toBeDefined();
    expect(screen.getByText(/Alpha Team · 3 specialists · August 2026/)).toBeDefined();
    expect(screen.getByText('Bob Martinez')).toBeDefined();
    expect(screen.getByText('MEMBER PERFORMANCE')).toBeDefined();
  });
});
