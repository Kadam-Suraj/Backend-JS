import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { Like } from "../models/like.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    const { name, description, videoIds } = req.body
    const userId = req.user?._id;

    if (!isValidObjectId(userId)) {
        throw new apiError(401, "Unauthorized request");
    }

    if (!(name && description)) {
        throw new apiError(400, "name and description is required to create playlist");
    }

    videoIds.forEach(videoId => {
        if (!isValidObjectId(videoId)) {
            throw new apiError(400, "Invalid video ID");
        }
    });

    const playlist = await Playlist.create(
        {
            name: name,
            description: description,
            owner: userId,
            videos: videoIds
        }
    );

    if (!playlist) {
        throw new apiError(500, "Failed to create playlist");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                playlist,
                "Playlist created successfully"
            )
        );
})

const getUserCreatedPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists
    const {
        page = 1,
        limit = 10,
        sortBy = null,
        sortType = null,
        userId
    } = req.params;

    if (!isValidObjectId(userId)) {
        throw new apiError(400, "Invalid user ID");
    }

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { [sortBy]: sortType === "desc" ? -1 : 1 }
    }

    const pipeline = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
                name: { $nin: ["Watch Later", "Liked videos"] },
                isPublic: true
            },
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $project: {
                            thumbnail: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                video: { $last: "$video" } // get only last video
            }
        },
        {
            $unwind: {
                path: "$video",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $sort: {
                sortOrder: 1, // Sort by sortOrder (Watch Later first)
                createdAt: -1 // For other playlists, sort by creation date (optional)
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                owner: 1,
                createdAt: 1,
                updatedAt: 1,
                video: 1,
                totalVideos: 1,
                isUpdated: 1,
                isPublic: 1
            }
        }
    ];

    const playlist = await Playlist.aggregatePaginate(pipeline, options);

    if (!playlist) {
        throw new apiError(404, "No playlist found for this user");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                playlist,
                "Playlist fetched successfully"
            )
        );
});

const getUserAllPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists
    const {
        page = 1,
        limit = 10,
        sortBy = null,
        sortType = null,
        userId
    } = req.params;

    if (!isValidObjectId(userId)) {
        throw new apiError(400, "Invalid user ID");
    }

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { [sortBy]: sortType === "desc" ? -1 : 1 }
    }

    const pipeline = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
                name: { $ne: "Watch Later" }
            },
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $limit: 1
                    },
                    {
                        $project: {
                            thumbnail: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: "$video",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $sort: {
                sortOrder: 1, // Sort by sortOrder (Watch Later first)
                createdAt: -1 // For other playlists, sort by creation date (optional)
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                owner: 1,
                createdAt: 1,
                updatedAt: 1,
                video: 1,
                totalVideos: 1,
                isUpdated: 1,
                isPublic: 1
            }
        }
    ];

    const playlist = await Playlist.aggregatePaginate(pipeline, options);

    if (!playlist) {
        throw new apiError(404, "No playlist found for this user");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                playlist,
                "Playlist fetched successfully"
            )
        );
})

const getPlaylistById = asyncHandler(async (req, res) => {
    //TODO: get playlist by id
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind: "$owner"
                    },
                    {
                        $project: {
                            thumbnail: 1,
                            owner: 1,
                            title: 1,
                            createdAt: 1,
                            duration: 1,
                            views: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                videos: { $reverseArray: "$videos" } // Reverse the video array
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        }
    ]);

    if (!playlist) {
        throw new apiError(500, "Failed to get the playlist");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                playlist[0],
                "Playlist fetched successfully"
            )
        );
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID");
    }

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId,
            },
            $set: {
                isUpdated: true
            }
        },
        {
            new: true
        }
    );

    if (!playlist) {
        throw new apiError(500, "Failed to add video to playlist");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                playlist,
                `Video added in ${playlist?.name} playlist`
            )
        );
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID");
    }

    const removedVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                isUpdated: true
            },
            $pull: {
                videos: videoId,
            }
        },
        {
            new: true
        }
    );

    if (!removedVideo) {
        throw new apiError(500, "Failed to remove video from playlist");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                removedVideo,
                `Video removed from ${removedVideo?.name} playlist`
            )
        );
})

