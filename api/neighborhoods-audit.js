import "dotenv/config";

const WEBFLOW_API_TOKEN =
  process.env.WEBFLOW_API_TOKEN;

const WEBFLOW_BASE_URL =
  "https://api.webflow.com/v2";

const COLLECTIONS = {
  neighborhoods:
    "69fb62f288a1071da3961042"
};

// reutiliza exactamente
// webflowRequest()
// getAllWebflowItems()

async function getDomusNeighborhoods() {
  const res = await fetch(
    `${process.env.BASE_URL}/api/neighborhoods`
  );

  if (!res.ok) {
    throw new Error(
      "Failed to fetch neighborhoods"
    );
  }

  const json =
    await res.json();

  return json.data || [];
}

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
        COLLECTIONS.neighborhoods
      );

    const domusNeighborhoods =
      await getDomusNeighborhoods();

    const emptyCode = [];
    const emptyCityCode = [];
    const emptyCityName = [];

    for (const item of webflowItems) {
      const fieldData =
        item.fieldData || {};

      const code =
        String(
          fieldData.code || ""
        ).trim();

      if (!code) {
        emptyCode.push({
          id: item.id,
          name:
            fieldData.name
        });
      }

      if (
        !fieldData[
          "city-code"
        ]
      ) {
        emptyCityCode.push(
          code
        );
      }

      if (
        !fieldData[
          "city-name"
        ]
      ) {
        emptyCityName.push(
          code
        );
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
        domusNeighborhoods
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
        domusNeighborhoods.length,

      missingInDomusCount:
        missingInDomus.length,

      missingInWebflowCount:
        missingInWebflow.length,

      duplicateCount:
        duplicateCodes.length,

      emptyCodeCount:
        emptyCode.length,

      emptyCityCodeCount:
        emptyCityCode.length,

      emptyCityNameCount:
        emptyCityName.length,

      missingInDomus,
      missingInWebflow,
      duplicateCodes,

      emptyCode,
      emptyCityCode,
      emptyCityName
    });

  } catch (err) {
    return res.status(500).json({
      error:
        "Audit neighborhoods failed",
      details:
        err.message
    });
  }
}