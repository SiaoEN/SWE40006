const { MongoClient } = require("mongodb");

let client;

function getDb() {
  if (!client) {
    throw new Error(
      "Database client is not initialized. Call connectDB() first."
    );
  }

  return client.db(process.env.MONGODB_DB_NAME || "KCHBites");
}

function getClient() {
  if (!client) {
    throw new Error(
      "Database client is not initialized. Call connectDB() first."
    );
  }

  return client;
}

async function getExistingCollection(collectionName) {
  const db = getDb();

  const collections = await db.listCollections().toArray();

  const exists = collections.some((c) => c.name === collectionName);

  if (!exists) {
    throw new Error(
      `Collection "${collectionName}" does not exist in the database. Please create it first.`
    );
  }

  return db.collection(collectionName);
}

function shouldTryFallback(err) {
  const dnsSrvCodes = [
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEOUT",
    "ESERVFAIL",
  ];

  return dnsSrvCodes.includes(err?.code);
}

async function connectWithUri(uri) {
  client = new MongoClient(uri);

  await client.connect();
}

async function connectDB() {
  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = process.env.MONGODB_URI_FALLBACK;

  if (!primaryUri) {
    console.error("Missing MONGODB_URI in environment.");

    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }

    throw new Error("Missing MONGODB_URI");
  }

  try {
    await connectWithUri(primaryUri);

    console.log("Connected to MongoDB Atlas");
  } catch (err) {
    if (shouldTryFallback(err) && fallbackUri) {
      console.warn(
        `Primary MongoDB SRV connection failed (${err.code}). Retrying with MONGODB_URI_FALLBACK...`
      );

      try {
        await connectWithUri(fallbackUri);

        console.log("Connected to MongoDB Atlas via fallback URI");

        return;
      } catch (fallbackErr) {
        console.error(
          "MongoDB fallback connection failed:",
          fallbackErr
        );
      }
    }

    console.error(err);

    // Prevent Jest from crashing
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }

    throw err;
  }
}

module.exports = {
  connectDB,
  getDb,
  getClient,
  getExistingCollection,
};