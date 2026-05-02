const express = require("express");
const multer = require("multer");
const path = require("path");

const healthController = require("../controllers/healthController");
const authRoutes = require("./authRoutes");
const newsRoutes = require("./newsRoutes");
const locationRoutes = require("./locationRoutes");
const feedbackController = require("../controllers/feedbackController");
const reviewController = require("../controllers/reviewController");
const restaurantController = require("../controllers/restaurantController");

const router = express.Router();

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => {
		cb(null, path.join(__dirname, "../uploads/feedback"));
	},
	filename: (_req, file, cb) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, uniqueSuffix + path.extname(file.originalname));
	},
});

const fileFilter = (_req, file, cb) => {
	const allowedMimes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
	if (allowedMimes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed."));
	}
};

const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: 10 * 1024 * 1024 },
});

router.get("/health", healthController.getHealth);
router.use("/auth", authRoutes);
router.use("/news", newsRoutes);
router.use("/location", locationRoutes);
// Feedback routes
router.post("/feedback", upload.array("attachments", 5), feedbackController.submitFeedback);
router.get("/feedback/user/:userId", feedbackController.getUserFeedback);
router.get("/feedback", feedbackController.getAllFeedback);
router.put("/feedback/:feedbackId/status", feedbackController.updateFeedbackStatus);
router.put("/feedback/:feedbackId", feedbackController.editFeedback);
router.delete("/feedback/:feedbackId", feedbackController.deleteFeedback);
router.get("/feedback/download/:filename", feedbackController.downloadFile);

// Review routes
router.post("/reviews", upload.array("attachments", 5), reviewController.submitReview);
router.get("/reviews", reviewController.getAllReviews);
router.get("/reviews/restaurant/:restaurantId", reviewController.getReviewsByRestaurant);
router.post("/reviews/:reviewId/like", reviewController.likeReview);
router.post("/reviews/:reviewId/dislike", reviewController.dislikeReview);
router.post("/reviews/:reviewId/report", reviewController.reportReview);
router.delete("/reviews/:reviewId", reviewController.deleteReview);
router.post("/reviews/:reviewId/clear-reports", reviewController.clearReports);

// Restaurant routes
router.post("/restaurants", restaurantController.createRestaurant);
router.get("/restaurants", restaurantController.getAllRestaurants);
router.get("/restaurants/:id", restaurantController.getRestaurantById);
router.put("/restaurants/:id", restaurantController.updateRestaurant);
router.delete("/restaurants/:id", restaurantController.deleteRestaurant);

module.exports = router;
