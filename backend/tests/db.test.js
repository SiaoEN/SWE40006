const { connectDB, getClient } = require("../config/db");

describe("MongoDB Test (CI Safe)", () => {

  test("connectDB should not crash in CI", async () => {
    await connectDB();

    const client = getClient();

    expect(client).toBeDefined();
  });

  afterAll(async () => {
    try {
      const client = getClient();
      await client.close();
    } catch (err) {
      console.log("DB already closed");
    }
  });

});