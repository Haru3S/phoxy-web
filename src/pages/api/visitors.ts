import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const token = import.meta.env.VISITORS_SECRET_KEY;

  if (!token) {
    return new Response(
      JSON.stringify({
        schemaVersion: 1,
        label: "Visitors",
        message: "Unavailable",
        color: "red",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  const projectId = "prj_xoi6SXbscklfbqGvJZqEO5daBTe2";
  const teamId = "team_tqDmqdeS7moRP9uyZ6C4bwFM";

  try {
    const url = new URL(
      "https://api.vercel.com/v1/query/web-analytics/visits/count",
    );

    url.searchParams.set("projectId", projectId);
    url.searchParams.set("teamId", teamId);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Vercel API returned ${response.status}`);
    }

    const result = await response.json();
    const visitors = result?.data?.visitors ?? 0;

    return new Response(
      JSON.stringify({
        schemaVersion: 1,
        label: "Visitors",
        message: String(visitors),
        color: "b7bdf8",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch Vercel Analytics:", error);

    return new Response(
      JSON.stringify({
        schemaVersion: 1,
        label: "Visitors",
        message: "Unavailable",
        color: "red",
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};