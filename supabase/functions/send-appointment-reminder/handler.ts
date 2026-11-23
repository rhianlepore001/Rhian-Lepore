type JobResult = { sent: number; failed: number; skipped: number };

const json = (status: number, body: unknown, headers?: HeadersInit) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
    });

async function tokensMatch(expected: string, provided: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const [expectedHash, providedHash] = await Promise.all(
        [expected, provided].map(async token =>
            new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token))),
        ),
    );
    let difference = 0;
    for (const [index, byte] of expectedHash.entries()) difference |= byte ^ providedHash[index];
    return difference === 0;
}

export function createReminderJobHandler(secret: string | undefined, runJob: () => Promise<JobResult>) {
    return async (request: Request) => {
        if (request.method !== "POST") return json(405, { error: "method_not_allowed" }, { Allow: "POST" });
        if (!secret || secret.length < 32) return json(503, { error: "reminder_unavailable" });

        const token = request.headers.get("x-reminder-job-token");
        if (!token || token.length > 512 || !await tokensMatch(secret, token)) {
            return json(401, { error: "unauthorized" });
        }

        try {
            const { sent, failed, skipped } = await runJob();
            return json(failed ? 502 : 200, { sent, failed, skipped });
        } catch {
            console.error("reminder_job_failed");
            return json(500, { error: "reminder_failed" });
        }
    };
}

export function escapeReminderHtml(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
