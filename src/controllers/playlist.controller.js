import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    const { name, description } = req.body
    const userId = req.user?._id;

    if (!isValidObjectId(userId)) {
        throw new apiError(401, "Unauthorized request");
    }

    if (!(name && description)) {
        throw new apiError(400, "name and description is required to create playlist");
    }

    const playlist = await Playlist.create(
        {
            name: name,
            description: description,
            owner: userId
        }
    );

    if (!playlist) {
        throw new apiError(500, "Failed to create playlist");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                playlist,
                "Playlist created successfully"
            )
        );
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists
    const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortType = "asc",
        userId
    } = req.params;

    if (!isValidObjectId(userId)) {
        throw new apiError(400, "Invalid user ID");
    }

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { [sortBy]: sortType === "desc" ? -1 : 1 }
    }

    const pipeline = [
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
                name: 1,
                description: 1,
                owner: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]

    const playlist = await Playlist.aggregatePaginate(pipeline, options);

    if (!playlist) {
        throw new apiError(404, "No playlist found for this user");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                playlist,
                "Playlist fetched successfully"
            )
        );
})

const getPlaylistById = asyncHandler(async (req, res) => {
    //TODO: get playlist by id
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
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
            $unwind: "$owner"
        }
    ]);

    if (!playlist) {
        throw new apiError(500, "Failed to get the playlist");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                playlist,
                "Playlist fetched successfully"
            )
        );
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID");
    }

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId
            }
        },
        {
            new: true
        }
    );

    if (!playlist) {
        throw new apiError(500, "Failed to add video to playlist");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                playlist,
                "Video added to playlist successfully"
            )
        );
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID");
    }

    const removedVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId
            }
        },
        {
            new: true
        }
    );

    if (!removedVideo) {
        throw new apiError(500, "Failed to remove video from playlist");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                removedVideo,
                "Video removed successfully from playlist"
            )
        );
})

const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if (!deletedPlaylist) {
        throw new apiError(500, "Failed to delete the playlist or playlist not found");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                deletedPlaylist,
                "Playlist deleted successfully"
            )
        );
})

const updatePlaylist = asyncHandler(async (req, res) => {
    //TODO: update playlist
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist ID");
    }

    if (!(name && description)) {
        throw new apiError(400, "Name and description required");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            name: name,
            description: description
        },
        {
            new: true
        }
    );

    if (!playlist) {
        throw new apiError(500, "Failed to update playlist");
    }

    res
        .status(200)
        .json(
            new apiResponse(
                200,
                playlist,
                "Playlist updated successfully"
            )
        );
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
