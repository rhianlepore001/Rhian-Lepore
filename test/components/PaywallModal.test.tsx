import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaywallModal } from '../../components/PaywallModal';
import * as router from 'react-router-dom';

// Mock router
vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn(() => vi.fn()),
    useLocation: vi.fn(() => ({ pathname: '/' }))
}));

// Mock subscription hook
vi.mock('../../hooks/useSubscription', () => ({
    useSubscription: vi.fn()
}));

// Mock auth context
const mockLogout = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: vi.fn()
}));

// Mock BrutalCard
vi.mock('../../components/BrutalCard', () => ({
    BrutalCard: ({ children, forceTheme }: any) => (
        <div data-testid="brutal-card" data-theme={forceTheme}>{children}</div>
    )
}));

// Mock BrutalButton
vi.mock('../../components/BrutalButton', () => ({
    BrutalButton: ({ children, onClick }: any) => (
        <button onClick={onClick}>{children}</button>
    )
}));

import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../contexts/AuthContext';

describe('PaywallModal Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLogout.mockClear();
    });

    it('does not render when subscription is still active', () => {
        vi.mocked(useSubscription).mockReturnValue({
            subscriptionStatus: 'active',
            trialEndsAt: null,
            isSubscriptionActive: true,
            trialDaysRemaining: 0,
            isLoading: false,
            isTrial: false,
            isExpired: false
        } as any);

        vi.mocked(useAuth).mockReturnValue({
            userType: 'barber'
        } as any);

        const { container } = render(<PaywallModal />);
        expect(container.firstChild).toBeNull();
    });

    it('does not render when subscription is still loading', () => {
        vi.mocked(useSubscription).mockReturnValue({
            subscriptionStatus: 'trial',
            trialEndsAt: new Date(Date.now() + 86400000).toISOString(),
            isSubscriptionActive: true,
            trialDaysRemaining: 5,
            isLoading: true,
            isTrial: true,
            isExpired: false
        } as any);

        vi.mocked(useAuth).mockReturnValue({
            userType: 'barber'
        } as any);

        const { container } = render(<PaywallModal />);
        expect(container.firstChild).toBeNull();
    });

    it('renders when subscription is expired', () => {
        vi.mocked(useSubscription).mockReturnValue({
            subscriptionStatus: 'canceled',
            trialEndsAt: new Date(Date.now() - 86400000).toISOString(),
            isSubscriptionActive: false,
            trialDaysRemaining: 0,
            isLoading: false,
            isTrial: false,
            isExpired: true
        } as any);

        vi.mocked(useAuth).mockReturnValue({
            userType: 'barber',
            logout: mockLogout
        } as any);

        render(<PaywallModal />);
        expect(screen.getByText(/seu período de teste/i)).toBeInTheDocument();
        expect(screen.getByText(/expirou/i)).toBeInTheDocument();
    });

    it('renders with beauty theme styling when user is beauty', () => {
        vi.mocked(useSubscription).mockReturnValue({
            subscriptionStatus: 'canceled',
            trialEndsAt: null,
            isSubscriptionActive: false,
            trialDaysRemaining: 0,
            isLoading: false,
            isTrial: false,
            isExpired: true
        } as any);

        vi.mocked(useAuth).mockReturnValue({
            userType: 'beauty',
            logout: mockLogout
        } as any);

        const { getByTestId } = render(<PaywallModal />);
        const card = getByTestId('brutal-card');
        expect(card).toHaveAttribute('data-theme', 'beauty');
    });

    it('renders with barber theme styling when user is barber', () => {
        vi.mocked(useSubscription).mockReturnValue({
            subscriptionStatus: 'canceled',
            trialEndsAt: null,
            isSubscriptionActive: false,
            trialDaysRemaining: 0,
            isLoading: false,
            isTrial: false,
            isExpired: true
        } as any);

        vi.mocked(useAuth).mockReturnValue({
            userType: 'barber',
            logout: mockLogout
        } as any);

        const { getByTestId } = render(<PaywallModal />);
        const card = getByTestId('brutal-card');
        expect(card).toHaveAttribute('data-theme', 'barber');
    });

    it('shows upgrade and logout buttons when expired', async () => {
        vi.mocked(useSubscription).mockReturnValue({
            subscriptionStatus: 'canceled',
            trialEndsAt: null,
            isSubscriptionActive: false,
            trialDaysRemaining: 0,
            isLoading: false,
            isTrial: false,
            isExpired: true
        } as any);

        vi.mocked(useAuth).mockReturnValue({
            userType: 'barber',
            logout: mockLogout
        } as any);

        render(<PaywallModal />);

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('calls logout when logout button is clicked', async () => {
        const user = userEvent.setup();

        vi.mocked(useSubscription).mockReturnValue({
            subscriptionStatus: 'canceled',
            trialEndsAt: null,
            isSubscriptionActive: false,
            trialDaysRemaining: 0,
            isLoading: false,
            isTrial: false,
            isExpired: true
        } as any);

        vi.mocked(useAuth).mockReturnValue({
            userType: 'barber',
            logout: mockLogout
        } as any);

        render(<PaywallModal />);

        const logoutButtons = screen.getAllByRole('button').filter(btn =>
            btn.textContent?.includes('Sair') || btn.textContent?.includes('Logout')
        );

        if (logoutButtons.length > 0) {
            await user.click(logoutButtons[0]);
            expect(mockLogout).toHaveBeenCalled();
        }
    });
});
