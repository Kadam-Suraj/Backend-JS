import mongoose, { Schema } from "mongoose";

const watchHistorySchema = new Schema(
    {
        name: {
            type: String
        },
        videos: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

mongoose.connection.once("open", async () => {
    const users = await mongoose.model("User").find();
    if (!users) return;
    for (const user of users) {
        const watchHistory = await mongoose.model("WatchHistory").findOne({ name: "Watch History", owner: user._id });
        if (!watchHistory) {
            await mongoose.model("WatchHistory").create({
                name: "Watch History",
                videos: [],
                owner: user._id
            });
        }
    }
});

export const WatchHistory = mongoose.model("WatchHistory", watchHistorySchema);