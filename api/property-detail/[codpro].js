import "dotenv/config";

const ALLOWED_ORIGINS = [
  "https://unisa-dev.webflow.io", // ← WEBFLOW DOMAIN
  //"https://tu-dominio-custom.com", // ← EXTRA DOMAIN
];

export default async function handler(req, res) {
  // CORS
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
    const { codpro } = req.query;

    if (!codpro) {
      return res.status(400).json({
        error: "codpro is required"
      });
    }

    const baseUrl = process.env.DOMUS_BASE_URL;
    const url = `${baseUrl}/properties/${codpro}`;

    console.log("URL:", url);
    console.log("QUERY:", req.query);

    const response = await fetch(url, {
      headers: {
        Authorization: process.env.DOMUS_API_KEY,
        inmobiliaria: process.env.INMOBILIARIA
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: "Domus API error",
        details: text
      });
    }

    let data;
    try {
      data = await response.json();
    } catch {
      const text = await response.text();
      return res.status(500).json({
        error: "Invalid JSON from API",
        details: text
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      details: error.message
    });
  }
}