import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Playlist } from "../models/playlist.model.js"

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

    const likeExists = await Like.findOne(
        {
            likedBy: new mongoose.Types.ObjectId(userId),
            video: new mongoose.Types.ObjectId(videoId)
        }
    )

    let flag;
    let data;

    if (likeExists) {

        data = await Like.deleteOne(
            {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: new mongoose.Types.ObjectId(videoId)
            }
        );

        await Playlist.updateOne(
            {
                owner: new mongoose.Types.ObjectId(userId),
                name: "Liked videos"
            },
            {
                $pull: {
                    videos: videoId
                }
            }
        );

        flag = false;

    } else {

        data = await Like.create({
            likedBy: userId,
            video: videoId
        });

        await Playlist.updateOne(
            {
                owner: new mongoose.Types.ObjectId(userId),
                name: "Liked videos"
            },
            {
                $addToSet: {
                    videos: videoId
                }
            }
        );

        flag = true;

    }


    if (!data) {
        throw new apiError(400, "Error while submitting like");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                {},
                flag ? "Video liked" : "Video disliked"
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