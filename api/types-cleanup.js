import "dotenv/config";

const WEBFLOW_API_TOKEN =
  process.env.WEBFLOW_API_TOKEN;

const WEBFLOW_BASE_URL =
  "https://api.webflow.com/v2";

const COLLECTIONS = {
  types:
    "69fb61b6575fe94b5223f129"
};

// ─────────────────────────────
// WEBFLOW REQUEST
// ─────────────────────────────

async function webflowRequest(
  method,
  path
) {
  const res = await fetch(
    `${WEBFLOW_BASE_URL}${path}`,
    {
      method,
      headers: {
        Authorization:
          `Bearer ${WEBFLOW_API_TOKEN}`,
        "Content-Type":
          "application/json",
        "accept-version":
          "2.0.0"
      }
    }
  );

  if (!res.ok) {
    throw new Error(
      await res.text()
    );
  }

  return res.json();
}

// ─────────────────────────────
// GET WEBFLOW ITEMS
// ─────────────────────────────

async function getAllWebflowItems(
  collectionId
) {
  let items = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const data =
      await webflowRequest(
        "GET",
        `/collections/${collectionId}/items?limit=${limit}&offset=${offset}`
      );

    items.push(
      ...(data.items || [])
    );

    if (
      items.length >=
      data.pagination.total
    ) {
      break;
    }

    offset += limit;
  }

  return items;
}

// ─────────────────────────────
// DOMUS TYPES
// ─────────────────────────────

async function getDomusTypes() {
  const res = await fetch(
    `${process.env.DOMUS_BASE_URL}/api/types`,
    {
      headers: {
        Authorization:
          process.env
            .DOMUS_API_KEY
      }
    }
  );

  if (!res.ok) {
    throw new Error(
      "Domus types failed"
    );
  }

  const json =
    await res.json();

  return json.data || [];
}

// ─────────────────────────────
// DELETE
// ─────────────────────────────

async function deleteItem(
  itemId
) {
  const res = await fetch(
    `${WEBFLOW_BASE_URL}/collections/${COLLECTIONS.types}/items/${itemId}`,
    {
      method: "DELETE",
      headers: {
        Authorization:
          `Bearer ${WEBFLOW_API_TOKEN}`,
        "accept-version":
          "2.0.0"
      }
    }
  );

  if (!res.ok) {
    throw new Error(
      await res.text()
    );
  }

  return true;
}

// ─────────────────────────────
// HANDLER
// ─────────────────────────────

export default async function handler(
  req,
  res
) {
  const secret =
    req.headers[
      "x-sync-secret"
    ] ||
    req.query.secret;

  if (
    secret !==
    process.env.SYNC_SECRET
  ) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  try {
    const execute =
      String(
        req.query.execute
      ) === "true";

    const webflowItems =
      await getAllWebflowItems(
        COLLECTIONS.types
      );

    const domusTypes =
      await getDomusTypes();

    const domusCodes =
      new Set(
        domusTypes
          .map(t =>
            String(
              t.code
            ).trim()
          )
          .filter(Boolean)
      );

    const itemsToDelete =
      webflowItems.filter(
        item => {
          const code =
            String(
              item.fieldData
                .code || ""
            ).trim();

          return (
            code &&
            !domusCodes.has(
              code
            )
          );
        }
      );

    if (!execute) {
      return res.json({
        ok: true,
        mode: "dry-run",
        totalWebflow:
          webflowItems.length,
        totalDomus:
          domusTypes.length,
        wouldDelete:
          itemsToDelete.length,
        codes:
          itemsToDelete.map(
            i =>
              i.fieldData
                .code
          )
      });
    }

    let deleted = 0;

    for (const item of itemsToDelete) {
      await deleteItem(
        item.id
      );
      deleted++;

      console.log(
        `Deleted type ${item.fieldData.code}`
      );
    }

    return res.json({
      ok: true,
      mode: "execute",
      deleted
    });
  } catch (err) {
    return res.status(500).json({
      error:
        "Cleanup types failed",
      details: err.message
    });
  }
}