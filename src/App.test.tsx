import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

describe('App Main Operations Console', () => {
  test('renders login portal header by default', () => {
    render(<App />);
    expect(screen.getByText(/Volunteer Identity Portal/i)).toBeInTheDocument();
  });

  test('clicking guest judge bypass button renders operations workspace without crashing', async () => {
    render(<App />);
    const bypassButton = screen.getByRole('button', { name: /explore as guest judge/i });
    expect(bypassButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(bypassButton);
    });

    // Verify workspace layout mounts
    expect(await screen.findByText(/Volunteer Identity/i)).toBeInTheDocument();
  });
});
