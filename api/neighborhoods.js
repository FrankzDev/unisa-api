import "dotenv/config";

const ALLOWED_ORIGINS = [
  "https://unisa-dev.webflow.io",
];

export default async function handler(req, res) {
  // ─────────────────────────────
  // CORS
  // ─────────────────────────────
  const origin = req.headers.origin;

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const baseUrl = process.env.DOMUS_BASE_URL;

    if (!baseUrl) {
      throw new Error("DOMUS_BASE_URL is not defined");
    }

    const url = `${baseUrl}/search/neighborhoods`;

    console.log("Fetching Domus:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: process.env.DOMUS_API_KEY,
        inmobiliaria: String(process.env.INMOBILIARIA),
        perpage: "200", // 🔥 CLAVE: fuerza retorno completo si el backend lo usa
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: "Domus API error",
        details: text,
      });
    }

    const json = await response.json();

    // ─────────────────────────────
    // NORMALIZACIÓN SEGURA (IMPORTANTE)
    // ─────────────────────────────
    const data = Array.isArray(json?.data) ? json.data : [];

    return res.status(200).json({
      ok: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Error fetching neighborhoods",
      details: error.message,
    });
  }
}