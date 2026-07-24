"use client"

import React, { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000";
const SPOTIFY_SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
].join(" ");

const generateCodeVerifier = () => {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const generateCodeChallenge = async (verifier: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );

  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const App = () => {
  const [token, setToken] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [songName, setSongName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [searchInitiated, setSearchInitiated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");

      if (!code) {
        return;
      }

      const codeVerifier = sessionStorage.getItem("spotify_code_verifier");
      if (!codeVerifier) {
        setAuthError("Spotify login session expired. Please try again.");
        return;
      }

      try {
        const response = await fetch("/api/spotify/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, codeVerifier }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to complete Spotify login");
        }

        if (!data.access_token) {
          throw new Error("Spotify did not return an access token");
        }

        sessionStorage.removeItem("spotify_code_verifier");
        setToken(data.access_token);
        window.history.replaceState({}, "", REDIRECT_URI);
      } catch (error) {
        console.error("Spotify login failed", error);
        setAuthError(error instanceof Error ? error.message : "Spotify login failed");
      }
    };

    void exchangeCodeForToken();
  }, []);

  const loginWithSpotify = async () => {
    if (!SPOTIFY_CLIENT_ID) {
      setAuthError("Missing NEXT_PUBLIC_SPOTIFY_CLIENT_ID in your environment.");
      return;
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    sessionStorage.setItem("spotify_code_verifier", codeVerifier);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: SPOTIFY_CLIENT_ID,
      scope: SPOTIFY_SCOPES,
      redirect_uri: REDIRECT_URI,
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
      show_dialog: "false",
    });

    window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
  };

  const searchSongInPlaylists = async () => {
    if (!songName || !token) return;

    setSearchInitiated(true);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/spotify?token=${token}&songName=${encodeURIComponent(songName)}`);
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Error searching song in playlists", error);
      }
    });
  };

  return (
    <div className="wrapper grid grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <Card className="mx-auto max-w-2xl p-6">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">Spotify Playlist Filter</h1>
          </CardHeader>
          <CardContent>
            {!token ? (
              <div className="flex flex-col gap-3">
                <Button
                  onClick={loginWithSpotify}
                  style={{ backgroundColor: "#1DB954", color: "white" }}
                >
                  Connect Spotify
                </Button>
                {authError && <p className="text-sm text-red-600">{authError}</p>}
              </div>
            ) : (
              <>
                <Input
                  type="text"
                  placeholder="Enter song name"
                  className="mb-4"
                  value={songName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSongName(e.target.value)}
                />
                <Button
                  onClick={searchSongInPlaylists}
                  style={{ backgroundColor: "#1DB954", color: "white" }}
                >
                  Search
                </Button>

                {isPending && (
                  <div className="mt-6 w-full">
                    <Progress />
                  </div>
                )}

                {!isPending && searchResults.length > 0 && (
                  <div className="mt-6">
                    <h2 className="font-semibold">Playlists containing &quot;{songName}&quot;:</h2>
                    <ul className="list-disc list-inside">
                      {searchResults.map((playlist: string, index: number) => (
                        <li key={"playlist" + index}>{playlist}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!isPending && searchInitiated && searchResults.length === 0 && songName && (
                  <p className="mt-6">No playlists found containing &quot;{songName}&quot;.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default App;
