require("dotenv").config();

describe("MongoDB Test (Universal Safe)", () => {

  test("MONGODB_URI should be valid if provided", () => {

    const uri = process.env.MONGODB_URI;

    console.log("DEBUG MONGODB_URI:", uri ? "exists" : "missing");

    // If no env provided → skip test instead of failing
    if (!uri) {
      console.warn("Skipping DB test: MONGODB_URI not set");
      return;
    }

    // Ensure it's a string
    expect(typeof uri).toBe("string");

    // Ensure correct MongoDB format
    expect(uri).toMatch(/^mongodb(\+srv)?:\/\//);

  });

});