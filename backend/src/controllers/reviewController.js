const { getClient, getExistingCollection } = require("../../config/db");
const { ObjectId } = require("mongodb");

const DB_NAME = process.env.MONGODB_DBNAME || "KCHBites";

function getDb() {
  const client = getClient();
  return client.db(DB_NAME);
}

function unwrapFindOneAndUpdateResult(result) {
  if (!result) return null;
  if (Object.prototype.hasOwnProperty.call(result, "value")) {
    return result.value;
  }
  return result;
}

// Submit restaurant review
exports.submitReview = async (req, res) => {
  try {
    const { userId, username, restaurantId, restaurantName, rating, comment } = req.body;
    const parsedRating = Number(rating);

    if (!restaurantId || !comment) {
      return res.status(400).json({ success: false, message: "Restaurant ID and comment are required" });
    }

    if (
      rating === undefined ||
      rating === null ||
      rating === "" ||
      Number.isNaN(parsedRating) ||
      parsedRating < 1 ||
      parsedRating > 5
    ) {
      return res.status(400).json({ success: false, message: "Rating must be a number between 1 and 5" });
    }

    // Handle uploaded files
    const attachments = req.files
      ? req.files.map((f) => ({
          filename: f.filename,
          originalName: f.originalname,
          path: f.path,
          mimetype: f.mimetype,
          size: f.size,
        }))
      : [];

    const db = getDb();
    const coll = await getExistingCollection("Review");

    const doc = {
      userId,
      username: username || "Anonymous",
      restaurantId,
      restaurantName: restaurantName || "Unknown",
      rating: parsedRating,
      comment,
      attachments,
      createdAt: new Date(),
      likes: [],
      dislikes: [],
      reports: [],
    };

    const result = await coll.insertOne(doc);

    res.status(201).json({ success: true, message: "Review submitted successfully", review: { _id: result.insertedId, ...doc } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error submitting review", error: error.message });
  }
};

// Get all reviews
exports.getAllReviews = async (req, res) => {
  try {
    const db = getDb();
    const coll = await getExistingCollection("Review");
    const items = await coll.find({}).sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, reviews: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching reviews", error: error.message });
  }
};

// Get reviews by restaurant
exports.getReviewsByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const db = getDb();
    const coll = await getExistingCollection("Review");
    const items = await coll.find({ restaurantId }).sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, reviews: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching reviews", error: error.message });
  }
};

// Like a review
exports.likeReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: "User ID is required" });

    const db = getDb();
    const coll = await getExistingCollection("Review");

    if (!ObjectId.isValid(reviewId)) return res.status(400).json({ success: false, message: "Invalid review id" });

    const resp = await coll.findOneAndUpdate(
      { _id: new ObjectId(reviewId) },
      { $addToSet: { likes: userId }, $pull: { dislikes: userId } },
      { returnDocument: "after" }
    );

    const updated = unwrapFindOneAndUpdateResult(resp);
    if (!updated) return res.status(404).json({ success: false, message: "Review not found" });

    res.status(200).json({ success: true, message: "Review liked", review: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error liking review", error: error.message });
  }
};

// Dislike a review
exports.dislikeReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: "User ID is required" });

    const db = getDb();
    const coll = await getExistingCollection("Review");

    if (!ObjectId.isValid(reviewId)) return res.status(400).json({ success: false, message: "Invalid review id" });

    const resp = await coll.findOneAndUpdate(
      { _id: new ObjectId(reviewId) },
      { $addToSet: { dislikes: userId }, $pull: { likes: userId } },
      { returnDocument: "after" }
    );

    const updated = unwrapFindOneAndUpdateResult(resp);
    if (!updated) return res.status(404).json({ success: false, message: "Review not found" });

    res.status(200).json({ success: true, message: "Review disliked", review: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error disliking review", error: error.message });
  }
};

// Report a review
exports.reportReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId, reason } = req.body;

    if (!userId || !reason) return res.status(400).json({ success: false, message: "User ID and reason are required" });

    const db = getDb();
  const coll = await getExistingCollection("Review");

    if (!ObjectId.isValid(reviewId)) return res.status(400).json({ success: false, message: "Invalid review id" });

    const existing = await coll.findOne({ _id: new ObjectId(reviewId) });
    if (!existing) return res.status(404).json({ success: false, message: "Review not found" });
    if (existing.userId === userId) return res.status(403).json({ success: false, message: "You cannot report your own review" });

    const already = (existing.reports || []).some((r) => r.userId === userId);
    if (already) return res.status(400).json({ success: false, message: "You have already reported this review" });

    const resp = await coll.findOneAndUpdate(
      { _id: new ObjectId(reviewId) },
      { $push: { reports: { userId, reason, reportedAt: new Date() } } },
      { returnDocument: "after" }
    );

    const updated = unwrapFindOneAndUpdateResult(resp);
    res.status(200).json({ success: true, message: "Review reported successfully", review: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error reporting review", error: error.message });
  }
};

// Delete a review (user own review only, admin override allowed)
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId, isAdmin } = req.body;

    const db = getDb();
    const coll = await getExistingCollection("Review");

    if (!ObjectId.isValid(reviewId)) return res.status(400).json({ success: false, message: "Invalid review id" });

    const existing = await coll.findOne({ _id: new ObjectId(reviewId) });
    if (!existing) return res.status(404).json({ success: false, message: "Review not found" });

    const adminFlag = isAdmin === true || isAdmin === "true";
    if (existing.userId !== userId && !adminFlag) return res.status(403).json({ success: false, message: "You can only delete your own reviews" });

    await coll.deleteOne({ _id: new ObjectId(reviewId) });

    res.status(200).json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting review", error: error.message });
  }
};

// Clear reports for a review (admin only)
exports.clearReports = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isAdmin } = req.body;

    const adminFlag = isAdmin === true || isAdmin === "true";
    if (!adminFlag) return res.status(403).json({ success: false, message: "Only admins can clear reports" });

    const db = getDb();
    const coll = await getExistingCollection("Review");

    if (!ObjectId.isValid(reviewId)) return res.status(400).json({ success: false, message: "Invalid review id" });

    const resp = await coll.findOneAndUpdate({ _id: new ObjectId(reviewId) }, { $set: { reports: [] } }, { returnDocument: "after" });

    const updated = unwrapFindOneAndUpdateResult(resp);
    if (!updated) return res.status(404).json({ success: false, message: "Review not found" });

    res.status(200).json({ success: true, message: "Reports cleared", review: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error clearing reports", error: error.message });
  }
};