const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if (!deletedPlaylist) {
        throw new apiError(500, "Failed to delete the playlist or playlist not found");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                deletedPlaylist,
                "Playlist deleted successfully"
            )
        );
})

const updatePlaylist = asyncHandler(async (req, res) => {
    //TODO: update playlist
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID");
    }

    if (!(name && description)) {
        throw new apiError(400, "Name and description required");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            name: name,
            description: description,
            isUpdated: true
        },
        {
            new: true
        }
    );

    if (!playlist) {
        throw new apiError(500, "Failed to update playlist");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                playlist,
                "Playlist updated successfully"
            )
        );
})

const addToWatchLater = asyncHandler(async (req, res) => {
    // TODO: add video to watch later
    const userId = req.user._id;
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    if (!userId) {
        throw new apiError(401, "Unauthorized request");
    }

    const playlist = await Playlist.findOne(
        {
            owner: new mongoose.Types.ObjectId(userId),
            name: "Watch Later"
        }
    )

    let updatedPlaylist;
    let flag;
    if (playlist) {
        let update;

        if (playlist.videos.includes(videoId)) {
            update = { $pull: { videos: videoId } };
            flag = false;
        } else {
            update = { $addToSet: { videos: videoId } };
            flag = true;
        }

        updatedPlaylist = await Playlist.findOneAndUpdate(
            {
                name: "Watch Later",
                owner: new mongoose.Types.ObjectId(userId),
            },
            update,
            {
                new: true
            }
        );
    }

    if (!updatedPlaylist) {
        throw new apiError(500, "Failed to add video to watch later");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                updatedPlaylist,
                flag ? "Added to watch later" : "Removed from watch later"
            )
        );
})

const checkVideoInPlaylist = asyncHandler(async (req, res) => {
    // TODO: check if video is in playlist
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID");
    }

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new apiError(404, "Playlist not found");
    }

    const isVideoInPlaylist = playlist.videos.includes(videoId);

    if (isVideoInPlaylist) {
        return res
            .status(200)
            .json(
                new apiResponse(
                    200,
                    isVideoInPlaylist,
                    "Video is in playlist"
                )
            )
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                isVideoInPlaylist,
                "Video is not in playlist"
            )
        )
})

const togglePlaylistVisibility = asyncHandler(async (req, res) => {
    // TODO: toggle playlist visibility

    const { playlistId } = req.params;
    const user = req.user;

    if (!isValidObjectId(user._id)) {
        throw new apiError(401, "Unauthorized request");
    }

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: user._id
        },
        [
            {
                $set: {
                    isPublic: { $eq: [false, "$isPublic"] }, // Toggle `isPublic`: true becomes false, false becomes true
                },
            },
        ],
        {
            new: true,
            upsert: true
        }
    );

    if (!playlist) {
        throw new apiError(404, "Playlist not found");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                playlist,
                "Playlist visibility updated successfully"
            )
        );
});

const clearPlaylist = asyncHandler(async (req, res) => {

    // check if playlist with data exists
    // clear video likes documents for liked videos
    // clear videos from playlist

    const { playlistId } = req.params;
    const userId = req.user;

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID");
    }

    if (!isValidObjectId(userId)) {
        throw new apiError(401, "Unauthorized request");
    }

    const prevPlaylist = await Playlist.findById(playlistId);

    if (prevPlaylist) {
        await Like.deleteMany(
            {
                likedBy: new mongoose.Types.ObjectId(userId), // match likedBy field
                video: { $exists: true } // ensure videos field exists
            }
        );

        await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $set: { videos: [] }
            }
        )
    }


    if (!prevPlaylist) {
        throw new apiError(404, "Playlist not found");
    }

    res.status(200)
        .json(
            new apiResponse(200, {}, "Playlist cleared successfully")
        );

})

export {
    createPlaylist,
    getUserCreatedPlaylists,
    getUserAllPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    addToWatchLater,
    checkVideoInPlaylist,
    togglePlaylistVisibility,
    clearPlaylist
}
