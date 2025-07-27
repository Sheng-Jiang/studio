import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddQuestionPage from '@/app/add-question/page';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

const mockPush = jest.fn();
const mockToast = jest.fn();

global.fetch = jest.fn();

describe('AddQuestionPage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (fetch as jest.Mock).mockClear();
    mockPush.mockClear();
    mockToast.mockClear();
  });

  it('renders the form correctly', () => {
    render(<AddQuestionPage />);
    expect(screen.getByRole('heading', { name: /add a new question/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/topic/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/question/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/answer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add question/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(<AddQuestionPage />);
    fireEvent.click(screen.getByRole('button', { name: /add question/i }));

    await waitFor(() => {
      expect(screen.getByText('Topic must be at least 2 characters.')).toBeInTheDocument();
      expect(screen.getByText('Question must be at least 10 characters.')).toBeInTheDocument();
      expect(screen.getByText('Answer cannot be empty.')).toBeInTheDocument();
    });
  });

  it('submits the form successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    render(<AddQuestionPage />);

    fireEvent.change(screen.getByLabelText(/topic/i), { target: { value: 'New Topic' } });
    fireEvent.change(screen.getByLabelText(/question/i), { target: { value: 'This is a valid question for testing.' } });
    fireEvent.change(screen.getByLabelText(/answer/i), { target: { value: 'A valid answer.' } });

    fireEvent.click(screen.getByRole('button', { name: /add question/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/add-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'New Topic',
          question: 'This is a valid question for testing.',
          answer: 'A valid answer.',
        }),
      });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Question Added',
        description: 'Your new question has been saved.',
      });
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('handles submission failure', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    render(<AddQuestionPage />);

    fireEvent.change(screen.getByLabelText(/topic/i), { target: { value: 'New Topic' } });
    fireEvent.change(screen.getByLabelText(/question/i), { target: { value: 'This is a valid question for testing.' } });
    fireEvent.change(screen.getByLabelText(/answer/i), { target: { value: 'A valid answer.' } });

    fireEvent.click(screen.getByRole('button', { name: /add question/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Something went wrong',
        description: 'Could not save the question. Please try again.',
      });
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
