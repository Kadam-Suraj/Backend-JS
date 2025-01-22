import mongoose, { isValidObjectId } from "mongoose";
import { WatchHistory } from "../models/watchHistory.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";

const addVideoToWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const user = req.user;

    if (!isValidObjectId(videoId)) {
        throw new apiError(403, "Invalid video ID");
    }

    if (!isValidObjectId(user)) {
        throw new apiError(401, "Unauthorized request");
    }

    // Step 1: remove the video if it already exists in the array
    const temp = await WatchHistory.findOneAndUpdate(
        { owner: new mongoose.Types.ObjectId(user._id) },
        { $pull: { videos: videoId } } // Remove videoId from the array
    );

    // Step 2: Add the videoId to the top of the array
    const history = await WatchHistory.findOneAndUpdate(
        { owner: new mongoose.Types.ObjectId(user._id) },
        {
            $push: {
                videos: {
                    $each: [videoId], // Add videoId at the top
                    $position: 0      // Ensure it is added to the top of the array
                }
            }
        }
    );

    if (!history) {
        throw new apiError(400, "Failed to add video into watch history");
    }

    res.status(200).json(
        new apiResponse(201, history, "Video added into watch history")
    );
});

const removeVideoFromWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const user = req.user;

    if (!isValidObjectId(videoId)) {
        throw new apiError(404, "Invalid video id or video id not found");
    }

    if (!isValidObjectId(user)) {
        throw new apiError(401, "Unauthorized request");
    }

    const removedVideo = await WatchHistory.findOneAndUpdate(
        { owner: user._id },
        {
            $pull: { videos: videoId }
        }
    );

    if (!removedVideo) {
        throw new apiError(400, "Failed to remove video from watch history");
    }

    res.status(200).
        json(
            new apiResponse(200, removedVideo, "Video removed from watch history successfully")
        )
});

const getVideosFromWatchHistory = asyncHandler(async (req, res) => {

    const user = req.user;

    if (!isValidObjectId(user)) {
        throw new apiError(401, "Unauthorized request");
    }

    const videosFromHistory = await WatchHistory.aggregate(
        [
            {
                $match: {
                    name: "Watch History",
                    owner: new mongoose.Types.ObjectId(user._id)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videosLookup",
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
                        }
                    ]
                }
            },
            {
                $addFields: {
                    videos: {
                        $map: {
                            input: "$videos", // Original video IDs from WatchHistory
                            as: "videoId",
                            in: {
                                $arrayElemAt: [
                                    "$videosLookup", // Lookup results
                                    { $indexOfArray: ["$videosLookup._id", "$$videoId"] }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    videosLookup: 0 // Remove the temporary field
                }
            }
        ]
    );

    if (!videosFromHistory) {
        throw new apiError(400, "Failed to get video from watch history");
    }

    res.status(200).json(
        new apiResponse(200, videosFromHistory[0], "Video fetched successfully")
    )
})

export {
    addVideoToWatchHistory,
    removeVideoFromWatchHistory,
    getVideosFromWatchHistory
}