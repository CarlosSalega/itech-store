"use client";

import { useActionState } from "react";

import { signIn, type SignInState } from "./actions";
import { LoginFields } from "./login-fields";

const EMPTY: SignInState = { error: null };

export function LoginForm({ next }: { next: string }) {
	const [state, action] = useActionState(signIn, EMPTY);

	return <LoginFields action={action} error={state.error} next={next} />;
}
