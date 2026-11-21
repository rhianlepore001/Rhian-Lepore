import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
    fetchCustomerReviewInvite,
    fetchPublicCustomerReviews,
    PUBLIC_REVIEW_PAGE_SIZE,
} from '@/services/customerReviews';

export const PUBLIC_CUSTOMER_REVIEWS_KEY = ['public-customer-reviews'] as const;
export const customerReviewInviteKey = (token: string | null) => ['customer-review-invite', token] as const;

export function usePublicCustomerReviews(businessId: string | null) {
    return useInfiniteQuery({
        queryKey: [...PUBLIC_CUSTOMER_REVIEWS_KEY, businessId],
        queryFn: ({ pageParam }) => fetchPublicCustomerReviews(businessId!, pageParam),
        enabled: Boolean(businessId),
        initialPageParam: 0,
        getNextPageParam: (page, _, offset) => offset + page.reviews.length < page.total
            ? offset + PUBLIC_REVIEW_PAGE_SIZE
            : undefined,
        staleTime: 30_000,
    });
}

export function useCustomerReviewInvite(token: string | null) {
    return useQuery({
        queryKey: customerReviewInviteKey(token),
        queryFn: () => fetchCustomerReviewInvite(token!),
        enabled: Boolean(token),
        retry: false,
    });
}
