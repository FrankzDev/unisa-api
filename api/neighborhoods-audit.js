import "dotenv/config";

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_BASE_URL = "https://api.webflow.com/v2";

const COLLECTIONS = {
  neighborhoods: "69fb62f288a1071da3961042",
};

// ─────────────────────────────
// WEBFLOW REQUEST
// ─────────────────────────────

async function webflowRequest(method, path) {
  const res = await fetch(`${WEBFLOW_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${WEBFLOW_API_TOKEN}`,
      "Content-Type": "application/json",
      "accept-version": "2.0.0",
    },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

// ─────────────────────────────
// GET WEBFLOW ITEMS
// ─────────────────────────────

async function getAllWebflowItems(collectionId) {
  let items = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const data = await webflowRequest(
      "GET",
      `/collections/${collectionId}/items?limit=${limit}&offset=${offset}`
    );

    items.push(...(data.items || []));

    if (items.length >= data.pagination.total) break;

    offset += limit;
  }

  return items;
}

// ─────────────────────────────
// DOMUS
// ─────────────────────────────

async function getDomusNeighborhoods() {
  const base = process.env.DOMUS_BASE_URL;
  const apiKey = process.env.DOMUS_API_KEY;

  if (!base) {
    throw new Error("DOMUS_BASE_URL is not defined");
  }

  const res = await fetch(`${base}/search/neighborhoods`, {
    method: "GET",
    headers: {
      Authorization: apiKey,
    },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = await res.json();
  return json.data || [];
}

// ─────────────────────────────
// NORMALIZER (CLAVE DEL FIX)
// ─────────────────────────────

function normalizeCode(value) {
  return String(value ?? "")
    .trim()
    .replace(/^0+/, ""); // evita diferencias tipo "001" vs "1"
}

// ─────────────────────────────
// HANDLER
// ─────────────────────────────

export default async function handler(req, res) {
  const secret = req.headers["x-sync-secret"] || req.query.secret;

  if (secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const webflowItems = await getAllWebflowItems(
      COLLECTIONS.neighborhoods
    );

    const domusNeighborhoods = await getDomusNeighborhoods();

    // ─────────────────────────────
    // SETS NORMALIZADOS
    // ─────────────────────────────

    const webflowCodes = new Set(
      webflowItems
        .map((item) => normalizeCode(item.fieldData?.code))
        .filter(Boolean)
    );

    const domusCodes = new Set(
      domusNeighborhoods
        .map((n) => normalizeCode(n.code))
        .filter(Boolean)
    );

    // ─────────────────────────────
    // DIFFS
    // ─────────────────────────────

    const missingInDomus = [...webflowCodes].filter(
      (code) => !domusCodes.has(code)
    );

    const missingInWebflow = [...domusCodes].filter(
      (code) => !webflowCodes.has(code)
    );

    // ─────────────────────────────
    // VALIDACIÓN DE CAMPOS VACÍOS
    // ─────────────────────────────

    const emptyCode = [];
    const emptyCityCode = [];
    const emptyCityName = [];

    for (const item of webflowItems) {
      const fd = item.fieldData || {};
      const code = normalizeCode(fd.code);

      if (!code) {
        emptyCode.push({ id: item.id, name: fd.name });
      }

      if (!fd["city-code"]) emptyCityCode.push(code);
      if (!fd["city-name"]) emptyCityName.push(code);
    }

    // ─────────────────────────────
    // DUPLICATES
    // ─────────────────────────────

    const duplicates = {};

    for (const item of webflowItems) {
      const code = normalizeCode(item.fieldData?.code);
      if (!code) continue;

      duplicates[code] = (duplicates[code] || 0) + 1;
    }

    const duplicateCodes = Object.entries(duplicates)
      .filter(([_, count]) => count > 1)
      .map(([code, count]) => ({ code, count }));

    // ─────────────────────────────
    // RESPONSE
    // ─────────────────────────────

    return res.json({
      ok: true,

      webflowCount: webflowItems.length,
      domusCount: domusNeighborhoods.length,

      missingInDomusCount: missingInDomus.length,
      missingInWebflowCount: missingInWebflow.length,

      duplicateCount: duplicateCodes.length,

      emptyCodeCount: emptyCode.length,
      emptyCityCodeCount: emptyCityCode.length,
      emptyCityNameCount: emptyCityName.length,

      missingInDomus,
      missingInWebflow,
      duplicateCodes,

      emptyCode,
      emptyCityCode,
      emptyCityName,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Audit neighborhoods failed",
      details: err.message,
    });
  }
}