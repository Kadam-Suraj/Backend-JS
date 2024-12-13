import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken";

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

        console.log(accessToken)

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
    if (res.files && Array.isArray(res.files.coverImage) && res.files.coverImage.length() > 0) {
        coverImageLocalPath = res.files.coverImage[0].path
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new apiError(400, "Avatar is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
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

    const { username, email, password } = req.body

    if (!(username || email)) {
        throw new apiError(400, "username or email is required");
    }

    // find the user in DB
    const user = await User.findOne(
        {
            $or: [{ username }, { email }]
        }
    ).select("-avatar -coverImage -fullName -watchHistory -createdAt -updatedAt")

    // check if user is available
    if (!user) {
        throw new apiError(400, "user with this username or email not exist");
    }

    // check the password
    const isPasswordValid = await user.isPasswordCorrect(password.toString());
    if (!isPasswordValid) {
        throw new apiError(400, "incorrect password");
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
        $set: {
            refreshToken: undefined
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

})

export { registerUser, loginUser, logoutUser, refreshAccessToken };