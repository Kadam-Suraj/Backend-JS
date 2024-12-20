import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortType = "desc"
    } = req.query


    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    const options = {
        page,
        limit,
        sort: { [sortBy]: sortType === "desc" ? -1 : 1 }
    }

    const pipeline = [
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
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
            $project: {
                content: 1,
                updatedAt: 1,
                createdAt: 1,
                owner: 1,
                isEdited: 1
            }
        }
    ];

    const comments = await Comment.aggregatePaginate(pipeline, options);

    if (!comments) {
        throw new apiError(404, "No comments found");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                comments,
                "Comments fetched successfully"
            )
        );
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    // !: Check from where we're going to pass videoID
    const { videoId } = req.params;
    const { content } = req.body;

    if (!req.user?._id) {
        throw new apiError(400, "Unauthorized request");
    }

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    if (!content) {
        throw new apiError(400, "Comment content required");
    }

    const comment = await Comment.create({
        video: videoId,
        content: content,
        owner: req.user?._id
    })

    if (!comment) {
        throw new apiError(500, "Error while submitting comment");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                comment,
                "Comment added successfully"
            )
        );
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    const { content } = req.body;

    if (!req.user?._id) {
        throw new apiError(400, "Unauthorized request");
    }

    if (!isValidObjectId(commentId)) {
        throw new apiError(400, "Invalid comment ID");
    }

    if (!content) {
        throw new apiError(400, "Comment content required");
    }

    const comment = await Comment.findByIdAndUpdate(commentId,
        {
            content: content,
            isEdited: true
        },
        {
            new: true
        }
    );

    if (!comment) {
        throw new apiError(500, "Update comment failed");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                comment,
                "Comment updated successfully"
            )
        );
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;
    const userId = req.user?._id;

    if (!isValidObjectId(commentId)) {
        throw new apiError(400, "Invalid comment ID");
    }

    if (!userId) {
        throw new apiError(400, "Unauthorized request");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new apiError(400, "No comment found regarding this comment ID")
    }

    let deletedComment;

    // check if comment owner and loggedIn user is same
    if (comment.owner.equals(userId)) {
        deletedComment = await Comment.findByIdAndDelete(commentId);
    } else {
        throw new apiError(400, "You are not the owner of this comment");
    }

    if (!deletedComment) {
        throw new apiError(500, "Delete comment failed");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                deletedComment,
                "Comment deleted successfully"
            )
        );
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
