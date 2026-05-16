require("dotenv").config();

const app = require("./src/app");
const { connectDB } = require("./config/db");
const { backfillReviewNotificationMessages } = require("./src/controllers/notificationController");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    await backfillReviewNotificationMessages();

    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });

  } catch (err) {
    console.error(err);

    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
}

// Prevent server startup during Jest testing
if (process.env.NODE_ENV !== "test") {
  startServer();
}

module.exports = app;