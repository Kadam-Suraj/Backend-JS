import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
    try {
        const response = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        if (response) {
            console.log("Connection to MongoDB Success");
            console.log(`Connected on HOST: ${response.connection.host}`);
        }

    } catch (error) {
        console.error("Connection FAILED!!!", error);
    };
}

export default connectDB;