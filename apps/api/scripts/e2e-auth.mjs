/**
 * End-to-end auth API smoke test (admin flows).
 * Usage: node scripts/e2e-auth.mjs [inviteToken]
 */
const BASE = process.env.API_URL || "http://localhost:3002";
const INVITE =
  process.argv[2] ||
  process.env.INVITE_TOKEN ||
  "";

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const results = [];

  // health
  {
    const r = await req("GET", "/health");
    assert(r.status === 200, `health ${r.status}`);
    results.push("OK health");
  }

  // login fail
  {
    const r = await req("POST", "/auth/login", {
      email: "admin@darkhorseops.com",
      password: "wrong",
    });
    assert(r.status === 401 || r.status === 400, `bad login ${r.status}`);
    results.push(`OK login reject (${r.status}) attemptsLeft=${r.json?.error?.attemptsLeft}`);
  }

  // login success
  let accessToken;
  {
    const r = await req("POST", "/auth/login", {
      email: "admin@darkhorseops.com",
      password: "Password123!",
    });
    assert(r.status === 200 || r.status === 201, `login ${r.status} ${JSON.stringify(r.json)}`);
    accessToken = r.json?.data?.tokens?.accessToken;
    assert(accessToken, "missing accessToken");
    results.push(`OK login admin as ${r.json.data.user.email}`);
  }

  // me
  {
    const r = await req("GET", "/auth/me", null, accessToken);
    assert(r.status === 200, `me ${r.status}`);
    assert(r.json?.data?.email === "admin@darkhorseops.com", "me email mismatch");
    results.push("OK /auth/me");
  }

  // forgot password (may send email via Resend)
  {
    const r = await req("POST", "/auth/forgot-password", {
      email: "admin@darkhorseops.com",
    });
    assert(r.status === 200 || r.status === 201, `forgot ${r.status} ${JSON.stringify(r.json)}`);
    results.push("OK forgot-password");
  }

  // request invite
  {
    const r = await req("POST", "/auth/invite/request", {
      email: "newbie@example.com",
    });
    assert(r.status === 200 || r.status === 201, `invite request ${r.status} ${JSON.stringify(r.json)}`);
    results.push("OK invite/request");
  }

  // invite preview + accept (if token provided)
  if (INVITE) {
    const preview = await req("GET", `/auth/invite/${INVITE}`);
    assert(preview.status === 200, `invite preview ${preview.status} ${JSON.stringify(preview.json)}`);
    results.push(`OK invite preview ${preview.json.data.email}`);

    const accept = await req("POST", "/auth/invite/accept", {
      inviteToken: INVITE,
      password: "InvitePass123!",
      confirmPassword: "InvitePass123!",
    });
    assert(
      accept.status === 200 || accept.status === 201,
      `invite accept ${accept.status} ${JSON.stringify(accept.json)}`,
    );
    results.push(`OK invite accept → ${accept.json.data.user.email}`);
  } else {
    results.push("SKIP invite accept (no token)");
  }

  console.log("\n=== E2E RESULTS ===");
  for (const line of results) console.log(line);
  console.log("ALL PASSED");
}

main().catch((err) => {
  console.error("E2E FAILED:", err.message);
  process.exit(1);
});
