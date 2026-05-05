import "dotenv/config";
import { setCors } from "../../lib/cors.js";

export default async function handler(req, res) {
  // 🔥 CORS
  setCors(res);

  // 🔥 Preflight request (CORS browser)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const baseUrl = process.env.DOMUS_BASE_URL;
    const url = `${baseUrl}/search/types`;

    console.log("URL:", url);

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
      error: "Error fetching types",
      details: error.message
    });
  }
}