import "dotenv/config";

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_BASE_URL = "https://api.webflow.com/v2";

const COLLECTIONS = {
  properties: "69fb61a2e6b52a264df3076d",
  types: "69fb61b6575fe94b5223f129",
  neighborhoods: "69fb62f288a1071da3961042"
};

const INMOBILIARIAS = [1, 2];
const DOMUS_PERPAGE = 50;

// ─── WEBFLOW REQUEST ─────────────────────────────────────────────────────────

async function webflowRequest(method, path, body = null) {
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${WEBFLOW_API_TOKEN}`,
      "Content-Type": "application/json",
      "accept-version": "2.0.0"
    }
  };

  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${WEBFLOW_BASE_URL}${path}`, options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webflow error ${res.status}: ${text}`);
  }

  return res.json();
}

// ─── GET WEBFLOW ITEMS ───────────────────────────────────────────────────────

async function getAllWebflowItems(collectionId) {
  let items = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const data = await webflowRequest(
      "GET",
      `/collections/${collectionId}/items?limit=${limit}&offset=${offset}`
    );

    items = items.concat(data.items || []);

    if (items.length >= data.pagination.total) break;

    offset += limit;
  }

  return items;
}

// ─── DOMUS PAGINATED ─────────────────────────────────────────────────────────

async function getDomusPropertiesByPage(page) {
  let allProperties = [];
  let totalPages = 1;

  for (const inmobiliaria of INMOBILIARIAS) {
    const res = await fetch(
      `${process.env.DOMUS_BASE_URL}/properties?page=${page}`,
      {
        headers: {
          Authorization: process.env.DOMUS_API_KEY,
          inmobiliaria: String(inmobiliaria),
          perpage: String(DOMUS_PERPAGE)
        }
      }
    );

    const json = await res.json();

    totalPages = Math.max(totalPages, json.last_page);

    allProperties.push(
      ...json.data.map((p) => ({
        ...p,
        _inmobiliaria: inmobiliaria
      }))
    );
  }

  return { properties: allProperties, totalPages };
}

// ─── DOMUS TYPES ─────────────────────────────────────────────────────────────

async function getAllDomusTypes() {
  const res = await fetch(`${process.env.DOMUS_BASE_URL}/search/types`, {
    headers: {
      Authorization: process.env.DOMUS_API_KEY,
      inmobiliaria: String(INMOBILIARIAS[0])
    }
  });

  const json = await res.json();
  return json.data;
}

// ─── DOMUS NEIGHBORHOODS ─────────────────────────────────────────────────────

async function getAllDomusNeighborhoods() {
  const res = await fetch(`${process.env.DOMUS_BASE_URL}/search/neighborhoods`, {
    headers: {
      Authorization: process.env.DOMUS_API_KEY,
      inmobiliaria: String(INMOBILIARIAS[0])
    }
  });

  const json = await res.json();
  return json.data;
}

// ─── SYNC TYPES ──────────────────────────────────────────────────────────────

async function syncTypes() {
  console.log("\n── Sync Types ──");

  const domusTypes = await getAllDomusTypes();
  const webflowTypes = await getAllWebflowItems(COLLECTIONS.types);

  const webflowMap = new Map(
    webflowTypes.map((i) => [String(i.fieldData["code"]), i])
  );

  let created = 0;

  for (const type of domusTypes) {
    const code = String(type.code);

    if (!webflowMap.has(code)) {
      await webflowRequest("POST", `/collections/${COLLECTIONS.types}/items`, {
        fieldData: {
          name: type.name,
          code
        }
      });

      created++;
    }
  }

  console.log(`Types → ${created} creados`);

  return { created };
}

// ─── SYNC NEIGHBORHOODS ──────────────────────────────────────────────────────

async function syncNeighborhoods() {
  console.log("\n── Sync Neighborhoods ──");

  const domusNeighborhoods = await getAllDomusNeighborhoods();
  const webflowNeighborhoods = await getAllWebflowItems(
    COLLECTIONS.neighborhoods
  );

  const webflowMap = new Map(
    webflowNeighborhoods.map((i) => [String(i.fieldData["code"]), i])
  );

  let created = 0;

  for (const n of domusNeighborhoods) {
    const code = String(n.code);

    if (!webflowMap.has(code)) {
      await webflowRequest(
        "POST",
        `/collections/${COLLECTIONS.neighborhoods}/items`,
        {
          fieldData: {
            name: n.name,
            code,
            "city-code": String(n.city_code),
            "city-name": n.city_name?.trim() || ""
          }
        }
      );

      created++;
    }
  }

  console.log(`Neighborhoods → ${created} creados`);

  return { created };
}

// ─── MAP PROPERTY ────────────────────────────────────────────────────────────

function mapPropertyToWebflow(property) {
    const type = property.type?.trim() || "";
    const biz = property.biz?.trim() || "";
    const neighborhood = property.neighborhood?.trim() || "";
    const city = property.city?.trim() || "";
  
    // ─── BUILD NAME DINÁMICO ─────────────────────────
  
    let nameParts = [];
  
    // Parte izquierda (type + biz)
    if (type && biz) {
      nameParts.push(`${type} en ${biz}`);
    } else if (type) {
      nameParts.push(type);
    } else if (biz) {
      nameParts.push(biz);
    }
  
    // Parte derecha (ubicación)
    let locationParts = [];
    if (neighborhood) locationParts.push(neighborhood);
    if (city) locationParts.push(city);
  
    if (locationParts.length) {
      nameParts.push(locationParts.join(", "));
    }
  
    const name = nameParts.join(" - ").trim();
  
    // ─── BUILD SLUG ─────────────────────────
  
    const slugBase = name || `${property.codpro}`;
  
    const slug = `${slugBase}-${property.codpro}-${property._inmobiliaria}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  
    return {
      fieldData: {
        name,
        slug,
  
        codpro: `${property.codpro}-${property._inmobiliaria}`,
  
        reference: property.reference?.trim() || "",
        city,
        neighborhood,
  
        price: Number(property.price) || 0,
        rent: Number(property.rent) || 0,
        saleprice: Number(property.saleprice) || 0,
  
        description: property.description?.trim() || "",
  
        image1: property.image1 || "",
        image2: property.image2 || "",
        image3: property.image3 || "",
  
        "vip-2":
          property.vip === true ||
          property.vip === "true" ||
          property.vip === 1,
  
        "update-on": property.updated_at
          ? new Date(property.updated_at).toISOString()
          : null
      }
    };
  }

