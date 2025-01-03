import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.mode.js";
import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const getPublicAllVideos = asyncHandler(async (req, res) => {
    //TODO: get all videos based on query, sort, pagination
    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "createdAt",
        sortType = "desc",
    } = req.query

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { [sortBy]: sortType === "desc" ? -1 : 1 }
    }

    const pipeline = [
        {
            $match: {
                isPublished: true,
                title: { $regex: query, $options: "i" }
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
        }, {
            $lookup: {
                from: "likes",
                localField: "likes",
                foreignField: "_id",
                as: "likes",
            }
        },
        {
            $unwind: "$owner" // NOTE: extracts owner array into object (flattens owner array),
        },
        {
            $project: {
                title: 1,
                description: 1,
                duration: 1,
                createdAt: 1,
                thumbnail: 1,
                _id: 1,
                likes: 1,
                views: 1,
                videoFile: 1,
                "owner.fullName": 1,
                "owner.avatar": 1
            }
        }
    ]

    const videos = await Video.aggregatePaginate(pipeline, options);

    if (!videos) {
        return res
            .status(200)
            .json(
                new apiResponse(
                    404, {}, "Failed to get videos"
                )
            );
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
});

const getPanelVideos = asyncHandler(async (req, res) => {
    //TODO: get all videos based on query, sort, pagination
    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "createdAt",
        sortType = "desc",
    } = req.query;

    const { videoId } = req.params;

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { [sortBy]: sortType === "desc" ? -1 : 1 }
    }

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    const pipeline = [
        {
            $match: {
                _id: { $ne: new mongoose.Types.ObjectId(videoId) },
                isPublished: true,
                title: { $regex: query, $options: "i" }
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
        }, {
            $lookup: {
                from: "likes",
                localField: "likes",
                foreignField: "_id",
                as: "likes",
            }
        },
        {
            $unwind: "$owner" // NOTE: extracts owner array into object (flattens owner array),
        },
        {
            $project: {
                title: 1,
                description: 1,
                duration: 1,
                createdAt: 1,
                thumbnail: 1,
                _id: 1,
                likes: 1,
                views: 1,
                videoFile: 1,
                "owner.fullName": 1,
                "owner.avatar": 1
            }
        }
    ]

    const videos = await Video.aggregatePaginate(pipeline, options);

    if (!videos) {
        return res
            .status(200)
            .json(
                new apiResponse(
                    404, {}, "Failed to get videos"
                )
            );
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
});

const getAllVideos = asyncHandler(async (req, res) => {
    //TODO: get all videos based on query, sort, pagination
    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "createdAt",
        sortType = "desc",
        userId
    } = req.query

    if (!isValidObjectId(userId)) {
        throw new apiError(404, "Invalid Channel ID");
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
                isPublished: true,
                title: { $regex: query, $options: "i" }
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
        }, {
            $lookup: {
                from: "likes",
                localField: "likes",
                foreignField: "_id",
                as: "likes",
            }
        },
        {
            $unwind: "$owner" // NOTE: extracts owner array into object (flattens owner array),
        },
        {
            $project: {
                title: 1,
                description: 1,
                duration: 1,
                createdAt: 1,
                thumbnail: 1,
                _id: 1,
                likes: 1,
                views: 1,
                videoFile: 1,
                "owner.fullName": 1,
                "owner.avatar": 1
            }
        }
    ]

    const videos = await Video.aggregatePaginate(pipeline, options);

    if (!videos) {
        throw new apiError(404, "Failed to get videos");
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

});

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video
    const { title, description } = req.body

    if (!(title && description)) {
        throw new apiError(401, "Title and Description required");
    }

    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!(videoFileLocalPath && thumbnailLocalPath)) {
        throw new apiError(401, "All files required");
    }

    // Upload on cloudinary
    const videoUrl = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnailUrl = await uploadOnCloudinary(thumbnailLocalPath);

    if (!(videoUrl && thumbnailUrl)) {
        throw new apiError(400, "File upload failed");
    }

    // Create Mongo Document

    const user = await Video.create(
        {
            title: title || videoUrl?.original_filename,
            description: description,
            videoFile: videoUrl?.secure_url,
            thumbnail: thumbnailUrl?.url,
            duration: videoUrl?.duration,
            owner: req.user?._id,
            videoFileId: videoUrl?.public_id,
            thumbnailId: thumbnailUrl?.public_id
        }
    );

    res
        .status(200)
        .json(new apiResponse(
            200, user, "Upload success"
        ))
})

