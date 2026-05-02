const { getClient } = require("../../config/db");
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

// Submit feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { userId, username, message, rating, type } = req.body;
    const parsedRating = Number(rating);

    // Allow submissions when either userId or username is provided
    if ((!userId && !username) || !message) {
      return res.status(400).json({ success: false, message: "User identification (userId or username) and message are required" });
    }

    if (rating === undefined || rating === null || rating === "") {
      return res.status(400).json({ success: false, message: "Rating is required" });
    }

    if (Number.isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be a number between 0 and 5" });
    }

    if (type === "rating" && parsedRating === 0) {
      return res.status(400).json({ success: false, message: "Quick rating requires a score from 1 to 5" });
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

    const doc = {
      userId,
      username: username || "Anonymous",
      message,
      rating: parsedRating,
      type: type || "feedback",
      attachments,
      createdAt: new Date(),
      status: "pending",
      adminResponse: "",
    };

    const db = getDb();
    const coll = db.collection("feedbacks");
    const result = await coll.insertOne(doc);

    res.status(201).json({ success: true, message: "Feedback submitted successfully", feedback: { _id: result.insertedId, ...doc } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error submitting feedback", error: error.message });
  }
};

// Get user's feedback
exports.getUserFeedback = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User identifier is required" });
    }

    const db = getDb();
    const coll = db.collection("feedbacks");

    // Support fetching by username as well as by userId value
    const queryByUsername = { username: userId };
    const queryByUserId = { userId };

    // Prefer username match first (since usernames may contain readable strings)
    const itemsByUsername = await coll.find(queryByUsername).sort({ createdAt: -1 }).toArray();
    const items = itemsByUsername.length > 0 ? itemsByUsername : await coll.find(queryByUserId).sort({ createdAt: -1 }).toArray();

    res.status(200).json({ success: true, feedback: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error retrieving feedback", error: error.message });
  }
};

// Explicit username-based fetch (keeps intent clear)
exports.getFeedbackByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ success: false, message: "Username is required" });

    const db = getDb();
    const coll = db.collection("feedbacks");
    const items = await coll.find({ username }).sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, feedback: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error retrieving feedback by username", error: error.message });
  }
};

// Get all feedback (admin only)
exports.getAllFeedback = async (req, res) => {
  try {
    const db = getDb();
    const coll = db.collection("feedbacks");
    const items = await coll.find({}).sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, feedback: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error retrieving feedback", error: error.message });
  }
};

// Update feedback status (admin only)
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status, adminResponse } = req.body;

    // Validate status
    const validStatuses = ["pending", "in-review", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    const db = getDb();
    const coll = db.collection("feedbacks");

    if (!ObjectId.isValid(feedbackId)) {
      return res.status(400).json({ success: false, message: "Invalid feedback id" });
    }

    const update = { $set: { status, updatedAt: new Date() } };
    if (adminResponse) {
      update.$set.adminResponse = adminResponse;
      update.$set.responseDate = new Date(); // Set response date when response is provided
    }

    const resp = await coll.findOneAndUpdate({ _id: new ObjectId(feedbackId) }, update, { returnDocument: "after" });
    let updated = unwrapFindOneAndUpdateResult(resp);

    // Fallbacks: sometimes the client may send a non-standard id string or the stored doc uses a string id.
    if (!updated) {
      // Try matching by string _id (if stored as string)
      const resp2 = await coll.findOneAndUpdate({ _id: feedbackId }, update, { returnDocument: "after" });
      updated = unwrapFindOneAndUpdateResult(resp2);
    }

    if (!updated) {
      // Try matching by an `id` field if frontend normalized differently
      const resp3 = await coll.findOneAndUpdate({ id: feedbackId }, update, { returnDocument: "after" });
      updated = unwrapFindOneAndUpdateResult(resp3);
    }

    if (!updated) return res.status(404).json({ success: false, message: "Feedback not found" });

    res.status(200).json({ success: true, message: "Feedback status updated successfully", feedback: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating feedback status", error: error.message });
  }
};

// Edit feedback (admin) - update message, rating, type
exports.editFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { message, rating, type } = req.body;

    const db = getDb();
    const coll = db.collection("feedbacks");

    const update = { $set: {} };
    if (message !== undefined) update.$set.message = message;
    if (rating !== undefined) update.$set.rating = Number(rating);
    if (type !== undefined) update.$set.type = type;

    // Ensure we have something to update
    if (Object.keys(update.$set).length === 0) {
      return res.status(400).json({ success: false, message: "Nothing to update" });
    }

    let resp;
    if (ObjectId.isValid(feedbackId)) {
      resp = await coll.findOneAndUpdate({ _id: new ObjectId(feedbackId) }, update, { returnDocument: "after" });
    } else {
      resp = await coll.findOneAndUpdate({ id: feedbackId }, update, { returnDocument: "after" });
    }

    const updated = unwrapFindOneAndUpdateResult(resp);
    if (!updated) return res.status(404).json({ success: false, message: "Feedback not found" });

    res.status(200).json({ success: true, message: "Feedback updated", feedback: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error editing feedback", error: error.message });
  }
};

// Delete feedback (admin)
exports.deleteFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const db = getDb();
    const coll = db.collection("feedbacks");

    let resp;
    if (ObjectId.isValid(feedbackId)) {
      resp = await coll.deleteOne({ _id: new ObjectId(feedbackId) });
    } else {
      resp = await coll.deleteOne({ id: feedbackId });
    }

    if (!resp.deletedCount) return res.status(404).json({ success: false, message: "Feedback not found" });

    res.status(200).json({ success: true, message: "Feedback deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting feedback", error: error.message });
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
