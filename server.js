const app = require("./src/app");
const environment = require("./config/environment");
const { connectDb } = require("./config/db");
const dns = require('node:dns')


dns.setDefaultResultOrder('ipv4first')

const startServer = async () => {
  try {
    await connectDb();

    const server = app.listen(environment.port, () => {
      console.log(`Server listening on port ${environment.port}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        const mongoose = require("mongoose");
        await mongoose.connection.close(false);
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
