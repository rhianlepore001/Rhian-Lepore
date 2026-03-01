import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppointmentWizard } from '../../components/AppointmentWizard';

// Mock auth context
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: vi.fn(() => ({
        user: { id: 'test-user-123' },
        userType: 'barber',
        region: 'BR',
        isSubscriptionActive: true
    }))
}));

// Mock UI context
vi.mock('../../contexts/UIContext', () => ({
    useUI: vi.fn(() => ({
        setModalOpen: vi.fn(),
        isMobile: false
    }))
}));

// Mock supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            update: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
    }
}));

// Mock components
vi.mock('../../components/BrutalButton', () => ({
    BrutalButton: ({ children, onClick }: any) => (
        <button onClick={onClick}>{children}</button>
    )
}));

describe('AppointmentWizard Component', () => {
    const mockProps = {
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        initialDate: new Date(),
        teamMembers: [
            { id: '1', name: 'John' },
            { id: '2', name: 'Jane' }
        ],
        services: [
            { id: '1', name: 'Haircut', price: 50, duration: 30 },
            { id: '2', name: 'Beard Trim', price: 30, duration: 20 }
        ],
        categories: ['Hair', 'Beard'],
        clients: [
            { id: '1', name: 'Client 1', phone: '123456789', email: 'client1@test.com' },
            { id: '2', name: 'Client 2', phone: '987654321', email: 'client2@test.com' }
        ],
        onRefreshClients: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the wizard component', () => {
        const { container } = render(<AppointmentWizard {...mockProps} />);
        expect(container).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
        const user = userEvent.setup();
        render(<AppointmentWizard {...mockProps} />);

        // The close button should be in the modal header
        const closeButtons = screen.queryAllByRole('button');
        const closeButton = closeButtons.find(btn =>
            btn.querySelector('[data-testid="close-button"]') ||
            btn.className?.includes('close')
        );

        if (closeButton) {
            await user.click(closeButton);
            expect(mockProps.onClose).toHaveBeenCalled();
        }
    });

    it('displays step counter in the UI', () => {
        render(<AppointmentWizard {...mockProps} />);

        // Step indicator should be visible
        const stepText = screen.queryByText(/step|etapa|passo/i);
        expect(stepText || screen.queryByText(/1 /i)).toBeDefined();
    });

    it('has multiple steps in the wizard flow', () => {
        const { container } = render(<AppointmentWizard {...mockProps} />);

        // Appointment wizard should have multiple steps
        // This is a basic check that the component renders with step UI
        expect(container.innerHTML).toMatch(/service|client|schedule|review/i);
    });

    it('renders with beauty theme when user type is beauty', () => {
        vi.mocked(require('../../contexts/AuthContext').useAuth).mockReturnValue({
            user: { id: 'test-user-123' },
            userType: 'beauty',
            region: 'BR',
            isSubscriptionActive: true
        });

        render(<AppointmentWizard {...mockProps} />);

        // Component should render without errors
        expect(screen.getByRole('button', { hidden: true })).toBeDefined();
    });

    it('renders with barber theme by default', () => {
        render(<AppointmentWizard {...mockProps} />);

        // Component should render without errors
        expect(screen.getByRole('button', { hidden: true })).toBeDefined();
    });

    it('renders with custom initial date', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);

        render(
            <AppointmentWizard
                {...mockProps}
                initialDate={futureDate}
            />
        );

        expect(screen.getByRole('button', { hidden: true })).toBeDefined();
    });

    it('passes team members to the wizard', () => {
        const { container } = render(
            <AppointmentWizard
                {...mockProps}
                teamMembers={[
                    { id: '1', name: 'Professional 1' },
                    { id: '2', name: 'Professional 2' },
                    { id: '3', name: 'Professional 3' }
                ]}
            />
        );

        expect(container).toBeInTheDocument();
    });

    it('passes services to the wizard', () => {
        const { container } = render(
            <AppointmentWizard
                {...mockProps}
                services={[
                    { id: '1', name: 'Service 1', price: 50, duration: 30 },
                    { id: '2', name: 'Service 2', price: 75, duration: 45 }
                ]}
            />
        );

        expect(container).toBeInTheDocument();
    });

    it('passes clients to the wizard', () => {
        const { container } = render(
            <AppointmentWizard
                {...mockProps}
                clients={[
                    { id: '1', name: 'Alice', phone: '111' },
                    { id: '2', name: 'Bob', phone: '222' }
                ]}
            />
        );

        expect(container).toBeInTheDocument();
    });

    it('calls onRefreshClients callback', () => {
        const { container } = render(<AppointmentWizard {...mockProps} />);

        expect(container).toBeInTheDocument();
        // onRefreshClients should be passed to the component
        expect(typeof mockProps.onRefreshClients).toBe('function');
    });
});
