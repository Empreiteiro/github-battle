import type { Context } from '@netlify/functions';

// GitHub OAuth callback — exchanges code for access token, then redirects
// back to the app with the token as a query param.
export default async function handler(request: Request, _context: Context) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Missing code parameter', { status: 400 });
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response('OAuth not configured', { status: 500 });
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenRes.ok) {
      return new Response('Failed to exchange code', { status: 500 });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return new Response('No access token received', { status: 500 });
    }

    // Redirect back to the app with the token
    const origin = url.origin.replace('/.netlify/functions', '');
    const redirectUrl = `${origin}/?auth_token=${accessToken}`;

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl },
    });
  } catch {
    return new Response('OAuth exchange failed', { status: 500 });
  }
}
