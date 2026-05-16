const { connectDB } = require("../config/db");

describe("Database Function Test", () => {

  test("connectDB function should exist", () => {

    expect(connectDB).toBeDefined();

  });

});