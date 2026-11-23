export type AttemptLimits = {
	windowMs: number;
	max: number;
};

export type AttemptState = {
	count: number;
	expiresAt: number;
};

export type AttemptDecision = {
	allowed: boolean;
	state: AttemptState;
};

export const LOGIN_LIMITS: AttemptLimits = {
	windowMs: 10 * 60 * 1000,
	max: 5,
};

export function loginAttemptKey(email: string): string {
	return email.trim().toLowerCase();
}

export function decideAttempt(
	state: AttemptState | undefined,
	now: number,
	limits: AttemptLimits,
): AttemptDecision {
	if (state === undefined || now >= state.expiresAt) {
		return {
			allowed: true,
			state: { count: 1, expiresAt: now + limits.windowMs },
		};
	}

	if (state.count >= limits.max) {
		return { allowed: false, state };
	}

	return {
		allowed: true,
		state: { count: state.count + 1, expiresAt: state.expiresAt },
	};
}

const attempts = new Map<string, AttemptState>();

function forgetExpired(now: number): void {
	for (const [key, state] of attempts) {
		if (now >= state.expiresAt) attempts.delete(key);
	}
}

export function allowLoginAttempt(key: string, now: number): boolean {
	forgetExpired(now);

	const decision = decideAttempt(attempts.get(key), now, LOGIN_LIMITS);
	attempts.set(key, decision.state);

	return decision.allowed;
}

export function clearLoginAttempts(key: string): void {
	attempts.delete(key);
}

export function resetLoginAttempts(): void {
	attempts.clear();
}
