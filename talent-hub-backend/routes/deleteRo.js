// =============================================
// BACKEND ROUTES — Express.js
// =============================================
// Add these routes in your Express server

const express = require("express");
const router = express.Router();

// Assume these models exist in your project:
// const User = require("../models/User");
// const Video = require("../models/Video");
// const authMiddleware = require("../middleware/auth"); // verifies JWT token

// ──────────────────────────────────────────────
// DELETE VIDEO — DELETE /api/videos/:videoId
// Only the owner can delete their video
// ──────────────────────────────────────────────
router.delete("/videos/:videoId", authMiddleware, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check ownership
    if (video.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to delete this video" });
    }

    // Optional: Delete video file from storage (Cloudinary / S3 / local)
    // await cloudinary.uploader.destroy(video.publicId);

    await video.deleteOne();

    return res.status(200).json({ message: "Video deleted successfully" });
  } catch (err) {
    console.error("Delete video error:", err);
    return res.status(500).json({ message: "Server error while deleting video" });
  }
});

// ──────────────────────────────────────────────
// GET USER VIDEOS — GET /api/videos/user/:userId
// Returns all videos uploaded by a user
// ──────────────────────────────────────────────
router.get("/videos/user/:userId", authMiddleware, async (req, res) => {
  try {
    const videos = await Video.find({ uploadedBy: req.params.userId })
      .sort({ createdAt: -1 })
      .select("_id title thumbnail duration views likes createdAt");

    return res.status(200).json({ videos });
  } catch (err) {
    console.error("Fetch user videos error:", err);
    return res.status(500).json({ message: "Server error while fetching videos" });
  }
});

// ──────────────────────────────────────────────
// DELETE ACCOUNT — DELETE /api/users/:userId
// Deletes user + all their videos
// ──────────────────────────────────────────────
router.delete("/users/:userId", authMiddleware, async (req, res) => {
  try {
    // Security: only the user themselves can delete their account
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Step 1: Delete all videos by this user
    const userVideos = await Video.find({ uploadedBy: req.params.userId });

    for (const video of userVideos) {
      // Optional: Delete from Cloudinary/S3
      // await cloudinary.uploader.destroy(video.publicId);
      await video.deleteOne();
    }

    // Step 2: Remove user from other users' followers/following lists
    await User.updateMany(
      { followers: req.params.userId },
      { $pull: { followers: req.params.userId } }
    );
    await User.updateMany(
      { following: req.params.userId },
      { $pull: { following: req.params.userId } }
    );

    // Step 3: Delete the user document
    await User.findByIdAndDelete(req.params.userId);

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).json({ message: "Server error while deleting account" });
  }
});

module.exports = router;

// ══════════════════════════════════════════════
// HOW TO USE IN app.js / server.js
// ══════════════════════════════════════════════
// const routes = require("./routes/deleteRoutes");
// app.use("/api", routes);