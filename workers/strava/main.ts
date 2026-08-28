import { Strava, type RefreshTokenResponse } from "strava";
import { logger } from "@workspace/logger";

type Env = Required<Cloudflare.Env> & {
  STRAVA_CLIENT_SECRET: string;
};

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  updated_at: string;
}

function serializeTokens(response: RefreshTokenResponse): string {
  return JSON.stringify({
    access_token: response.access_token,
    refresh_token: response.refresh_token || "",
    expires_at: response.expires_at,
    updated_at: new Date().toISOString(),
  } satisfies StoredTokens);
}

async function getStravaClient(
  env: Env,
  ctx: ExecutionContext,
): Promise<Strava> {
  const storedTokens = (await env.KV.get(
    "tokens",
    "json",
  )) as StoredTokens | null;

  if (!storedTokens) {
    throw new Error(
      "No Strava tokens available. Complete OAuth flow at /authorize",
    );
  }

  return new Strava(
    {
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      // The client types this callback as returning void, so anything async
      // here is dropped on the floor. The refresh happens lazily inside an
      // API call, with no caller able to await it. waitUntil keeps the worker
      // alive for the write, which would otherwise race the request that
      // triggered the refresh and lose the rotated token. The catch reports a
      // rejection that has nowhere else to surface.
      on_token_refresh: (response) => {
        logger.info("Token refreshed automatically by Strava client");
        ctx.waitUntil(
          env.KV.put("tokens", serializeTokens(response)).catch(
            (error: unknown) => {
              logger.error(
                {
                  error: error instanceof Error ? error.message : String(error),
                },
                "Failed to persist refreshed Strava tokens",
              );
            },
          ),
        );
      },
    },
    {
      access_token: storedTokens.access_token,
      expires_at: storedTokens.expires_at,
      refresh_token: storedTokens.refresh_token,
    },
  );
}

async function fetchStravaData(env: Env, ctx: ExecutionContext) {
  const strava = await getStravaClient(env, ctx);

  try {
    // Fetch athlete info
    const athlete = await strava.athletes.getLoggedInAthlete();
    logger.info(
      {
        athlete_id: athlete.id,
        name: `${athlete.firstname} ${athlete.lastname}`,
      },
      "Fetched athlete data",
    );

    // Store athlete data
    await env.KV.put(
      "athlete",
      JSON.stringify({
        ...athlete,
        updated_at: new Date().toISOString(),
      }),
    );

    // TODO: Fetch recent activities
    // const activities = await strava.activities.getLoggedInAthleteActivities({
    //   per_page: 10
    // });

    return {
      success: true,
      athlete_name: `${athlete.firstname} ${athlete.lastname}`,
    };
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to fetch Strava data",
    );
    throw error;
  }
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      (async () => {
        try {
          logger.info(
            await fetchStravaData(env, ctx),
            "Strava data refresh completed",
          );
        } catch (error) {
          logger.error(
            { error: error instanceof Error ? error.message : String(error) },
            "Strava scheduled task failed",
          );
        }
      })(),
    );
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/health":
        return new Response("OK", { status: 200 });

      case "/authorize":
        const params = new URLSearchParams({
          client_id: env.STRAVA_CLIENT_ID,
          response_type: "code",
          redirect_uri: `${url.origin}/callback`,
          approval_prompt: "force",
          scope: "read,activity:read_all",
        });
        return Response.redirect(
          `https://www.strava.com/oauth/authorize?${params}`,
          302,
        );

      case "/callback":
        if (!url.searchParams.get("code")) {
          return new Response("Authorization code not provided", {
            status: 400,
          });
        }

        try {
          // The callback's return value is discarded by the client, so an
          // await inside it cannot fail the request. The exchange is the only
          // source of these tokens, so the write happens below, where a
          // rejection can surface as a 500.
          let issuedTokens: RefreshTokenResponse | undefined;
          const strava = await Strava.createFromTokenExchange(
            {
              client_id: env.STRAVA_CLIENT_ID,
              client_secret: env.STRAVA_CLIENT_SECRET,
              on_token_refresh: (response) => {
                logger.info("Initial token received via OAuth");
                issuedTokens = response;
              },
            },
            url.searchParams.get("code")!,
          );

          if (!issuedTokens) {
            throw new Error("Strava token exchange returned no tokens");
          }

          const athlete = await strava.athletes.getLoggedInAthlete();

          // Anyone can hand this endpoint a code for their own Strava account.
          // The identity check has to clear before the write, or authorizing
          // with a different account overwrites the stored credentials and the
          // 403 below reports a rejection that already took effect.
          if (athlete.id !== parseInt(env.STRAVA_USER_ID)) {
            logger.warn(
              { athlete_id: athlete.id, expected: env.STRAVA_USER_ID },
              "Unauthorized athlete attempted OAuth",
            );
            return new Response("Unauthorized athlete", { status: 403 });
          }

          await env.KV.put("tokens", serializeTokens(issuedTokens));

          logger.info(
            { athlete_id: athlete.id },
            "OAuth tokens stored successfully",
          );
          return new Response("OAuth complete! Tokens stored successfully.", {
            status: 200,
          });
        } catch (error) {
          logger.error(
            { error: error instanceof Error ? error.message : String(error) },
            "OAuth callback failed",
          );
          return new Response("OAuth failed", { status: 500 });
        }

      default:
        return new Response("Not Found", { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;
