const express = require("express");
const {
  createProfileHandler,
  getSingleProfileHandler,
  getAllProfilesHandler,
  deleteProfileHandler,
} = require("../controllers/profileController");
const { verifyAccessToken } = require("../middleware/authMiddleware");

const router = express.Router();

// All profile endpoints require authentication
router.use(verifyAccessToken);

router.post("/", createProfileHandler);
router.get("/", getAllProfilesHandler);
router.get("/:id", getSingleProfileHandler);
router.delete("/:id", deleteProfileHandler);

module.exports = router;
