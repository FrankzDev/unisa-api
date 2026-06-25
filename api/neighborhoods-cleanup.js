import "dotenv/config";

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_BASE_URL = "https://api.webflow.com/v2";

const COLLECTIONS = {
  neighborhoods: "69fb62f288a1071da3961042"
};

const INMOBILIARIA = 1;

// ─────────────────────────────
// WEBFLOW REQUEST
// ─────────────────────────────

async function webflowRequest(method, path) {
  const res = await fetch(`${WEBFLOW_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${WEBFLOW_API_TOKEN}`,
      "Content-Type": "application/json",
      "accept-version": "2.0.0"
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webflow error ${res.status}: ${text}`);
  }

  if (res.status === 204) return {};
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
// DOMUS (READ ONLY)
// ─────────────────────────────

async function getDomusNeighborhoods() {
  const res = await fetch(
    `${process.env.DOMUS_BASE_URL}/search/neighborhoods`,
    {
      method: "GET",
      headers: {
        Authorization: process.env.DOMUS_API_KEY,
        inmobiliaria: String(INMOBILIARIA)
      }
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Domus neighborhoods failed: ${text}`);
  }

  const json = await res.json();
  return json.data || [];
}

// ─────────────────────────────
// DELETE WEBFLOW ITEM
// ─────────────────────────────

async function deleteWebflowItem(itemId) {
  const res = await fetch(
    `${WEBFLOW_BASE_URL}/collections/${COLLECTIONS.neighborhoods}/items/${itemId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${WEBFLOW_API_TOKEN}`,
        "accept-version": "2.0.0"
      }
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed ${itemId}: ${text}`);
  }

  return true;
}

// ─────────────────────────────
// HANDLER
// ─────────────────────────────

export default async function handler(req, res) {
  const secret =
    req.headers["x-sync-secret"] || req.query.secret;

  if (secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const execute = String(req.query.execute) === "true";

    // 1. Webflow data (SOURCE OF TRUTH TO CLEAN)
    const webflowItems = await getAllWebflowItems(
      COLLECTIONS.neighborhoods
    );

    // 2. Domus data (READ ONLY)
    const domusNeighborhoods = await getDomusNeighborhoods();

    const domusCodes = new Set(
      domusNeighborhoods
        .map(n => String(n.code || "").trim())
        .filter(Boolean)
    );

    // 3. Find items that exist in Webflow but NOT in Domus
    const itemsToDelete = webflowItems.filter(item => {
      const code = String(item.fieldData.code || "").trim();
      return code && !domusCodes.has(code);
    });

    // ─────────────────────────────
    // DRY RUN MODE (DEFAULT SAFE)
    // ─────────────────────────────

    if (!execute) {
      return res.json({
        ok: true,
        mode: "dry-run (safe)",

        webflowCount: webflowItems.length,
        domusCount: domusNeighborhoods.length,

        wouldDelete: itemsToDelete.length,

        sampleCodes: itemsToDelete
          .slice(0, 50)
          .map(i => i.fieldData.code)
      });
    }

    // ─────────────────────────────
    // EXECUTE MODE (DESTRUCTIVE)
    // ─────────────────────────────

    let deleted = 0;

    for (const item of itemsToDelete) {
      await deleteWebflowItem(item.id);
      deleted++;

      console.log(`Deleted neighborhood: ${item.fieldData.code}`);
    }

    return res.json({
      ok: true,
      mode: "execute",
      deleted
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Cleanup neighborhoods failed",
      details: err.message
    });
  }
}