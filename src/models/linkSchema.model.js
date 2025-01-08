import mongoose, { Schema } from "mongoose";

const linkSchema = new Schema(
    {
        url: {
            type: String,
            unique: true
        },
        title: String,
        description: String,
        image: String,
        fetchedAt: {
            type: Date,
            default: Date.now
        },
    },
    {
        timestamps: true
    }
);

export const Link = mongoose.model('Link', linkSchema);