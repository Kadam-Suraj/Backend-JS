import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.mode.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user?._id;

    if (!isValidObjectId(userId)) {
        throw new apiError(401, "Unauthorized request");
    }

    const views = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$views" }
            }
        }
    ]);

    const totalViews = views.length > 0 ? views[0]?.totalViews : 0;

    const likes = await Like.countDocuments({
        likedBy: userId,
        video: { $exists: true }
    });

    const totalVideos = await Video.countDocuments({
        owner: userId
    });

    const totalSubscribers = await Subscription.countDocuments({
        channel: userId
    });

    const data = [
        {
            views: totalViews,
        },
        {
            likes: likes,
        },
        {
            videos: totalVideos,
        },
        {
            subscribers: totalSubscribers
        }]

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                data,
                "Stats fetched successfully"
            )
        );
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const channelId = req.user?._id;

    if (!isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid channel ID");
    }

    const videos = await Video.find(
        { owner: channelId }
    );

    if (!videos[0]) {
        throw new apiError(500, "Failed to get videos or no videos found");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                videos,
                "Videos fetched successfully"
            )
        );
})

export {
    getChannelStats,
    getChannelVideos
}