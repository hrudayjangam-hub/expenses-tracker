const app = require('../backend/server');
const connectDB = require('../backend/config/db');

let dbReady = global.__mongoPromise;
if (!dbReady) {
  dbReady = global.__mongoPromise = connectDB().catch((err) => {
    global.__mongoPromise = null;
    throw err;
  });
}

module.exports = async (req, res) => {
  await dbReady;
  return app(req, res);
};
