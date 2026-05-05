import "dotenv/config";

export default async function handler(req, res) {
  try {
    const { codpro } = req.query;

    if (!codpro) {
      return res.status(400).json({
        error: "codpro is required"
      });
    }

    const baseUrl = process.env.DOMUS_BASE_URL;
    const url = `${baseUrl}/properties/${codpro}`;

    // LOGS
    console.log("URL:", url);
    console.log("QUERY:", req.query);

    const response = await fetch(url, {
      headers: {
        Authorization: process.env.DOMUS_API_KEY,
        inmobiliaria: process.env.INMOBILIARIA
      }
    });

    // VALIDATOR
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: "Domus API error",
        details: text
      });
    }

    // SAFER
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