import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  const { code, codeVerifier } = await req.json();
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI ?? 'http://localhost:3000';

  if (!code || !codeVerifier || !clientId) {
    return NextResponse.json(
      { error: 'Missing authorization code, PKCE verifier, or Spotify client configuration' },
      { status: 400 },
    );
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    const response = await axios.post('https://accounts.spotify.com/api/token', body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });

    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    console.error('Spotify token exchange failed', error);
    return NextResponse.json({ error: 'Unable to exchange Spotify authorization code' }, { status: 500 });
  }
}
