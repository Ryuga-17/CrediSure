import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from './protectedRoute';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('ProtectedRoute', () => {
  const push = vi.fn();

  beforeEach(() => {
    push.mockClear();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
  });

  it('renders nothing and does not redirect while auth state is still loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      loading: true,
    } as ReturnType<typeof useAuth>);

    const { container } = render(
      <ProtectedRoute>
        <div>secret content</div>
      </ProtectedRoute>
    );

    expect(container).toBeEmptyDOMElement();
    expect(push).not.toHaveBeenCalled();
  });

  it('redirects to /signup once loading finishes and the user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      loading: false,
    } as ReturnType<typeof useAuth>);

    render(
      <ProtectedRoute>
        <div>secret content</div>
      </ProtectedRoute>
    );

    expect(push).toHaveBeenCalledWith('/signup');
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });

  it('renders children once the user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    } as ReturnType<typeof useAuth>);

    render(
      <ProtectedRoute>
        <div>secret content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('secret content')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
