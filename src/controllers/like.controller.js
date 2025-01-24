import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on video
    const { videoId } = req.params

    const userId = req.user?._id;

    if (!userId) {
        throw new apiError(400, "Authorization failed");
    }

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    const isLiked = await Like.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
                likedBy: userId
            }
        },
        {
            $addFields: {
                isLiked: { $eq: ["$likedBy", userId] }
            }
        }
    ]);

    let like;

    if (isLiked) {
        like = await Like.findByIdAndDelete(isLiked[0]?._id);
    }

    if (!isLiked[0]) {
        like = await Like.create(
            {
                video: videoId,
                likedBy: userId
            },
        )
    }

    if (!like) {
        throw new apiError(400, "Error while submitting like");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                like,
                !isLiked[0] ? "Like submitted successfully" : "Like removed successfully"
            )
        );
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on comment
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new apiError(400, "Invalid comment ID");
    }

    if (!req.user?._id) {
        throw new apiError(400, "Unauthorized request")
    }

    const existingLike = await Like.findOne(
        {
            comment: commentId,
            likedBy: req.user?._id
        }
    );

    let like;
    let message;

    if (existingLike) {
        like = await Like.findOneAndDelete({
            comment: commentId
        })

        message = "Comment like removed successfully"
    }

    if (!existingLike) {
        like = await Like.create(
            {
                comment: commentId,
                likedBy: req.user?._id
            }
        );

        message = "Comment like submitted successfully"
    }

    if (!like) {
        throw new apiError(400, "Error while submitting comment like");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                like,
                message
            ));
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on tweet
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweet ID");
    }

    if (!req.user?._id) {
        throw new apiError(400, "Unauthorized request");
    }

    const isLiked = await Like.aggregate([
        {
            $match: {
                tweet: new mongoose.Types.ObjectId(tweetId)
            }
        }
    ]);

    let like;
    if (isLiked) {
        like = await Like.findByIdAndDelete(tweetId);
    }

    if (!isLiked[0]) {
        like = await Like.create(
            {
                tweet: tweetId,
                likedBy: req.user?._id
            }
        );
    }

    if (!like) {
        throw new apiError(400, "Error while submitting tweet like");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                like,
                !isLiked[0] ? "Tweet liked successfully" : "Tweet like removed successfully"
            ));
}
)

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike
}