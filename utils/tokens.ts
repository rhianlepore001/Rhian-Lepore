/**
 * Simple Token Utility for Magic Links (Rescheduling)
 * Note: For high security, use JWTs signed by the backend.
 * This is a lightweight implementation for the "Quick Wins" phase.
 */

export const generateRescheduleToken = async (bookingId: string, secret: string): Promise<string> => {
    const data = new TextEncoder().encode(`${bookingId}-${secret}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

export const validateRescheduleToken = async (bookingId: string, token: string, secret: string): Promise<boolean> => {
    const expectedToken = await generateRescheduleToken(bookingId, secret);
    return token === expectedToken;
};
