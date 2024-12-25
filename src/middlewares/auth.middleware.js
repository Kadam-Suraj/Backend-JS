import { User } from "../models/user.model.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "").trim();

        if (!token) {
            return res.status(401).json(new apiResponse(
                401, {}, "Invalid token"
            ))
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const authorizedUser = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!authorizedUser) {
            // NOTE:
            return res.status(401).json(new apiResponse(
                401, {}, "Invalid Access Token"
            ))
            // throw new apiError(401, "Invalid Access Token");
        }
        req.user = authorizedUser;
        next();

    } catch (error) {
        return res.status(401).json(
            new apiResponse(
                401, {}, error?.message || "Invalid Token"
            ))
        // throw new apiError(401, error?.message || "Invalid Token");
    }
})