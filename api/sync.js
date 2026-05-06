import "dotenv/config";

const WEBFLOW_API_TOKEN = "6e73a999f027db82e639e182377fca2561f61b7363790d6acfbfc90c93047ceb";
const WEBFLOW_BASE_URL = "https://api.webflow.com/v2";

const COLLECTIONS = {
  properties: "69fb61a2e6b52a264df3076d",
  types: "69fb61b6575fe94b5223f129",
  neighborhoods: "69fb62f288a1071da3961042"
};

const INMOBILIARIAS = [1, 2];
const DOMUS_PERPAGE = 50;

// ─── UTILS ───────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function webflowRequest(method, path, body = null) {
  await sleep(1100);
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

// ─── WEBFLOW GETTERS ─────────────────────────────────────────────────────────

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

// ─── DOMUS GETTERS ────────────────────────────────────────────────────────────

async function getAllDomusProperties() {
  const allProperties = [];

  for (const inmobiliaria of INMOBILIARIAS) {
    let page = 1;
    let lastPage = 1;

    do {
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
      lastPage = json.last_page;
      allProperties.push(...json.data);
      console.log(`Inmobiliaria ${inmobiliaria} — página ${page}/${lastPage} (${json.data.length} props)`);
      page++;
    } while (page <= lastPage);
  }

  return allProperties;
}

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
  console.log("\n── Sincronizando Types ──");
  const domusTypes = await getAllDomusTypes();
  const webflowTypes = await getAllWebflowItems(COLLECTIONS.types);

  const webflowCodes = webflowTypes.map((i) => String(i.fieldData["code"]));
  const domusCodes = domusTypes.map((t) => String(t.code));

  const paraCrear = domusTypes.filter((t) => !webflowCodes.includes(String(t.code)));
  for (const type of paraCrear) {
    await webflowRequest("POST", `/collections/${COLLECTIONS.types}/items`, {
      fieldData: {
        name: type.name,
        code: String(type.code)
      }
    });
    console.log(`✓ Type creado: ${type.name} (${type.code})`);
  }

  const paraEliminar = webflowTypes.filter((i) => !domusCodes.includes(String(i.fieldData["code"])));
  for (const item of paraEliminar) {
    await webflowRequest("DELETE", `/collections/${COLLECTIONS.types}/items/${item.id}`);
    console.log(`✗ Type eliminado: ${item.fieldData.name}`);
  }

  console.log(`Types: ${paraCrear.length} creados, ${paraEliminar.length} eliminados`);
}

// ─── SYNC NEIGHBORHOODS ───────────────────────────────────────────────────────

async function syncNeighborhoods() {
  console.log("\n── Sincronizando Neighborhoods ──");
  const domusNeighborhoods = await getAllDomusNeighborhoods();
  const webflowNeighborhoods = await getAllWebflowItems(COLLECTIONS.neighborhoods);

  const webflowCodes = webflowNeighborhoods.map((i) => String(i.fieldData["code"]));
  const domusCodes = domusNeighborhoods.map((n) => String(n.code));

  const paraCrear = domusNeighborhoods.filter((n) => !webflowCodes.includes(String(n.code)));
  for (const neighborhood of paraCrear) {
    await webflowRequest("POST", `/collections/${COLLECTIONS.neighborhoods}/items`, {
      fieldData: {
        name: neighborhood.name,
        code: String(neighborhood.code),
        "city-code": String(neighborhood.city_code),
        "city-name": neighborhood.city_name.trim()
      }
    });
    console.log(`✓ Neighborhood creado: ${neighborhood.name} (${neighborhood.code})`);
  }

  const paraEliminar = webflowNeighborhoods.filter((i) => !domusCodes.includes(String(i.fieldData["code"])));
  for (const item of paraEliminar) {
    await webflowRequest("DELETE", `/collections/${COLLECTIONS.neighborhoods}/items/${item.id}`);
    console.log(`✗ Neighborhood eliminado: ${item.fieldData.name}`);
  }

  console.log(`Neighborhoods: ${paraCrear.length} creados, ${paraEliminar.length} eliminados`);
}

// ─── SYNC PROPERTIES ─────────────────────────────────────────────────────────

