require("dotenv").config();

const { getClient } = require("../config/db");

describe("MongoDB Test (CI Safe)", () => {

  test("MONGODB_URI should exist in environment", () => {

    const uri = process.env.MONGODB_URI;

    console.log("DEBUG MONGODB_URI:", uri);

    expect(uri).toBeDefined();
    expect(uri.startsWith("mongodb")).toBe(true);
  });

});