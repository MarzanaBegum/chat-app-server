const router = require("express").Router();
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes")
const conversationRoutes = require("./conversationRoutes")

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/conversation",conversationRoutes);

module.exports = router;
