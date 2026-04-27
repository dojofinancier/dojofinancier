const CRON_PATH = "/api/cron/weekly-recap";

function getBaseUrl(): string | null {
  return (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL ||
    null
  );
}

export default async () => {
  const baseUrl = getBaseUrl();
  const secret = process.env.CRON_SECRET;

  if (!baseUrl || !secret) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Missing URL/DEPLOY_URL or CRON_SECRET",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }

  const url = `${baseUrl}${CRON_PATH}?secret=${encodeURIComponent(secret)}`;
  const upstream = await fetch(url, { method: "GET" });
  const text = await upstream.text();

  return new Response(text, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
};

export const config = {
  schedule: "0 23 * * 0",
};
