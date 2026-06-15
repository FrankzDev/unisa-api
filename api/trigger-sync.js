const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const GITHUB_PAT = process.env.GITHUB_PAT;
const GITHUB_REPO = process.env.GITHUB_REPO;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.WEBFLOW_URL);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { username, password, checkOnly } = req.body;

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Solo validar credenciales (usado en el login)
  if (checkOnly) {
    return res.status(200).json({ ok: true, authorized: true });
  }

  // Disparar el workflow
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/property-sync.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
    }
  );

  if (response.status === 204) {
    return res.status(200).json({ ok: true });
  }

  const error = await response.json();
  return res.status(500).json({ error: error.message || "GitHub dispatch failed" });
}