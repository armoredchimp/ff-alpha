import { type AuthUser } from 'aws-amplify/auth';

interface RegStatus {
	completed: boolean;
	username: string;
}

interface UserState {
	user: AuthUser | null;
	regStatus: RegStatus | null;
}

const initialState: UserState = {
	user: null,
	regStatus: null,
};

export let userStore = $state<UserState>(initialState);
let user = $derived(userStore.user);

export function setUser(user: AuthUser | null): void {
	userStore.user = user;
}

export function setRegStatus(status: RegStatus | null): void {
	userStore.regStatus = status;
}

export function resetUserStore(): void {
	userStore.user = initialState.user;
	userStore.regStatus = initialState.regStatus;
}

export function getUser(){
	return user;
}

let registrationStatus = $derived(userStore.regStatus);

export function getRegStatus(){
	return registrationStatus;
}

export function isAuthUser(value: any): value is AuthUser {
	return value !== null && typeof value === 'object' && 'username' in value;
}

export function regStatusT(value: any): value is RegStatus {
	return (
		value !== null &&
		typeof value === 'object' &&
		'completed' in value &&
		typeof value.completed === 'boolean' &&
		'username' in value &&
		typeof value.username === 'string'
	);
}