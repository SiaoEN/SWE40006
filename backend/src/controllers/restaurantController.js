const { getClient, getExistingCollection } = require("../../config/db");

const DB_NAME = process.env.MONGODB_DBNAME || "KCHBites";

function getDb() {
  const client = getClient();
  return client.db(DB_NAME);
}

function normalizeOperatingHours(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }

  return value;
}

// Create a restaurant
exports.createRestaurant = async (req, res) => {
  try {
    console.log('[DEBUG] createRestaurant req.body keys:', Object.keys(req.body || {}));
    try { console.log('[DEBUG] createRestaurant full body:', JSON.stringify(req.body)); } catch(e){ console.log('[DEBUG] createRestaurant body stringify error'); }
    const { name, address, description, tags, photos, operatingHours } = req.body;
    let { lat, lng } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const db = getDb();
    const restaurants = await getExistingCollection("Restaurant");

    const doc = {
      name,
      address: address || null,
      description: description || null,
      tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
      photos: Array.isArray(photos) ? photos : photos ? [photos] : [],
      operatingHours: normalizeOperatingHours(operatingHours),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (lat !== undefined && lng !== undefined) {
      lat = Number(lat);
      lng = Number(lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ success: false, message: "Invalid coordinates" });
      }

      doc.location = { type: "Point", coordinates: [lng, lat] };
    }

    // Ensure geospatial index exists (no-op if already present)
    try {
      await restaurants.createIndex({ location: "2dsphere" });
    } catch (err) {
      // ignore index errors
    }

    const result = await restaurants.insertOne(doc);

    // DEBUG: log operatingHours and inserted document shape
    try {
      console.log('[DEBUG] createRestaurant operatingHours (doc):', JSON.stringify(doc.operatingHours));
      console.log('[DEBUG] createRestaurant insertedId:', String(result.insertedId));
      console.log('[DEBUG] createRestaurant full doc keys:', Object.keys(doc));
    } catch (e) {
      console.log('[DEBUG] createRestaurant logging error', e && e.message);
    }

    res.status(201).json({ success: true, restaurant: { _id: result.insertedId, ...doc } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating restaurant", error: error.message });
  }
};

// Get list of restaurants, or nearby if query param provided
exports.getAllRestaurants = async (req, res) => {
  try {
    const db = getDb();
    const restaurants = await getExistingCollection("Restaurant");

    const { near, radius, limit, page } = req.query;

    if (near) {
      // near format: lng,lat
      const parts = String(near).split(",").map((p) => Number(p));
      if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) {
        return res.status(400).json({ success: false, message: "Invalid near parameter" });
      }

      const [lng, lat] = parts;
      const maxDistance = Number(radius) || 5000; // meters
      const cursor = restaurants.find({
        location: {
          $nearSphere: {
            $geometry: { type: "Point", coordinates: [lng, lat] },
            $maxDistance: maxDistance,
          },
        },
      });

      const items = await cursor.toArray();
      return res.status(200).json({ success: true, restaurants: items });
    }

    const perPage = Number(limit) || 50;
    const pg = Math.max(0, Number(page) || 0);

    const items = await restaurants.find({}).skip(pg * perPage).limit(perPage).toArray();
    res.status(200).json({ success: true, restaurants: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching restaurants", error: error.message });
  }
};

// Get single restaurant by id
const { ObjectId } = require("mongodb");

exports.getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const db = getDb();
    const restaurants = await getExistingCollection("Restaurant");
    const doc = await restaurants.findOne({ _id: new ObjectId(id) });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, restaurant: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching restaurant", error: error.message });
  }
};

// Update a restaurant
exports.updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const { name, address, description, tags, photos, operatingHours, lat, lng } = req.body;

    const db = getDb();
    const restaurants = await getExistingCollection("Restaurant");

    const updateData = { updatedAt: new Date() };

    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : tags ? [tags] : [];
    if (photos !== undefined) updateData.photos = Array.isArray(photos) ? photos : photos ? [photos] : [];
    if (operatingHours !== undefined) updateData.operatingHours = normalizeOperatingHours(operatingHours);

    if (lat !== undefined && lng !== undefined) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        return res.status(400).json({ success: false, message: "Invalid coordinates" });
      }
      updateData.location = { type: "Point", coordinates: [lngNum, latNum] };
    }

    const result = await restaurants.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    const updatedRestaurant = await restaurants.findOne({ _id: new ObjectId(id) });

    // DEBUG: log operatingHours received and updated document
    try {
      console.log('[DEBUG] updateRestaurant received operatingHours:', JSON.stringify(operatingHours));
      console.log('[DEBUG] updateRestaurant saved operatingHours:', JSON.stringify(updatedRestaurant.operatingHours));
    } catch (e) {
      console.log('[DEBUG] updateRestaurant logging error', e && e.message);
    }

    res.status(200).json({ success: true, message: "Restaurant updated successfully", restaurant: updatedRestaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating restaurant", error: error.message });
  }
};

// Delete a restaurant
exports.deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const db = getDb();
    const restaurants = await getExistingCollection("Restaurant");

    const result = await restaurants.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    res.status(200).json({ success: true, message: "Restaurant deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting restaurant", error: error.message });
  }
};