// ─── SYNC PROPERTIES PAGINADO ────────────────────────────────────────────────

async function syncProperties(page = 1) {
  console.log(`\n── Sync Properties Page ${page} ──`);

  const { properties: domusProperties, totalPages } =
    await getDomusPropertiesByPage(page);

  const webflowProperties = await getAllWebflowItems(
    COLLECTIONS.properties
  );

  const webflowMap = new Map(
    webflowProperties.map((item) => [
      String(item.fieldData["codpro"]),
      item
    ])
  );

  let created = 0;
  let updated = 0;

  for (const property of domusProperties) {
    const key = `${property.codpro}-${property._inmobiliaria}`;
    const existing = webflowMap.get(key);
    const mapped = mapPropertyToWebflow(property);

    if (!existing) {
      await webflowRequest(
        "POST",
        `/collections/${COLLECTIONS.properties}/items`,
        mapped
      );
      created++;
    } else {
      const domusUpdated = property.updated_at
        ? new Date(property.updated_at).toISOString()
        : null;

      const webflowUpdated = existing.fieldData["update-on"] || null;

      if (domusUpdated !== webflowUpdated) {
        await webflowRequest(
          "PATCH",
          `/collections/${COLLECTIONS.properties}/items/${existing.id}`,
          mapped
        );
        updated++;
      }
    }
  }

  console.log(
    `Page ${page}/${totalPages} → ${created} creadas, ${updated} actualizadas`
  );

  return {
    page,
    totalPages,
    created,
    updated
  };
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const secret = req.headers["x-sync-secret"] || req.query.secret;

  if (secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { target, page = 1 } = req.query;

  try {
    if (target === "properties") {
      const result = await syncProperties(Number(page));

      return res.status(200).json({
        ok: true,
        type: "properties",
        ...result
      });
    }

    if (target === "types") {
      const result = await syncTypes();

      return res.status(200).json({
        ok: true,
        type: "types",
        ...result
      });
    }

    if (target === "neighborhoods") {
      const result = await syncNeighborhoods();

      return res.status(200).json({
        ok: true,
        type: "neighborhoods",
        ...result
      });
    }

    return res.status(400).json({ error: "Invalid target" });
  } catch (error) {
    console.error("Sync error:", error);
    return res.status(500).json({
      error: "Sync failed",
      details: error.message
    });
  }
}