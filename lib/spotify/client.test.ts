import { afterEach, describe, expect, test } from "bun:test";
import { getTracks, searchTracks } from "./client";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

function track(id: string) {
  return {
    id,
    name: `Track ${id}`,
    uri: `spotify:track:${id}`,
    duration_ms: 180_000,
    explicit: false,
    artists: [{ id: "artist-id", name: "Artist" }],
    album: {
      id: "album-id",
      name: "Album",
      release_date: "2020-01-01",
      images: [],
    },
  };
}

describe("Spotify track cache", () => {
  test("reuses tracks returned by search instead of refetching them as seeds", async () => {
    const id = "0123456789abcdefghijkl";
    const cached = track(id);
    let calls = 0;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls++;
      const url = String(input);
      if (url.includes("/search")) {
        return json({ tracks: { items: [cached] } });
      }
      if (url.includes(`/tracks/${id}`)) return json(cached);
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    await searchTracks("token", "cached", { limit: 1 });
    const seeds = await getTracks("token", [id, id]);

    expect(calls).toBe(1);
    expect(seeds.map((item) => item.id)).toEqual([id]);
  });

  test("retries a dropped GET request", async () => {
    const id = "retry123456789abcdefgh";
    const retried = track(id);
    let calls = 0;

    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) throw new TypeError("fetch failed");
      return json(retried);
    }) as unknown as typeof fetch;

    const seeds = await getTracks("token", [id]);

    expect(calls).toBe(2);
    expect(seeds.map((item) => item.id)).toEqual([id]);
  });
});
