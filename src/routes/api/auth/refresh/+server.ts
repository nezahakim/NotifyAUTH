import { json, type RequestHandler } from '@sveltejs/kit';
import { refreshSession } from '$lib/server/auth';
import { decodeHashedToken, hashToken } from '@notifycode/hash-it';
import { HASH_IT_KEY, MOBILE_REQUEST_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {

	const authHeader = request.headers.get('Authorization');
	const token = authHeader?.replace('Bearer ', '');
	const body = await request.json();

	let tokenToBeUsed;

	if (body && token) {
		const { mobile_request, key } = body;

		const shouldDecode = mobile_request && key === MOBILE_REQUEST_KEY;

		if (shouldDecode) {
			try {
				tokenToBeUsed = decodeHashedToken({
					token,
					key: HASH_IT_KEY
				});
			} catch (err) {
				console.error('Failed to decode hashed token:', err);
			}
		} else {
			tokenToBeUsed = token;
		}
	}

	if (!tokenToBeUsed) {
		return json({ error: 'Unauthorized - attempt detected AUTH_ERROR_TBT' }, { status: 401 });
	}

	try {
		const { accessToken } = await refreshSession(tokenToBeUsed);
		const hashedAccToken = hashToken({
			token: accessToken,
			key: HASH_IT_KEY
		});

		return json({ accessToken: hashedAccToken });
	} catch (error) {
		console.error('Error refreshing session:', error);
		return json({ error: 'Invalid CRT01' }, { status: 401 });
	}
};
