import mongoose from "mongoose";

mongoose.set("toJSON", {
    versionKey: false,
    transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
    }
});

mongoose.set("toObject", {
    versionKey: false,
    transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
    }
});

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export { connectDB };
export default mongoose;
