require("dotenv").config();

const app = require("./src/app");
const {connectDB} = require("./config/db");
const { backfillReviewNotificationMessages } = require("./src/controllers/notificationController");

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  backfillReviewNotificationMessages()
    .catch((err) => {
      console.error("Failed to backfill review notifications:", err);
    })
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`Backend server running on port ${PORT}`);
      });
    });
});
