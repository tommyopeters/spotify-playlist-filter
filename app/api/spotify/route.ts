import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Cache structure to store all playlists and their tracks
let cache: { playlists: { id: string; name: string; tracks: string[] }[]; timestamp: number } | null = null;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const songName = searchParams.get('songName');

  if (!token || !songName) {
    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  }

  // Check if the cache exists and is valid (1 hour cache expiry)
  if (cache && (Date.now() - cache.timestamp) <= 3600000) {
    const results = searchInCache(cache.playlists, songName);
    return NextResponse.json(results, { status: 200 });
  }

  try {
    let playlists: { id: string; name: string; tracks: string[] }[] = [];

    // Fetch all playlists with pagination
    let playlistsUrl = 'https://api.spotify.com/v1/me/playlists';
    while (playlistsUrl) {
      const playlistsResponse = await axios.get(playlistsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      playlists = playlists.concat(playlistsResponse.data.items.map((item: { id: string; name: string }) => ({
        id: item.id,
        name: item.name,
        tracks: []
      })));
      playlistsUrl = playlistsResponse.data.next;
    }

    // Include "Liked Songs" in the search with pagination
    let likedSongs: string[] = [];
    let likedSongsUrl = 'https://api.spotify.com/v1/me/tracks';
    while (likedSongsUrl) {
      const likedSongsResponse = await axios.get(likedSongsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      likedSongs = likedSongs.concat(likedSongsResponse.data.items.map((item: { track: { name: string } }) => item.track?.name).filter(Boolean));
      likedSongsUrl = likedSongsResponse.data.next;
    }

    // Add "Liked Songs" as a regular playlist
    playlists.push({
      id: 'liked-songs',
      name: 'Liked Songs',
      tracks: likedSongs
    });

    // Fetch tracks for each playlist and update the cache
    for (const playlist of playlists) {
      if (playlist.id !== 'liked-songs') { // Skip fetching tracks for "Liked Songs"
        let tracksUrl = `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`;
        while (tracksUrl) {
          const tracksResponse = await axios.get(tracksUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          playlist.tracks = playlist.tracks.concat(tracksResponse.data.items.map((item: { track: { name: string } }) => item.track?.name).filter(Boolean));
          tracksUrl = tracksResponse.data.next;
        }
      }
    }

    // Update the cache with the new playlists and tracks
    cache = { playlists, timestamp: Date.now() };

    // Search for the song name in the cached tracks
    const searchResults = searchInCache(playlists, songName);
    return NextResponse.json(searchResults, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: 'Error fetching playlists' }, { status: 500 });
  }
}

function searchInCache(playlists: { id: string; name: string; tracks: string[] }[], songName: string): string[] {
  const results: string[] = [];
  for (const playlist of playlists) {
    if (playlist.tracks.some(trackName => trackName.toLowerCase().includes(songName.toLowerCase()))) {
      results.push(playlist.name);
    }
  }
  return results;
}