const getVideoById = asyncHandler(async (req, res) => {
    //TODO: get video by id
    const { videoId } = req.params;

    if (!videoId) {
        throw new apiError(401, "Invalid Video ID");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "likes",
                foreignField: "_id",
                as: "likes",
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscriptions",
                        },
                    },
                    {
                        $addFields: {
                            totalSubscribers: { $size: "$subscriptions" },
                        },
                    },
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "isSubscribed",
                        },
                    },
                    {
                        $addFields: {
                            isSubscribed: {
                                $cond: [
                                    { $in: [new mongoose.Types.ObjectId(req.user?._id), "$isSubscribed.subscriber"] },
                                    true,
                                    false,
                                ],
                            },
                        },
                    },
                    {
                        $project: {
                            fullName: 1,
                            avatar: 1,
                            totalSubscribers: 1,
                            _id: 1,
                            username: 1,
                            isSubscribed: 1
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $addFields: {
                totalLikes: { $size: "$likes" },
                isLiked: {
                    $cond: [
                        { $in: [new mongoose.Types.ObjectId(req.user?._id), "$likes.likedBy"] },
                        true,
                        false,
                    ],
                },
            },
        },
        {
            $unwind: "$owner",
        },
    ]);


    if (!video.length > 0) {
        throw new apiError(400, "video not found");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200, video[0], "video fetch success"
            ));
})

const updateViews = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    const views = await Video.updateOne(
        { _id: new mongoose.Types.ObjectId(videoId) },
        { $inc: { views: 1 } }
    )

    if (!views) {
        throw new apiError(400, "Views update failed");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                views,
                "Views updated successfully"
            )
        )
});

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail

    const { videoId } = req.params;
    const { title, description } = req.body;

    const thumbnailLocalPath = req.file?.path;
    let thumbnailUrl;

    const oldVIdeoThumbnailId = await Video.findOne({ _id: videoId }, { thumbnail: 1, thumbnailId: 1 });

    if (!oldVIdeoThumbnailId?.thumbnailId) {
        throw new apiError(400, "Old thumbnail not found on cloudinary");
    }

    const deletedThumbnail = await deleteOnCloudinary(oldVIdeoThumbnailId?.thumbnailId, "image");

    if (thumbnailLocalPath && deletedThumbnail) {
        thumbnailUrl = await uploadOnCloudinary(thumbnailLocalPath);
    }

    if (!(title || description)) {
        throw new apiError(401, "Must provide field to update");
    }

    if (!videoId) {
        throw new apiError(401, "Invalid video ID");
    }

    const video = await Video.findOneAndUpdate(
        { _id: videoId },
        {
            $set: {
                title: title,
                description: description,
                thumbnail: thumbnailUrl?.url,
                thumbnailId: thumbnailUrl?.public_id
            }
        },
        {
            new: true
        }
    );

    if (!video) {
        throw new apiError(400,
            "Video data update failed"
        )
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                video,
                "video data updated successfully"
            )
        );
})

const deleteVideo = asyncHandler(async (req, res) => {
    //TODO: delete video
    const { videoId } = req.params

    if (!videoId) {
        throw new apiError(400, "Video not found");
    }

    const videoToDelete = await Video.findById(videoId);

    // delete video from cloudinary
    let deletedVideo;
    let deletedThumbnail;
    if (videoToDelete?.thumbnailId && videoToDelete?.videoFileId) {
        deletedVideo = await deleteOnCloudinary(videoToDelete?.videoFileId, "video");

        if (!deletedVideo) {
            throw new apiError(400, "Failed to delete video file from servers");
        }
        deletedThumbnail = await deleteOnCloudinary(videoToDelete?.thumbnailId, "image");

        if (!deletedThumbnail) {
            throw new apiError(400, "Failed to delete video thumbnail from servers");
        }
    }

    if (!(deletedVideo && deletedThumbnail)) {
        throw new apiError(400, "Failed to delete video and thumbnail from servers");
    }

    // delete video from database
    const video = await Video.findByIdAndDelete(videoId);

    if (!video) {
        throw new apiError(400, "Failed to delete video thumbnail");
    }

    if (!video) {
        throw new apiError(400, "No video found to delete");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                video,
                "Video deleted successfully"
            )
        )

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId) {
        throw new apiError(400, "Invalid Video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new apiError(404, "Video not found")
    }

    video.isPublished = !video.isPublished;

    await video.save();

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                video,
                "Video published success"
            )
        );
});

export {
    getAllVideos,
    getPublicAllVideos,
    getPanelVideos,
    publishAVideo,
    getVideoById,
    updateViews,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
