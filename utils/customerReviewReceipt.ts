const REVIEW_TOKEN_PATTERN = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;

export function isCustomerReviewToken(token: string | null | undefined): token is string {
    return Boolean(token && REVIEW_TOKEN_PATTERN.test(token));
}

const receiptKey = (businessId: string, bookingId: string) => `agendix-review:${businessId}:${bookingId}`;

export function saveCustomerReviewReceipt(businessId: string, bookingId: string, token: string) {
    try {
        localStorage.setItem(receiptKey(businessId, bookingId), token);
    } catch {
        return;
    }
}

export function getCustomerReviewReceipt(businessId: string, bookingId: string): string | null {
    try {
        const token = localStorage.getItem(receiptKey(businessId, bookingId));
        return isCustomerReviewToken(token) ? token : null;
    } catch {
        return null;
    }
}
