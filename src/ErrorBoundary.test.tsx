import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

const ProblemChild = () => {
  throw new Error('Test Security Exception');
};

const GoodChild = () => <div>Normal Content</div>;

describe('ErrorBoundary Component', () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  test('renders children normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  test('catches child component errors and displays Security Exception UI', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );
    expect(screen.getByText(/SECURITY CORE EXCEPTION/i)).toBeInTheDocument();
  });
});
