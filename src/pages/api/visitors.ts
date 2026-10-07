import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const token = import.meta.env.VISITORS_SECRET_KEY;

  if (!token) {
    return new Response(
      JSON.stringify({
        error: "VISITORS_SECRET_KEY is not configured",
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

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Failed to fetch Vercel Analytics:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to fetch Vercel Analytics",
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