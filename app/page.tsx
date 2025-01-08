"use client"

// App.jsx
import React, { useState, useTransition } from "react";
import { SpotifyAuth, Scopes } from "react-spotify-auth";
import "react-spotify-auth/dist/index.css"; // Import styles for SpotifyAuth
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";


const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID; // Update this to your app's client ID
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI; // Update this to your app's URI

const App = () => {
  const [token, setToken] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [songName, setSongName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [searchInitiated, setSearchInitiated] = useState(false);


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
    <div className="wrapper grid grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 font-[family-name:var(--font-geist-sans)]"
    >

      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start"><Card className="mx-auto max-w-2xl p-6">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Spotify Playlist Filter</h1>
        </CardHeader>
        <CardContent>
          {!token ? (
            <SpotifyAuth
              redirectUri={REDIRECT_URI}
              clientID={SPOTIFY_CLIENT_ID}
              scopes={[Scopes.playlistReadPrivate, Scopes.playlistReadCollaborative, Scopes.userLibraryRead]}
              onAccessToken={(accessToken: string) => setToken(accessToken)}
            />
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
                      <li key={'playlist' + index}>{playlist}</li>
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
