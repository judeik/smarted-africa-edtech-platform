// @ts-nocheck
// backend/server.js

import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./src/config/db.js";
import app from "./src/app.js";

dotenv.config();

const PORT = parseInt(process.env.PORT, 10) || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
    });

    // Graceful shutdown: drain in-flight requests before closing DB.
    // Railway (and k8s) send SIGTERM then SIGKILL after ~10s.
    const shutdown = async (signal) => {
      console.log(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        try {
          await mongoose.connection.close();
          console.log("MongoDB connection closed");
          process.exit(0);
        } catch (err) {
          console.error("Error during shutdown:", err.message);
          process.exit(1);
        }
      });
      // Force-exit if drain takes too long.
      // Render gives 30s; Railway gives ~10s. 25s is safe for both.
      setTimeout(() => {
        console.error("Graceful shutdown timeout — forcing exit");
        process.exit(1);
      }, 25000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
