import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const options = {
    httpOnly: true,
    secure: true
}

const generateAccessAndRefreshToken = async (user) => {
    try {
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new apiError(401, "Error while generating access and refresh token");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validate if not empty
    // check if user already registered: email / username
    // check for images: avatar
    // upload images to cloudinary
    // create user object - create entry in db
    // remove password and refreshToken from response
    // again check if user is registered
    // return res

    const { fullName, email, username, password } = req.body

    // check if field is not empty
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new apiError(400, "All fields are required")
    }

    // check if user already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new apiError(409, "User with email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // check if avatar is provided
    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar is required");
    }

    // check if cover image is provided
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length() > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new apiError(400, "Avatar is required");
    }

    const user = await User.create({
        fullName: fullName,
        avatar: avatar?.url,
        avatarId: avatar?.public_id,
        coverImage: coverImage?.url || "",
        coverImageId: coverImage?.public_id,
        email: email,
        password: password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new apiError(500, "Something went wrong while registering the user");
    }

    res.status(201).json(
        new apiResponse(200, createdUser, "User Registered Successfully")
    )

});

const loginUser = asyncHandler(async (req, res) => {
    // let login details from frontend: email/username/password
    // validate user is available in db
    // generate refresh token and access token
    // save refresh token in db and in user browser: cookie
    // login the user

    const { username, password } = req.body

    if (!(username)) {
        return res.status(400)
            .json(
                new apiResponse(400, {}, "username or email is required")
            )
    }

    // find the user in DB
    const user = await User.findOne(
        {
            $or: [{ username: username }, { email: username }]
        }
    ).select("-avatar -coverImage -fullName -watchHistory -createdAt -updatedAt")

    // check if user is available
    if (!user) {
        return res.status(400)
            .json(
                new apiResponse(400, {}, "user with this username does not exist")
            )
    }

    // check the password
    const isPasswordValid = await user.isPasswordCorrect(password.toString());
    if (!isPasswordValid) {
        return res.status(400)
            .json(
                new apiResponse(400, {}, "incorrect password")
            )
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(user);

    // return response and set cookie

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken -watchHistory -createdAt -updatedAt");

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
            new apiResponse(201, {
                user: loggedInUser, accessToken, refreshToken
            }, "User logged in Successfully")
        )

});

const logoutUser = asyncHandler(async (req, res) => {
    // remove refreshToken from DB
    // clear cookie

    await User.findByIdAndUpdate(
        req.user._id, {
        $unset: {
            refreshToken: 1 // this will removes the filed from the document
        }
    });

    return res
        .status(200)
        .clearCookie("refreshToken", options)
        .clearCookie("accessToken", options)
        .json(new apiResponse(200, {}, "User logged out"))

});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // get token from user browser
    // if found token decode it
    // find user from decoded token
    // generate new tokens
    // set new token

    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
        throw new apiError(401, "Invalid authorization");
    }

    try {
        const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken._id);

        if (!user) {
            throw new apiError(401, "Invalid refresh token")
        }

        if (token !== user.refreshToken) {
            throw new apiError(401, "Invalid or expired token")
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user);

        res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new apiResponse(200, { refreshToken, accessToken }, "Token refreshed")
            )
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh token")
    }

});

const changePassword = asyncHandler(async (req, res) => {
    // check oldPass is matching with db pass
    // save pass
    // res

    if (!req.user) {
        return res.status(401)
            .json(new apiResponse(
                401, {}, "Unauthorized request"
            ))
    }

    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.status(400)
            .json(new apiResponse(
                400, {}, "New password and confirm password not matching"
            ))
    }

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        return res.status(400)
            .json(new apiResponse(
                400, {}, "Incorrect old password"
            ))
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    res.status(200)
        .json(new apiResponse(
            200, {}, "Password updated Successfully"
        ))
});

const getCurrentUser = asyncHandler(async (req, res) => {
    res.status(200).
        json(new apiResponse(200, req.user, "User fetched successfully"))
});

const updateUserProfile = asyncHandler(async (req, res) => {
    const { fullName, email, description } = req.body;

    if (!(fullName || email || description)) {
        throw new apiError(401, "Provide at least one field");
    }

    const user = req.user;
    if (!user) {
        throw new apiError(401, "Unauthorized request");
    }

    // check if old and new values are not same throw error
    // if ((fullName && email) && (user.fullName === fullName && user.email === email)) {
    //     throw new apiError(401, "Provided credentials are same as old");
    // }

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (description) user.description = description;

    await user.save({ validateBeforeSave: false });

    res.status(200).json(
        new apiResponse(200, user, "Profile update success")
    )
});

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    const user = req.user

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar file missing");
    }

    const oldAvatarId = await User.findOne({ _id: user._id }, { avatarId: 1 });

    if (!oldAvatarId?.avatarId) {
        throw new apiError(400, "Old avatar not found on cloudinary");
    }

    const deletedAvatar = await deleteOnCloudinary(oldAvatarId?.avatarId, "image");

    if (!deletedAvatar) {
        throw new apiError(400, "Error while deleting old avatar");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new apiError(400, "Error while uploading avatar");
    }

    user.avatar = avatar.url;
    user.avatarId = avatar.public_id;
    await user.save({ validateBeforeSave: false });

    res
        .status(200)
        .json(new apiResponse(200, user, "Avatar updated successfully"));

});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    const user = req.user

    if (!coverImageLocalPath) {
        throw new apiError(400, "cover image file missing");
    }

    const oldCoverImageId = await User.findOne({ _id: user._id }, { coverImageId: 1 });

    if (!oldCoverImageId?.coverImageId) {
        throw new apiError(400, "Old cover image not found on cloudinary");
    }

    const deletedCoverImage = await deleteOnCloudinary(oldCoverImageId?.coverImageId, "image");

    if (!deletedCoverImage) {
        throw new apiError(400, "Error while deleting old cover image");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage) {
        throw new apiError(400, "Error while uploading cover image");
    }

    user.coverImage = coverImage.url;
    user.coverImageId = coverImage.public_id;
    await user.save({ validateBeforeSave: false });

    res
        .status(200)
        .json(new apiResponse(200, user, "cover image updated successfully"));

});

//INFO: MongoDB Aggregation Pipelines

const getUserProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
        throw new apiError(400, "User not found");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                foreignField: "channel",
                localField: "_id",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                foreignField: "subscriber",
                localField: "_id",
                as: "subscribedTo"
            }
        }, {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscriptionsCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        }, {
            $project: {
                username: 1,
                fullName: 1,
                subscribersCount: 1,
                subscriptionsCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                createdAt: 1
            }
        }
    ]);

    if (!channel?.length) {
        throw new apiError(404, "Channel Not Found")
    }

    res
        .status(200)
        .json(new apiResponse(200, channel[0], "Channel Fetch Success"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req?.user?._id)
            }
        }, {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
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
                                        username: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    res
        .status(200)
        .json(new apiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetch success"
        ))
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateUserProfile,
    updateAvatar,
    updateCoverImage,
    getUserProfile,
    getWatchHistory
};