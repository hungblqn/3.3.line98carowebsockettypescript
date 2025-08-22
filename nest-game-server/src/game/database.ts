import mongoose from "mongoose";

export async function connectDB() {
    try {
        await mongoose.connect("mongodb://localhost:27017/nest-game");
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
    }
}
