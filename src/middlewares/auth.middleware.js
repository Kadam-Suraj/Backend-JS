import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "").trim();

        if (!token) {
            throw new apiError(401, "Invalid token");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const authorizedUser = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!authorizedUser) {
            // NOTE:
            throw new apiError(401, "Invalid Access Token");
        }

        req.user = authorizedUser;
        next();

    } catch (error) {
        throw new apiError(401, error?.message || "Invalid Token");
    }
})