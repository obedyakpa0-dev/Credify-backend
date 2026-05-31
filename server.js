const app = require("./src/app");
const environment = require("./config/environment");
const { connectDb } = require("./config/db");

const startServer = async () => {
  try {
    await connectDb();

    app.listen(environment.port, () => {
      console.log(`Server listening on port ${environment.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
