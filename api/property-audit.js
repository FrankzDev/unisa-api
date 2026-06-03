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

  return res.json();
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
// GET ALL DOMUS PROPERTIES
// ─────────────────────────────────────────────

async function getAllDomusProperties() {
  let page = 1;
  let totalPages = 1;

  const allProperties = [];

  while (page <= totalPages) {
    const result = await getDomusPropertiesByPage(page);

    totalPages = result.totalPages;

    allProperties.push(...result.properties);

    console.log(
      `Domus page ${page}/${totalPages} -> ${result.properties.length}`
    );

    page++;
  }

  return allProperties;
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
    // Webflow
    const webflowItems =
      await getAllWebflowItems(
        COLLECTIONS.properties
      );

    const emptyGallery = [];
    const emptyAmenities = [];
    const emptyCodpro = [];
    const emptyUpdateOn = [];

    // Auditoría de campos vacíos
    for (const item of webflowItems) {
      const fieldData = item.fieldData || {};
      const slug = fieldData.slug || "";

      const codpro =
        String(fieldData.codpro || "").trim();

        if (!codpro) {
            emptyCodpro.push({
                id: item.id,
                link: fieldData.slug ? `https://tu-dominio.com/${fieldData.slug}` : null
            });
            continue;
            }

      const galleryValue =
        fieldData["gallery-json"];

      const amenitiesValue =
        fieldData["amenities-json"];

      if (
        !galleryValue ||
        galleryValue === "" ||
        galleryValue === "[]" ||
        galleryValue === "null"
      ) {
        emptyGallery.push({
            codpro,
            link: slug ? `https://unisa-dev.webflow.io/${slug}` : null
          });
      }

      if (
        !amenitiesValue ||
        amenitiesValue === "" ||
        amenitiesValue === "[]" ||
        amenitiesValue === "null"
      ) {
        emptyAmenities.push({
            codpro,
            link: slug ? `https://tu-dominio.com/${slug}` : null
          });
      }

      if (!fieldData["update-on"]) {
        emptyUpdateOn.push(codpro);
      }
    }

    // Domus
    const allDomusProperties =
      await getAllDomusProperties();

    // Sets
    const webflowCodes = new Set(
      webflowItems
        .map(item =>
          String(item.fieldData.codpro || "").trim()
        )
        .filter(Boolean)
    );

    const domusCodes = new Set(
      allDomusProperties
        .map(item =>
          String(item.codpro || "").trim()
        )
        .filter(Boolean)
    );

    // EXISTE EN WEBFLOW PERO NO EN DOMUS
    const missingInDomus =
      [...webflowCodes].filter(
        code => !domusCodes.has(code)
      );

    // EXISTE EN DOMUS PERO NO EN WEBFLOW
    const missingInWebflow =
      [...domusCodes].filter(
        code => !webflowCodes.has(code)
      );

    // Duplicados Webflow
    const duplicates = {};

    for (const item of webflowItems) {
      const code = String(
        item.fieldData.codpro || ""
      ).trim();

      if (!code) continue;

      duplicates[code] =
        (duplicates[code] || 0) + 1;
    }

    const duplicateCodes =
      Object.entries(duplicates)
        .filter(([_, count]) => count > 1)
        .map(([code, count]) => ({
          codpro: code,
          count
        }));

    return res.json({
      ok: true,

      webflowCount: webflowItems.length,
      domusCount: allDomusProperties.length,

      missingInDomusCount:
        missingInDomus.length,

      missingInWebflowCount:
        missingInWebflow.length,

      duplicateCount:
        duplicateCodes.length,

      emptyGalleryCount:
        emptyGallery.length,

      emptyAmenitiesCount:
        emptyAmenities.length,

      emptyCodproCount:
        emptyCodpro.length,

      emptyUpdateOnCount:
        emptyUpdateOn.length,

      missingInDomus,
      missingInWebflow,
      duplicateCodes,

      emptyGallery,
      emptyAmenities,
      emptyCodpro,
      emptyUpdateOn
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Audit failed",
      details: err.message
    });
  }
}