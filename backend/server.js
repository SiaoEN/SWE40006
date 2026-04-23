require("dotenv").config();

const app = require("./src/app");
const {connectDB} = require("./config/db");

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
});
