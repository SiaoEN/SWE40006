const reviewData = []; // Temporary storage - replace with DB later

// Submit restaurant review
exports.submitReview = (req, res) => {
  try {
    const { userId, username, restaurantId, restaurantName, rating, comment } = req.body;
    const parsedRating = Number(rating);

    if (!userId || !restaurantId || !comment) {
      return res.status(400).json({
        success: false,
        message: "User ID, restaurant ID, and comment are required",
      });
    }

    if (
      rating === undefined ||
      rating === null ||
      rating === "" ||
      Number.isNaN(parsedRating) ||
      parsedRating < 1 ||
      parsedRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a number between 1 and 5",
      });
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

    const review = {
      id: Date.now().toString(),
      userId,
      username: username || "Anonymous",
      restaurantId,
      restaurantName: restaurantName || "Unknown",
      rating: parsedRating,
      comment,
      attachments,
      createdAt: new Date().toISOString(),
      likes: [],
      dislikes: [],
      reports: [],
    };

    reviewData.push(review);

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error submitting review",
      error: error.message,
    });
  }
};

// Get all reviews
exports.getAllReviews = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      reviews: reviewData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching reviews",
      error: error.message,
    });
  }
};

// Get reviews by restaurant
exports.getReviewsByRestaurant = (req, res) => {
  try {
    const { restaurantId } = req.params;
    const restaurantReviews = reviewData.filter((r) => r.restaurantId === restaurantId);

    res.status(200).json({
      success: true,
      reviews: restaurantReviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching reviews",
      error: error.message,
    });
  }
};

// Like a review
exports.likeReview = (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const review = reviewData.find((r) => r.id === reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Remove from dislikes if present
    review.dislikes = review.dislikes.filter((id) => id !== userId);

    // Add to likes if not already there
    if (!review.likes.includes(userId)) {
      review.likes.push(userId);
    }

    res.status(200).json({
      success: true,
      message: "Review liked",
      review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error liking review",
      error: error.message,
    });
  }
};

// Dislike a review
exports.dislikeReview = (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const review = reviewData.find((r) => r.id === reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Remove from likes if present
    review.likes = review.likes.filter((id) => id !== userId);

    // Add to dislikes if not already there
    if (!review.dislikes.includes(userId)) {
      review.dislikes.push(userId);
    }

    res.status(200).json({
      success: true,
      message: "Review disliked",
      review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error disliking review",
      error: error.message,
    });
  }
};

// Report a review
exports.reportReview = (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId, reason } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({
        success: false,
        message: "User ID and reason are required",
      });
    }

    const review = reviewData.find((r) => r.id === reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.userId === userId) {
      return res.status(403).json({
        success: false,
        message: "You cannot report your own review",
      });
    }

    // Check if user already reported this review
    const existingReport = review.reports.find((r) => r.userId === userId);
    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: "You have already reported this review",
      });
    }

    review.reports.push({
      userId,
      reason,
      reportedAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Review reported successfully",
      review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error reporting review",
      error: error.message,
    });
  }
};

// Delete a review (user own review only, admin override allowed)
exports.deleteReview = (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId, isAdmin } = req.body;

    const review = reviewData.find((r) => r.id === reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Allow deletion if owner or if request indicates admin privilege
    const adminFlag = isAdmin === true || isAdmin === 'true';
    if (review.userId !== userId && !adminFlag) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reviews",
      });
    }

    const index = reviewData.indexOf(review);
    reviewData.splice(index, 1);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting review",
      error: error.message,
    });
  }
};

// Clear reports for a review (admin only)
exports.clearReports = (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isAdmin } = req.body;

    const adminFlag = isAdmin === true || isAdmin === 'true';
    if (!adminFlag) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can clear reports',
      });
    }

    const review = reviewData.find((r) => r.id === reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    review.reports = [];

    res.status(200).json({ success: true, message: 'Reports cleared', review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing reports', error: error.message });
  }
};
