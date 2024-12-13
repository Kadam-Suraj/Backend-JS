import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload
const uploadOnCloudinary = async (localFilePath) => {

    try {
        // check if file is on server /temp
        if (!localFilePath) return null

        // if file is available perform upload
        const uploadResult = await cloudinary.uploader
            .upload(localFilePath,
                {
                    resource_type: "auto"
                }
            )

        // check upload log
        // console.log("File is uploaded successfully", uploadResult.url);
        fs.unlinkSync(localFilePath);
        return uploadResult;
    } catch (error) {
        // remove file from server if upload failed
        fs.unlinkSync(localFilePath);
        return null
    }
}

export { uploadOnCloudinary }