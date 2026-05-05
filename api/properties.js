import "dotenv/config";

export default async function handler(req, res) {
  try {
    console.log("QUERY:", req.query);

    const { page = 1, perpage = 9, ...filters } = req.query;

    const baseUrl = process.env.DOMUS_BASE_URL;

    const query = new URLSearchParams({
      page: String(page),
      ...Object.fromEntries(
        Object.entries(filters || {}).map(([k, v]) => [k, String(v)])
      )
    }).toString();

    const url = `${baseUrl}/properties?${query}`;

    //LOGS
    console.log("FINAL URL:", url);
    console.log("PERPAGE HEADER:", perpage);

    const response = await fetch(url, {
      headers: {
        Authorization: process.env.DOMUS_API_KEY,
        inmobiliaria: process.env.INMOBILIARIA,
        perpage: String(perpage)
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