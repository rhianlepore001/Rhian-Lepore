import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const reviewRating = z.number().int().min(1).max(5);
export const REVIEW_COMMENT_LIMIT = 500;
export const PUBLIC_REVIEW_PAGE_SIZE = 6;

const inviteSchema = z.object({
    status: z.enum(['pending', 'ready', 'reviewed', 'unavailable']),
    business_name: z.string().nullish(),
    business_slug: z.string().nullish(),
    user_type: z.string().nullish(),
    region: z.string().nullish(),
    timezone: z.string().nullish(),
    appointment_time: z.string().nullish(),
    rating: reviewRating.nullish(),
});

const pageSchema = z.object({
    average: z.number().nullable(),
    total: z.number().int().nonnegative(),
    reviews: z.array(z.object({
        id: z.string(),
        rating: reviewRating,
        comment: z.string().nullable(),
        created_at: z.string(),
    })),
});

const issuedInviteSchema = z.discriminatedUnion('status', [
    z.object({ status: z.literal('ready'), token: z.string().uuid() }),
    z.object({ status: z.literal('reviewed') }),
]);

export async function fetchPublicCustomerReviews(businessId: string, offset: number) {
    const { data, error } = await supabase.rpc('get_public_customer_reviews', {
        p_business_id: businessId,
        p_offset: offset,
    });
    if (error) throw error;
    return pageSchema.parse(data);
}

export async function fetchCustomerReviewInvite(token: string) {
    const { data, error } = await supabase.rpc('get_customer_review_invite', { p_token: token });
    if (error) throw error;
    return inviteSchema.parse(data);
}

export async function submitCustomerReview(token: string, rating: number, comment: string) {
    const { data, error } = await supabase.rpc('submit_customer_review', {
        p_token: token,
        p_rating: rating,
        p_comment: comment.trim() || null,
    });
    if (error) throw error;
    return inviteSchema.parse(data);
}

export async function issueCustomerReviewInvite(appointmentId: string) {
    const { data, error } = await supabase.rpc('create_appointment_review_invite', {
        p_appointment_id: appointmentId,
    });
    if (error) throw error;
    return issuedInviteSchema.parse(data);
}
