import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addVideoToWatchHistory, getVideosFromWatchHistory, removeVideoFromWatchHistory } from "../controllers/watchHistory.controller.js";

const router = Router();

// apply verifyJWT middleware to all routes in this file
router.use(verifyJWT);

router.route("/").get(getVideosFromWatchHistory);

router.route("/:videoId")
    .post(addVideoToWatchHistory)
    .delete(removeVideoFromWatchHistory)

export default router;