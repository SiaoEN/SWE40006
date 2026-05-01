const feedbackData = []; // Temporary storage - replace with DB later

// Submit feedback
exports.submitFeedback = (req, res) => {
  try {
    const { userId, username, message, rating, type } = req.body;
    const parsedRating = Number(rating);

    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        message: "User ID and message are required",
      });
    }

    if (rating === undefined || rating === null || rating === "") {
      return res.status(400).json({
        success: false,
        message: "Rating is required",
      });
    }

    if (Number.isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a number between 0 and 5",
      });
    }

    if (type === "rating" && parsedRating === 0) {
      return res.status(400).json({
        success: false,
        message: "Quick rating requires a score from 1 to 5",
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

    const feedback = {
      id: Date.now().toString(),
      userId,
      username: username || "Anonymous",
      message,
      rating: parsedRating,
      type: type || "feedback",
      attachments,
      createdAt: new Date().toISOString(),
      status: "pending",
      adminResponse: "",
    };

    feedbackData.push(feedback);

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error submitting feedback",
      error: error.message,
    });
  }
};

// Get user's feedback
exports.getUserFeedback = (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const userFeedback = feedbackData.filter((f) => f.userId === userId);

    res.status(200).json({
      success: true,
      feedback: userFeedback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving feedback",
      error: error.message,
    });
  }
};

// Get all feedback (admin only)
exports.getAllFeedback = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      feedback: feedbackData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving feedback",
      error: error.message,
    });
  }
};

// Update feedback status (admin only)
exports.updateFeedbackStatus = (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status, adminResponse } = req.body;

    // Validate status
    const validStatuses = ["pending", "in-review", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Find and update feedback
    const feedback = feedbackData.find((f) => f.id === feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    feedback.status = status;
    if (adminResponse) {
      feedback.adminResponse = adminResponse;
      feedback.responseDate = new Date().toISOString();
    }

    res.status(200).json({
      success: true,
      message: "Feedback status updated successfully",
      feedback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating feedback status",
      error: error.message,
    });
  }
};

// Download file
const path = require("path");
exports.downloadFile = (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "../uploads/feedback", filename);

    // Security: ensure the file is within the uploads directory
    const resolvedPath = path.resolve(filePath);
    const uploadsDir = path.resolve(path.join(__dirname, "../uploads/feedback"));
    if (!resolvedPath.startsWith(uploadsDir)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.download(filePath);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error downloading file",
      error: error.message,
    });
  }
};
