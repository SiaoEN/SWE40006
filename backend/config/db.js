const { MongoClient } = require("mongodb");

let client;

function shouldTryFallback(err) {
  const dnsSrvCodes = ["ECONNREFUSED", "ENOTFOUND", "ETIMEOUT", "ESERVFAIL"];
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
    process.exit(1);
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
        console.error("MongoDB fallback connection failed:", fallbackErr);
      }
    }

    console.error(err);
    process.exit(1); // stop app if DB fails
  }
}

module.exports = { connectDB, client };