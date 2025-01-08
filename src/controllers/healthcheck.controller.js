import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js"

const healthCheck = asyncHandler(async (req, res) => {
    //TODO: build a healthcheck response that simply returns the OK status as json with a message
    function formatUptime(seconds) {
        const timeUnits = [
            { unit: "d", value: Math.floor(seconds / (24 * 60 * 60)) },
            { unit: "h", value: Math.floor((seconds % (24 * 60 * 60)) / (60 * 60)) },
            { unit: "m", value: Math.floor((seconds % (60 * 60)) / 60) },
            { unit: "s", value: Math.floor(seconds % 60) },
        ];

        // Filter out units with a value of 0 and join them into a string
        return timeUnits
            .filter(({ value }) => value > 0)
            .map(({ value, unit }) => `${value}${unit}`)
            .join(" ");
    }

    res
        .status(200)
        .json(
            {
                status: "Healthy",
                uptime: formatUptime(process.uptime()),
                success: true,
                database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
                timestamp: new Date(),
            });
})

export { healthCheck }