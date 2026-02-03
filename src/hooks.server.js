import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';

function isProd() {
	return process.env.NODE_ENV === 'production';
}

function isStaticOrAsset(pathname) {
	return (
		pathname.startsWith('/_app/') ||
		pathname.startsWith('/favicon') ||
		pathname.startsWith('/robots') ||
		pathname.startsWith('/manifest') ||
		pathname.startsWith('/icons') ||
		pathname.startsWith('/static/')
	);
}

function isAuthRoute(pathname) {
	return pathname === '/login' || pathname.startsWith('/api/auth/');
}

function isProtectedRoute(pathname) {
	if (isStaticOrAsset(pathname)) return false;
	if (isAuthRoute(pathname)) return false;
	return pathname.startsWith('/dashboard') || pathname.startsWith('/api/');
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const pocketBaseUrl = env.POCKETBASE_URL;

	// Expose a PocketBase client per-request (server only).
	if (pocketBaseUrl) {
		const pb = new PocketBase(pocketBaseUrl);
		pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

		// Refresh token when valid; if refresh fails, clear session.
		if (pb.authStore.isValid) {
			try {
				const authCollection = pb.authStore?.record?.collectionName || 'users';
				await pb.collection(authCollection).authRefresh();
			} catch {
				pb.authStore.clear();
			}
		}

		event.locals.pb = pb;
		event.locals.user = pb.authStore?.record || null;
	} else {
		event.locals.pb = null;
		event.locals.user = null;
	}

	const pathname = event.url.pathname;
	const requiresAuth = isProtectedRoute(pathname);
	const isAuthed = Boolean(event.locals.user);

	if (requiresAuth && !isAuthed) {
		if (pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'content-type': 'application/json' }
			});
		}

		throw redirect(303, '/login');
	}

	const response = await resolve(event);

	// Persist auth changes back to an httpOnly cookie.
	if (event.locals.pb) {
		const cookie = event.locals.pb.authStore.exportToCookie({
			httpOnly: true,
			secure: isProd(),
			sameSite: 'Lax',
			path: '/'
		});
		if (cookie) response.headers.append('set-cookie', cookie);
	}

	return response;
}
