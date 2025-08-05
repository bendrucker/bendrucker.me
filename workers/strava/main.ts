import { Strava } from 'strava';
import { logger } from '@workspace/logger';

export interface Env {
	STRAVA_CLIENT_ID: string;
	STRAVA_CLIENT_SECRET: string;
	STRAVA_USER_ID: string;
	STRAVA_KV: KVNamespace;
}

interface StoredTokens {
	access_token: string;
	refresh_token: string;
	expires_at: number;
	updated_at: string;
}


async function getStravaClient(env: Env): Promise<Strava> {
	const storedTokens = await env.STRAVA_KV.get('tokens', 'json') as StoredTokens | null;

	if (!storedTokens) {
		throw new Error('No Strava tokens available. Complete OAuth flow at /authorize');
	}

	return new Strava({
		client_id: env.STRAVA_CLIENT_ID,
		client_secret: env.STRAVA_CLIENT_SECRET,
		on_token_refresh: async (response) => {
			logger.info('Token refreshed automatically by Strava client');
			await env.STRAVA_KV.put('tokens', JSON.stringify({
				access_token: response.access_token,
				refresh_token: response.refresh_token || '',
				expires_at: response.expires_at,
				updated_at: new Date().toISOString(),
			}));
		}
	}, {
		access_token: storedTokens.access_token,
		expires_at: storedTokens.expires_at,
		refresh_token: storedTokens.refresh_token,
	});
}

async function fetchStravaData(env: Env) {
	const strava = await getStravaClient(env);

	try {
		// Fetch athlete info
		const athlete = await strava.athletes.getLoggedInAthlete();
		logger.info({ athlete_id: athlete.id, name: `${athlete.firstname} ${athlete.lastname}` }, 'Fetched athlete data');

		// Store athlete data
		await env.STRAVA_KV.put('athlete', JSON.stringify({
			...athlete,
			updated_at: new Date().toISOString(),
		}));

		// TODO: Fetch recent activities
		// const activities = await strava.activities.getLoggedInAthleteActivities({
		//   per_page: 10
		// });

		return { success: true, athlete_name: `${athlete.firstname} ${athlete.lastname}` };
	} catch (error) {
		logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch Strava data');
		throw error;
	}
}

export default {
	async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(
			(async () => {
				try {
					logger.info(await fetchStravaData(env), 'Strava data refresh completed');
				} catch (error) {
					logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Strava scheduled task failed');
				}
			})()
		);
	},

	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		switch (url.pathname) {
			case '/health':
				return new Response('OK', { status: 200 });

			case '/authorize':
				const params = new URLSearchParams({
					client_id: env.STRAVA_CLIENT_ID,
					response_type: 'code',
					redirect_uri: `${url.origin}/callback`,
					approval_prompt: 'force',
					scope: 'read,activity:read_all',
				});
				return Response.redirect(`https://www.strava.com/oauth/authorize?${params}`, 302);

			case '/callback':
				if (!url.searchParams.get('code')) {
					return new Response('Authorization code not provided', { status: 400 });
				}

				try {
					const strava = await Strava.createFromTokenExchange({
						client_id: env.STRAVA_CLIENT_ID,
						client_secret: env.STRAVA_CLIENT_SECRET,
						on_token_refresh: async (response) => {
							logger.info('Initial token received via OAuth');
							await env.STRAVA_KV.put('tokens', JSON.stringify({
								access_token: response.access_token,
								refresh_token: response.refresh_token || '',
								expires_at: response.expires_at,
								updated_at: new Date().toISOString(),
							}));
						}
					}, url.searchParams.get('code')!);

					// Get athlete info to verify user ID
					const athlete = await strava.athletes.getLoggedInAthlete();

					// Verify this is your user ID
					if (athlete.id !== parseInt(env.STRAVA_USER_ID)) {
						logger.warn({ athlete_id: athlete.id, expected: env.STRAVA_USER_ID }, 'Unauthorized athlete attempted OAuth');
						return new Response('Unauthorized athlete', { status: 403 });
					}

					logger.info({ athlete_id: athlete.id }, 'OAuth tokens stored successfully');
					return new Response('OAuth complete! Tokens stored successfully.', { status: 200 });
				} catch (error) {
					logger.error({ error: error instanceof Error ? error.message : String(error) }, 'OAuth callback failed');
					return new Response('OAuth failed', { status: 500 });
				}

			default:
				return new Response('Not Found', { status: 404 });
		}
	},
} satisfies ExportedHandler<Env>;
