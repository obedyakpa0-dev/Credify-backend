const mongoose = require("mongoose");
const environment = require("./environment");

const connectDb = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
    
    try {
        await mongoose.connect(environment.mongoUri);
        console.log('DB connected...')
    } catch (error) {
        console.log('Connection failed!',error.message);
        process.exit(1);
    }
};

module.exports = {
  connectDb,
};