function mapPropertyToWebflow(property) {
  return {
    fieldData: {
      name: `${property.type?.trim() || "Propiedad"} en ${property.neighborhood?.trim() || property.city?.trim() || "zona"} - ${property.reference?.trim() || property.codpro}`,
      slug: `${property.codpro}-${property.reference || ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),

      idpro: String(property.idpro),
      codpro: String(property.codpro),

      reference: property.reference?.trim() || "",
      address: property.address?.trim() || "",
      city: property.city?.trim() || "",
      "city-code": String(property.city_code || ""),

      zone: property.zone?.trim() || "",
      "zone-code": String(property.zone_code || ""),

      "city-zone": property.city_zone?.trim() || "",
      "city-zone-code": String(property.city_zone_code || ""),

      neighborhood: property.neighborhood?.trim() || "",
      "neighborhood-code": String(property.neighborhood_code || ""),

      type: property.type?.trim() || "",
      "type-code": String(property.type_code || ""),

      biz: property.biz?.trim() || "",
      "biz-code": String(property.biz_code || ""),

      "area-cons-2": property.area_cons || 0,
      "area-lot-2": property.area_lot || 0,

      "bedrooms-2": property.bedrooms || 0,
      "bathrooms-2": property.bathrooms || 0,

      price: Number(property.price) || 0,
      "price-format-2": property.price_format || "",

      rent: Number(property.rent) || 0,
      saleprice: Number(property.saleprice) || 0,

      latitude: property.latitude ? parseFloat(property.latitude) : null,
      longitude: property.longitude ? parseFloat(property.longitude) : null,

      description: property.description?.trim() || "",

      "parking-2": property.parking || 0,
      "parking-covered-2": property.parking_covered || 0,

      "registry-date": property.registry_date
        ? new Date(property.registry_date).toISOString()
        : null,

      "vip-2": property.vip === true || property.vip === "true" || property.vip === 1,

      "real-state-logo": property.real_state_logo || "",
      "real-state-name": property.real_state_name?.trim() || "",

      comment: property.comment?.trim() || "",

      image1: property.image1 || "",
      image2: property.image2 || "",
      image3: property.image3 || "",

      // 🔥 CLAVE
      "update-on": property.updated_at
        ? new Date(property.updated_at).toISOString()
        : null
    }
  };
}

async function syncProperties() {
  console.log("\n── Sincronizando Properties ──");

  const domusProperties = await getAllDomusProperties();
  const webflowProperties = await getAllWebflowItems(COLLECTIONS.properties);

  const webflowMap = new Map(
    webflowProperties.map((item) => [
      String(item.fieldData["codpro"]),
      item
    ])
  );

  const domusMap = new Map(
    domusProperties.map((p) => [String(p.codpro), p])
  );

  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const property of domusProperties) {
    const codpro = String(property.codpro);
    const existing = webflowMap.get(codpro);
    const mapped = mapPropertyToWebflow(property);

    if (!existing) {
      await webflowRequest("POST", `/collections/${COLLECTIONS.properties}/items`, mapped);
      console.log(`✓ Property creada: ${property.reference} (${codpro})`);
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
        console.log(`↺ Property actualizada: ${property.reference} (${codpro})`);
        updated++;
      }
    }
  }

  for (const item of webflowProperties) {
    const codpro = String(item.fieldData["codpro"]);
    if (!domusMap.has(codpro)) {
      await webflowRequest("DELETE", `/collections/${COLLECTIONS.properties}/items/${item.id}`);
      console.log(`✗ Property eliminada: ${item.fieldData.name}`);
      deleted++;
    }
  }

  console.log(`Properties: ${created} creadas, ${updated} actualizadas, ${deleted} eliminadas`);
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const secret = req.headers["x-sync-secret"] || req.query.secret;
  if (secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { target } = req.query;

  try {
    if (target === "types" || target === "all") await syncTypes();
    if (target === "neighborhoods" || target === "all") await syncNeighborhoods();
    if (target === "properties" || target === "all") await syncProperties();

    return res.status(200).json({ ok: true, message: `Sync completado: ${target}` });
  } catch (error) {
    console.error("Sync error:", error);
    return res.status(500).json({ error: "Sync failed", details: error.message });
  }
}