import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, updateUserProfile, changePassword, getCurrentUser, updateAvatar, updateCoverImage, getUserProfile, getWatchHistory } from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

// secured routes
router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT, changePassword);

router.route("/current-user").get(verifyJWT, getCurrentUser);

router.route("/update-profile").patch(verifyJWT, updateUserProfile);

router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);

router.route("/update-cover").patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

router.route("/c/:username").get(verifyJWT, getUserProfile);

router.route("/history").get(verifyJWT, getWatchHistory);

export default router;
