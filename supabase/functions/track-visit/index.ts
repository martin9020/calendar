const DEFAULT_ALLOWED_ORIGINS = "https://martin9020.github.io,https://www.steelit.site,https://steelit.site";
const DEFAULT_COOLDOWN_MINUTES = 1440;

const SITE_META: Record<string, { label: string; title: string; tags: string; clickUrl: string }> = {
  "ofrinio-holiday-site": {
    label: "holiday-site",
    title: "Ofrinio website visit",
    tags: "house,beach",
    clickUrl: "https://martin9020.github.io/ofrinio-holiday-site/"
  },
  "steelit-portfolio-site": {
    label: "Steelit website",
    title: "Steelit website visit",
    tags: "building,steel",
    clickUrl: "https://www.steelit.site/"
  }
};

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

function textEnv(name: string, fallback = "") {
  return (Deno.env.get(name) || fallback).trim();
}

function getAllowedOrigins() {
  const configuredOrigins = textEnv("VISIT_ALLOWED_ORIGINS");
  const origins = configuredOrigins
    ? `${DEFAULT_ALLOWED_ORIGINS},${configuredOrigins}`
    : DEFAULT_ALLOWED_ORIGINS;

  return [...new Set(origins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean))];
}

function corsHeaders(origin: string | null) {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0] || DEFAULT_ALLOWED_ORIGINS;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, ...corsHeaders(origin) }
  });
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function getSiteMeta(site: string) {
  return SITE_META[site] || {
    label: site || "website",
    title: "Website visit",
    tags: textEnv("NTFY_TAGS", "bell"),
    clickUrl: textEnv("VISIT_CLICK_URL", "https://martin9020.github.io/")
  };
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function sha256Hex(value: string) {
  const input = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getSupabaseSecretKey() {
  const legacy = textEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;

  const secretKeys = textEnv("SUPABASE_SECRET_KEYS");
  if (!secretKeys) return "";

  try {
    const parsed = JSON.parse(secretKeys);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      const values = Object.values(parsed);
      const first = values.find((value) => typeof value === "string");
      return typeof first === "string" ? first : "";
    }
  } catch {
    return "";
  }

  return "";
}

function supabaseHeaders(secretKey: string) {
  return {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json"
  };
}

async function hasRecentNotification(
  supabaseUrl: string,
  secretKey: string,
  site: string,
  ipHash: string,
  cooldownMinutes: number
) {
  const since = new Date(Date.now() - cooldownMinutes * 60_000).toISOString();
  const params = new URLSearchParams({
    select: "id",
    site: `eq.${site}`,
    ip_hash: `eq.${ipHash}`,
    notified: "eq.true",
    created_at: `gte.${since}`,
    limit: "1"
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/visit_events?${params}`, {
    headers: supabaseHeaders(secretKey)
  });

  if (!response.ok) throw new Error(`recent visit check failed: ${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function insertVisitEvent(
  supabaseUrl: string,
  secretKey: string,
  row: Record<string, unknown>
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/visit_events`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(secretKey),
      Prefer: "return=minimal"
    },
    body: JSON.stringify(row)
  });

  if (!response.ok) throw new Error(`visit insert failed: ${response.status}`);
}

async function publishNtfy(message: string, site: string) {
  const topic = textEnv("NTFY_TOPIC");
  if (!topic) return false;

  const meta = getSiteMeta(site);
  const baseUrl = textEnv("NTFY_BASE_URL", "https://ntfy.sh").replace(/\/+$/, "");
  const token = textEnv("NTFY_BEARER_TOKEN");
  const headers: Record<string, string> = {
    Title: meta.title,
    Priority: textEnv("NTFY_PRIORITY", "3"),
    Tags: textEnv(`NTFY_TAGS_${site.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`, meta.tags),
    Click: textEnv(`VISIT_CLICK_URL_${site.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`, meta.clickUrl)
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}/${encodeURIComponent(topic)}`, {
    method: "POST",
    headers,
    body: message
  });

  if (!response.ok) throw new Error(`ntfy publish failed: ${response.status}`);
  return true;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, origin);
  }

  const allowedOrigins = getAllowedOrigins();
  if (!origin || !allowedOrigins.includes(origin)) {
    return jsonResponse({ ok: false, error: "origin_not_allowed" }, 403, origin);
  }

  const supabaseUrl = textEnv("SUPABASE_URL");
  const secretKey = getSupabaseSecretKey();
  const salt = textEnv("VISIT_HASH_SALT");

  if (!supabaseUrl || !secretKey || !salt) {
    return jsonResponse({ ok: true, notified: false, reason: "not_configured" }, 200, origin);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const site = cleanText(payload.site, 80) || "ofrinio-holiday-site";
  const path = cleanText(payload.path, 300) || "/";
  const referrer = cleanText(payload.referrer, 500);
  const timezone = cleanText(payload.timezone, 80);
  const userAgent = cleanText(request.headers.get("user-agent"), 500);
  const country = cleanText(request.headers.get("cf-ipcountry"), 8);
  const ipHash = await sha256Hex(`${salt}:${getClientIp(request)}`);
  const cooldownMinutes = Number(textEnv("VISIT_NOTIFY_COOLDOWN_MINUTES", String(DEFAULT_COOLDOWN_MINUTES))) || DEFAULT_COOLDOWN_MINUTES;

  try {
    const alreadyNotified = await hasRecentNotification(
      supabaseUrl,
      secretKey,
      site,
      ipHash,
      cooldownMinutes
    );

    let notificationSent = false;
    const shouldNotify = !alreadyNotified;
    if (shouldNotify) {
      const meta = getSiteMeta(site);
      const referrerLine = referrer ? `\nReferrer: ${referrer}` : "";
      const countryLine = country ? `\nCountry: ${country}` : "";
      const message = `New ${meta.label} visitor\nPath: ${path}${countryLine}${referrerLine}`;
      notificationSent = await publishNtfy(message, site);
    }

    await insertVisitEvent(supabaseUrl, secretKey, {
      site,
      path,
      referrer,
      user_agent: userAgent,
      ip_hash: ipHash,
      country,
      timezone,
      notified: notificationSent
    });

    return jsonResponse({ ok: true, notified: notificationSent }, 200, origin);
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: true, notified: false, reason: "internal_error" }, 200, origin);
  }
});
