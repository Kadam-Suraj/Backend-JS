import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    // TODO: toggle subscription

    const { channelId } = req.params;
    const userId = req.user?._id;

    if (!isValidObjectId(userId)) {
        throw new apiError(401, "Unauthorized request");
    }

    if (!isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid channel ID");
    }

    const subscribe = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(userId),
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
    ]);

    if (!subscribe[0]) {
        const subscribed = await Subscription.create(
            {
                channel: channelId,
                subscriber: userId
            },
        );

        if (!subscribed) {
            throw new apiError(500, "Failed to subscribe");
        }

        return res
            .status(200)
            .json(
                new apiResponse(
                    200,
                    subscribed,
                    "Successfully subscribed to the channel"
                )
            );
    }

    const unSubscribed = await Subscription.findByIdAndDelete(subscribe[0]._id);

    if (!unSubscribed) {
        throw new apiError(500, "Failed to unsubscribe");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                unSubscribed,
                "Successfully unsubscribed to the channel"
            )
        );
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
        throw new apiError(401, "Unauthorized request");
    }

    if (!isValidObjectId(subscriberId)) {
        throw new apiError(400, "Invalid channel ID");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
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
            $unwind: "$subscriber"
        }
    ]);

    if (!subscribers[0]) {
        throw new apiError(404, "No subscribers found");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                subscribers,
                "Subscribers fetched successfully"
            )
        );
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user?._id;

    if (!isValidObjectId(userId)) {
        throw new apiError(401, "Unauthorized request");
    }

    if (!isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid channel ID");
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        }, {
            $unwind: "$channel"
        }
    ]);

    if (!subscribedChannels[0]) {
        throw new apiError(404, "No subscribed channels found");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                subscribedChannels,
                "Subscribed channels fetched successfully"
            )
        );
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}