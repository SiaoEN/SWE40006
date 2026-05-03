const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const apiRoutes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { register, login, updateProfile } = require("./controllers/authController");
const authenticateToken = require("./middleware/auth");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
// Allow larger JSON payloads (profile avatar data URLs can be sizeable)
app.use(express.json({ limit: '5mb' }));

// Some clients/requests may send JSON as text/plain; accept text bodies too
app.use(express.text({ type: ['text/*', 'application/*+json'], limit: '1mb' }));

// If a text body was received, try to parse it as JSON so downstream handlers get an object
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (typeof req.body === 'string' && contentType.includes('text')) {
    try {
      req.body = JSON.parse(req.body);
    } catch (err) {
      // If parsing fails, leave body as-is; handlers will validate and respond accordingly
      console.warn('Failed to parse text body as JSON for', req.path);
    }
  }
  next();
});

// Static file serving for uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/feedback"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed."));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const feedbackController = require("./controllers/feedbackController");
const reviewController = require("./controllers/reviewController");

// Explicit routes for feedback and reviews to avoid path-mount issues on the shared API router.
app.post("/api/feedback", upload.array("attachments", 5), feedbackController.submitFeedback);
app.get("/api/feedback/user/:userId", feedbackController.getUserFeedback);
app.get("/api/feedback/username/:username", feedbackController.getFeedbackByUsername);
app.get("/api/feedback", feedbackController.getAllFeedback);
app.put("/api/feedback/:feedbackId/status", feedbackController.updateFeedbackStatus);
app.put("/api/feedback/:feedbackId", feedbackController.editFeedback);
app.delete("/api/feedback/:feedbackId", feedbackController.deleteFeedback);
app.get("/api/feedback/download/:filename", feedbackController.downloadFile);

app.post("/api/reviews", upload.array("attachments", 5), reviewController.submitReview);
app.get("/api/reviews", reviewController.getAllReviews);
app.get("/api/reviews/restaurant/:restaurantId", reviewController.getReviewsByRestaurant);
app.post("/api/reviews/:reviewId/like", reviewController.likeReview);
app.post("/api/reviews/:reviewId/dislike", reviewController.dislikeReview);
app.post("/api/reviews/:reviewId/report", reviewController.reportReview);
app.delete("/api/reviews/:reviewId", reviewController.deleteReview);
app.post("/api/reviews/:reviewId/clear-reports", reviewController.clearReports);

// Explicit auth routes to avoid router mounting issues in development and production.
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.put("/api/auth/profile", authenticateToken, updateProfile);

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "KCH Bites API is running",
  });
});

app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
