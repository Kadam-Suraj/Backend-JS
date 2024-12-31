import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = Schema(
    {
        videoFile: {
            type: String,
            required: true
        },
        videoFileId: {
            type: String
        },
        thumbnail: {
            type: String,
        },
        thumbnailId: {
            type: String
        },
        title: {
            type: String,
            required: true,
            min: [2, "Title must have at least 2 characters"]
        },
        description: {
            type: String,
            min: [8, "Description must have at least 8 characters"]
        },
        duration: {
            type: Number, // from cloudinary
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: false
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    }, { timestamps: true });

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);