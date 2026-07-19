import React from 'react';
import { render, screen } from '@testing-library/react';
import CCTVGrid from './CCTVGrid';
import { TelemetryPoint } from '../types/telemetry';

const mockTelemetry: TelemetryPoint[] = [
  {
    zoneId: 'Zone A (North Gate)',
    gateCapacityPercentage: 95,
    securityThroughputPerMin: 10,
    concessionWaitTimeMins: 25,
    activeIncidentsCount: 3,
    timestamp: Date.now(),
  },
  {
    zoneId: 'Zone B (East Concourse)',
    gateCapacityPercentage: 45,
    securityThroughputPerMin: 30,
    concessionWaitTimeMins: 5,
    activeIncidentsCount: 0,
    timestamp: Date.now(),
  },
];

describe('CCTVGrid Component', () => {
  test('renders all 4 camera stream tiles', () => {
    render(<CCTVGrid telemetry={mockTelemetry} />);
    expect(screen.getByText(/CAM-01 · North Gate/i)).toBeInTheDocument();
    expect(screen.getByText(/CAM-02 · East Concourse/i)).toBeInTheDocument();
    expect(screen.getByText(/CAM-03 · South Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/CAM-04 · VIP Gate/i)).toBeInTheDocument();
  });

  test('displays critical density alert badge when capacity > 90%', () => {
    render(<CCTVGrid telemetry={mockTelemetry} />);
    expect(screen.getByText(/Critical ⚠/i)).toBeInTheDocument();
  });
});
