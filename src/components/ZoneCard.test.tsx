import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ZoneCard from './ZoneCard';
import { TelemetryPoint } from '../types/telemetry';

const mockPoint: TelemetryPoint = {
  zoneId: 'Zone A (North Gate)',
  gateCapacityPercentage: 92,
  securityThroughputPerMin: 14,
  concessionWaitTimeMins: 20,
  activeIncidentsCount: 2,
  timestamp: Date.now(),
};

describe('ZoneCard Component', () => {
  beforeAll(() => {
    (window as any).ethereum = {};
  });

  test('renders zone title and capacity percentage correctly', () => {
    render(<ZoneCard point={mockPoint} onClick={jest.fn()} />);
    expect(screen.getByText(/Zone A \(North Gate\)/i)).toBeInTheDocument();
    expect(screen.getByText(/92%/i)).toBeInTheDocument();
  });

  test('triggers onClick handler when card is clicked', () => {
    const handleClick = jest.fn();
    render(<ZoneCard point={mockPoint} onClick={handleClick} />);
    const card = screen.getByText(/Zone A \(North Gate\)/i);
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('triggers onDeployVolunteer callback when deploy button is clicked', () => {
    const handleDeploy = jest.fn();
    render(
      <ZoneCard
        point={mockPoint}
        onClick={jest.fn()}
        onDeployVolunteer={handleDeploy}
      />
    );
    const deployBtn = screen.getByRole('button', { name: /deploy volunteer/i });
    fireEvent.click(deployBtn);
    expect(handleDeploy).toHaveBeenCalledWith('Zone A (North Gate)');
  });
});
