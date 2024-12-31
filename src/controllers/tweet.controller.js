import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet

    const userId = req.user?._id;
    const { content } = req.body;

    if (!isValidObjectId(userId)) {
        throw new apiError(400, "Unauthorized request");
    }

    if (!content) {
        throw new apiError(400, "Content is required to post a tweet");
    }

    const tweet = await Tweet.create(
        {
            content: content,
            owner: userId
        }
    );

    if (!tweet) {
        throw new apiError(500, "Failed to post a tweet");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                tweet,
                "Tweet posted successfully"
            )
        );
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new apiError(400, "Unauthorized request");
    }

    const tweet = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
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
                            avatar: 1,
                            username: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes"
            }
        },
        {
            $addFields: {
                isLiked: {
                    $cond: [
                        { $in: [new mongoose.Types.ObjectId(userId), "$likes.likedBy"] },
                        true,
                        false,
                    ],
                }
            }
        },
        {
            $addFields: {
                totalLikes: { $size: "$likes" }
            }
        },

        // {
        //     $unwind: "$likes"
        // },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                _id: 1,
                content: 1,
                isLiked: 1,
                totalLikes: 1,
                createdAt: 1,
                owner: {
                    _id: 1,
                    fullName: 1,
                    avatar: 1,
                    username: 1
                }
            }
        }
    ]);

    if (!tweet) {
        throw new apiError(500, "Failed to get tweets");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                tweet,
                "Tweets fetched successfully"
            )
        );
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet

    const userId = req.user?._id;
    const tweetId = req.params.tweetId;
    const { content } = req.body;

    if (!isValidObjectId(userId)) {
        throw new apiError(401, "Unauthorized request");
    }

    if (!isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweet ID");
    }

    if (!content) {
        throw new apiError(400, "Content is required to update the tweet");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new apiError(404, "No tweet found for the corresponding ID");
    }

    if (!tweet.owner.equals(userId)) {
        throw new apiError(403, "You are not authorized to update this tweet");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            content: content,
            isEdited: true
        },
        {
            new: true
        }
    );


    if (!updatedTweet) {
        throw new apiError(500, "Tweet not found or could not be updated");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                updatedTweet,
                "Tweet updated successfully"
            )
        );
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const userId = req.user?._id;
    const tweetId = req.params.tweetId;

    if (!isValidObjectId(userId)) {
        throw new apiError(401, "Unauthorized request");
    }

    if (!isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new apiError(404, "No tweet found for the corresponding ID");
    }

    if (!tweet.owner.equals(userId)) {
        throw new apiError(403, "You are not authorized to delete this tweet");
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    if (!deletedTweet) {
        throw new apiError(500, "Failed to delete the tweet");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                deletedTweet,
                "Tweet deleted successfully"
            )
        );
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
