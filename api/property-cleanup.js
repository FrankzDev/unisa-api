import "dotenv/config";

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_BASE_URL = "https://api.webflow.com/v2";

const COLLECTIONS = {
  properties: "69fb61a2e6b52a264df3076d"
};

const INMOBILIARIA = 1;
const DOMUS_PERPAGE = 50;

// ─────────────────────────────────────────────
// WEBFLOW REQUEST
// ─────────────────────────────────────────────

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

  if (res.status === 204) {
    return {};
  }

  return res.json();
}

// ─────────────────────────────────────────────
// DELETE WEBFLOW ITEM
// ─────────────────────────────────────────────

async function deleteWebflowItem(itemId) {
  const res = await fetch(
    `${WEBFLOW_BASE_URL}/collections/${COLLECTIONS.properties}/items/${itemId}`,
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
    throw new Error(
      `Delete failed ${itemId}: ${text}`
    );
  }

  return true;
}

// ─────────────────────────────────────────────
// GET ALL WEBFLOW ITEMS
// ─────────────────────────────────────────────

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

    if (items.length >= data.pagination.total) {
      break;
    }

    offset += limit;
  }

  return items;
}

// ─────────────────────────────────────────────
// DOMUS PAGE
// ─────────────────────────────────────────────

async function getDomusPropertiesByPage(page) {
  const res = await fetch(
    `${process.env.DOMUS_BASE_URL}/properties?page=${page}`,
    {
      headers: {
        Authorization: process.env.DOMUS_API_KEY,
        inmobiliaria: String(INMOBILIARIA),
        perpage: String(DOMUS_PERPAGE)
      }
    }
  );

  if (!res.ok) {
    throw new Error(`Domus page ${page} failed`);
  }

  const json = await res.json();

  return {
    properties: json.data || [],
    totalPages: json.last_page || 1
  };
}

// ─────────────────────────────────────────────
// GET ALL DOMUS
// ─────────────────────────────────────────────

async function getAllDomusProperties() {
  let page = 1;
  let totalPages = 1;

  const all = [];

  while (page <= totalPages) {
    const result = await getDomusPropertiesByPage(page);

    totalPages = result.totalPages;

    all.push(...result.properties);

    page++;
  }

  return all;
}

// ─────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────

export default async function handler(req, res) {
  const secret =
    req.headers["x-sync-secret"] ||
    req.query.secret;

  if (secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  try {
    const execute =
      String(req.query.execute) === "true";

    // Webflow
    const webflowItems =
      await getAllWebflowItems(
        COLLECTIONS.properties
      );

    // Domus
    const domusProperties =
      await getAllDomusProperties();

    const domusCodes = new Set(
      domusProperties
        .map(p => String(p.codpro).trim())
        .filter(Boolean)
    );

    const itemsToDelete =
      webflowItems.filter(item => {
        const code = String(
          item.fieldData.codpro || ""
        ).trim();

        return (
          code &&
          !domusCodes.has(code)
        );
      });

    // DRY RUN
    if (!execute) {
      return res.json({
        ok: true,
        mode: "dry-run",

        totalWebflow:
          webflowItems.length,

        totalDomus:
          domusProperties.length,

        wouldDelete:
          itemsToDelete.length,

        codpros:
          itemsToDelete.map(
            item => item.fieldData.codpro
          )
      });
    }

    // DELETE
    let deleted = 0;

    for (const item of itemsToDelete) {
      await deleteWebflowItem(item.id);

      deleted++;

      console.log(
        `Deleted ${item.fieldData.codpro}`
      );
    }

    return res.json({
      ok: true,
      mode: "execute",
      deleted
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Cleanup failed",
      details: err.message
    });
  }
}