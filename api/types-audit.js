import "dotenv/config";

const WEBFLOW_API_TOKEN =
  process.env.WEBFLOW_API_TOKEN;

const WEBFLOW_BASE_URL =
  "https://api.webflow.com/v2";

const COLLECTIONS = {
  types: "69fb61b6575fe94b5223f129"
};

// ─────────────────────────────
// WEBFLOW
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
// DOMUS
// ─────────────────────────────

async function getDomusTypes() {
  const res = await fetch(
    `${process.env.BASE_URL}/api/types`
  );

  if (!res.ok) {
    throw new Error(
      "Failed to fetch types"
    );
  }

  const json =
    await res.json();

  return json.data || [];
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
    const webflowItems =
      await getAllWebflowItems(
        COLLECTIONS.types
      );

    const domusTypes =
      await getDomusTypes();

    const emptyCode = [];

    for (const item of webflowItems) {
      const code =
        String(
          item.fieldData.code || ""
        ).trim();

      if (!code) {
        emptyCode.push({
          id: item.id,
          name:
            item.fieldData.name
        });
      }
    }

    const webflowCodes =
      new Set(
        webflowItems
          .map(item =>
            String(
              item.fieldData.code ||
                ""
            ).trim()
          )
          .filter(Boolean)
      );

    const domusCodes =
      new Set(
        domusTypes
          .map(item =>
            String(
              item.code || ""
            ).trim()
          )
          .filter(Boolean)
      );

    const missingInDomus =
      [...webflowCodes].filter(
        code =>
          !domusCodes.has(code)
      );

    const missingInWebflow =
      [...domusCodes].filter(
        code =>
          !webflowCodes.has(code)
      );

    const duplicates = {};

    for (const item of webflowItems) {
      const code =
        String(
          item.fieldData.code ||
            ""
        ).trim();

      if (!code) continue;

      duplicates[code] =
        (duplicates[code] || 0) +
        1;
    }

    const duplicateCodes =
      Object.entries(
        duplicates
      )
        .filter(
          ([_, count]) =>
            count > 1
        )
        .map(
          ([code, count]) => ({
            code,
            count
          })
        );

    return res.json({
      ok: true,

      webflowCount:
        webflowItems.length,

      domusCount:
        domusTypes.length,

      missingInDomusCount:
        missingInDomus.length,

      missingInWebflowCount:
        missingInWebflow.length,

      duplicateCount:
        duplicateCodes.length,

      emptyCodeCount:
        emptyCode.length,

      missingInDomus,
      missingInWebflow,
      duplicateCodes,
      emptyCode
    });

  } catch (err) {
    return res.status(500).json({
      error:
        "Audit types failed",
      details:
        err.message
    });
  }
}