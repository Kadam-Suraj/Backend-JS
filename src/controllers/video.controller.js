import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.mode.js";
import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


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
            owner: req.user?._id
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
    const { videoId } = req.paramsm;

    if (!videoId) {
        throw new apiError(401, "Invalid Video ID");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "likes",
                foreignField: "_id",
                as: "likes"
            }
        }
    ]);

    if (!video.length > 0) {
        throw new apiError(400, "video not found");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200, video, "video fetch success"
            ));
})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail

    const { videoId } = req.params;
    const { title, description } = req.body;

    const thumbnailLocalPath = req.file?.path;
    let thumbnailUrl;

    if (thumbnailLocalPath) {
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
                thumbnail: thumbnailUrl?.url
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

    const video = await Video.findByIdAndDelete(videoId);

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
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
