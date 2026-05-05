import "dotenv/config";
import { setCors } from "../../lib/cors.js";

export default async function handler(req, res) {
  setCors(res);

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

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      details: error.message
    });
  }
}