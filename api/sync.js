import "dotenv/config";

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_BASE_URL = "https://api.webflow.com/v2";

const COLLECTIONS = {
  properties: "69fb61a2e6b52a264df3076d",
  types: "69fb61b6575fe94b5223f129",
  neighborhoods: "69fb62f288a1071da3961042"
};

const INMOBILIARIA = 1;
const DOMUS_PERPAGE = 25;

// ─────────────────────────────────────────────
// WEBFLOW REQUEST
// ─────────────────────────────────────────────

async function webflowRequest(method, path, body = null) {
  const res = await fetch(`${WEBFLOW_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${WEBFLOW_API_TOKEN}`,
      "Content-Type": "application/json",
      "accept-version": "2.0.0"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webflow error ${res.status}: ${text}`);
  }

  if (res.status === 204) return {};
  return res.json();
}

// ─────────────────────────────────────────────
// WEBFLOW ITEMS
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

    if (items.length >= data.pagination.total) break;

    offset += limit;
  }

  return items;
}

// ─────────────────────────────────────────────
// DOMUS LIST
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

  const json = await res.json();

  return {
    properties: json.data,
    totalPages: json.last_page
  };
}

// ─────────────────────────────────────────────
// DOMUS DETAIL
// ─────────────────────────────────────────────

async function getPropertyDetail(codpro) {
  const res = await fetch(
    `${process.env.DOMUS_BASE_URL}/properties/${codpro}`,
    {
      headers: {
        Authorization: process.env.DOMUS_API_KEY,
        inmobiliaria: String(INMOBILIARIA)
      }
    }
  );

  if (!res.ok) {
    throw new Error(`Detail failed ${codpro}`);
  }

  const json = await res.json();
  return json.data;
}

// ─────────────────────────────────────────────
// MAP PROPERTY
// ─────────────────────────────────────────────

function mapPropertyToWebflow(property) {
  const city = property.city?.trim() || "";
  const type = property.type?.trim() || "";
  const biz = property.biz?.trim() || "";
  const neighborhood = property.neighborhood?.trim() || "";

  const name = `${type} en ${biz} - ${neighborhood}, ${city}`.trim();

  const slug = `${name}-${property.codpro}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  return {
    fieldData: {
      name,
      slug,

      codpro: String(property.codpro),

      city,
      neighborhood,
      type,
      biz,

      price: Number(property.price) || 0,
      rent: Number(property.rent) || 0,
      saleprice: Number(property.saleprice) || 0,

      latitude: Number(property.latitude) || 0,
      longitude: Number(property.longitude) || 0,

      description: property.description || "",

      image1: property.image1 || "",
      image2: property.image2 || "",
      image3: property.image3 || "",

      "area-lot-2": Number(property.area_lot) || 0,
      "area-cons-2": Number(property.area_cons) || 0,

      "bedrooms-2": Number(property.bedrooms) || 0,
      "bathrooms-2": Number(property.bathrooms) || 0,

      "vip-2": Boolean(property.vip),

      video: Boolean(property.video),

      "update-on": property.updated_at
        ? new Date(property.updated_at).toISOString()
        : null,

      // ───────── NEW FIELDS ─────────

      "gallery-json": JSON.stringify(
        (property.images || []).map(img => ({
          url: img.imageurl,
          thumb: img.thumburl,
          order: img.order
        }))
      ),

      "amenities-json": JSON.stringify(
        (property.amenities || []).map(a => a.name)
      )
    }
  };
}

// ─────────────────────────────────────────────
// SYNC PROPERTIES
// ─────────────────────────────────────────────

async function syncProperties(page = 1, webflowMap) {
  console.log(`\n── PAGE ${page} ──`);

  const { properties, totalPages } =
    await getDomusPropertiesByPage(page);

  let created = 0;
  let updated = 0;

  for (const property of properties) {
    const key = String(property.codpro);
    const existing = webflowMap.get(key);

    const domusUpdated = property.updated_at
      ? new Date(property.updated_at).toISOString()
      : null;

    const webflowUpdated =
      existing?.fieldData["update-on"] || null;

    let fullProperty = property;

    const needsDetail =
      !existing || domusUpdated !== webflowUpdated;

    if (needsDetail) {
      const detail = await getPropertyDetail(property.codpro);
      fullProperty = { ...property, ...detail };
    }

    const mapped = mapPropertyToWebflow(fullProperty);

    if (!existing) {
      await webflowRequest(
        "POST",
        `/collections/${COLLECTIONS.properties}/items`,
        mapped
      );
      created++;
    } else {
      await webflowRequest(
        "PATCH",
        `/collections/${COLLECTIONS.properties}/items/${existing.id}`,
        mapped
      );
      updated++;
    }
  }

  console.log(
    `Page ${page}/${totalPages} → created:${created}, updated:${updated}`
  );

  return { page, totalPages, created, updated };
}

// ─────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────

export default async function handler(req, res) {
  const secret =
    req.headers["x-sync-secret"] ||
    req.query.secret;

  if (secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { target, page = 1 } = req.query;

  try {
    if (target === "properties") {
      const webflowItems =
        await getAllWebflowItems(
          COLLECTIONS.properties
        );

      const webflowMap = new Map(
        webflowItems.map(item => [
          String(item.fieldData.codpro),
          item
        ])
      );

      const result = await syncProperties(
        Number(page),
        webflowMap
      );

      return res.json({ ok: true, ...result });
    }

    return res.status(400).json({
      error: "Invalid target"
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Sync failed",
      details: err.message
    });
  }
}