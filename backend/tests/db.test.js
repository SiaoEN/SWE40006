const { connectDB } = require("../config/db");

describe("MongoDB Test (CI Safe)", () => {

  test("should only run if valid URI exists", async () => {

    const uri = process.env.MONGODB_URI;

    if (!uri || !uri.startsWith("mongodb")) {
      console.log("Skipping DB test: invalid or missing MongoDB URI");
      return;
    }

    await connectDB();

    expect(true).toBe(true);

  });

});