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
                video: new mongoose.Types.ObjectId(videoId)
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

    const isLiked = await Like.aggregate([
        {
            $match: {
                comment: new mongoose.Types.ObjectId(commentId)
            }
        }
    ]);

    let like;

    if (isLiked) {
        like = await Like.findByIdAndDelete(commentId);
    }
    if (!isLiked[0]) {
        like = await Like.create(
            {
                comment: commentId,
                likedBy: req.user?._id
            }
        );
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
                !isLiked[0] ? "Comment liked successfully" : "Comment liked removed successfully"
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

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    if (!req.user?._id) {
        throw new apiError(400, "Unauthorized request");
    }

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
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
                                        avatar: 1,
                                    }
                                },
                            ]
                        }
                    },
                    {
                        $unwind: "$owner"
                    },
                    {
                        $project: {
                            title: 1,
                            description: 1,
                            thumbnail: 1,
                            duration: 1,
                            owner: 1,
                            views: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$video"
        },
    ]);

    console.log(likedVideos)

    if (!likedVideos) {
        throw new apiError(400, "No liked videos found");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                likedVideos,
                "Liked videos fetched successfully"
            ));
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}