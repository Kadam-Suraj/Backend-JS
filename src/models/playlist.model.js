import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const playlistSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
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
        },
        isUpdated: {
            type: Boolean,
            default: false
        },
        isPublic: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// Create a default playlist
mongoose.connection.once("open", async () => {
    const user = await mongoose.model("User").findOne();
    if (!user) return;
    const watchLaterPlaylist = await mongoose.model("Playlist").findOne({ name: "Watch Later" });
    if (!watchLaterPlaylist) {
        await mongoose.model("Playlist").create({
            name: "Watch Later",
            description: "Videos that you want to watch later",
            videos: [],
            owner: user._id,
            isUpdated: false,
            isPublic: false
        });
    }
});

playlistSchema.plugin(mongooseAggregatePaginate);

export const Playlist = mongoose.model("Playlist", playlistSchema);