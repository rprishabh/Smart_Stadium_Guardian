import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders operations center header title', () => {
  render(<App />);
  const headerElement = screen.getByRole('heading', { name: /STADIUM GUARDIAN/i });
  expect(headerElement).toBeInTheDocument();
});
