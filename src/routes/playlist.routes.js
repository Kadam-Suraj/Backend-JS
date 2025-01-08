import { Router } from 'express';
import {
    addToWatchLater,
    addVideoToPlaylist,
    checkVideoInPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserAllPlaylists,
    getUserCreatedPlaylists,
    removeVideoFromPlaylist,
    togglePlaylistVisibility,
    updatePlaylist,
} from "../controllers/playlist.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createPlaylist)

router
    .route("/:playlistId")
    .get(getPlaylistById)
    .patch(updatePlaylist)
    .delete(deletePlaylist);

router.route("/check/:videoId/:playlistId").get(checkVideoInPlaylist);

router.route("/watch/:videoId/").patch(addToWatchLater);
router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist);
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist);

router.route("/user/:userId").get(getUserCreatedPlaylists);
router.route("/user/:playlistId").patch(togglePlaylistVisibility);
router.route("/user/all/:userId").get(getUserAllPlaylists);

export default router