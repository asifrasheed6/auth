const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const crypto = require("crypto");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Telnyx API credentials
const PROFILE_AUTH =
  "AUTH_KEY";
const PROFILE_ID = "PROFILE_ID";
const API_URL = `https://api.telnyx.com/v2/messaging_profiles/${PROFILE_ID}/phone_numbers`;

let availableNumbers = [];
let SHARED_SECRET = "";
const socketMap = new Map();

/**
 * Selects a random phone number from the available list.
 * @return {string}
 */
function getRandomNumber() {
  const index = Math.floor(Math.random() * availableNumbers.length);
  return availableNumbers[index];
}

/**
 * Generates a shared secret for HMAC signing.
 * @param {number} length
 * @return {string}
 */
function generateSharedSecret(length = 32) {
  return crypto.randomBytes(length).toString("base64url");
}

/**
 * Signs a message using HMAC SHA-256.
 * @param {string} from
 * @param {string} secret
 * @param {string=} to
 * @return {{signature: string, number: string}}
 */
function signMessage(from, secret, to = "") {
  if (!to) {
    to = getRandomNumber();
  }

  const message = `${from}:${to}`;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(message);
  const signature = hmac.digest("base64url").substring(0, 30);

  return { signature, number: to };
}

/**
 * Fetches phone numbers associated with the profile.
 */
async function fetchPhoneNumbers() {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${PROFILE_AUTH}`,
      },
    });

    availableNumbers = response.data.data.map((d) => d.phone_number);
  } catch (error) {
    console.error(
      "Error fetching numbers:",
      error.response?.data || error.message,
    );
  }
}

// Middleware to parse incoming JSON
app.use(bodyParser.json());

/**
 * Health check endpoint.
 */
app.get("/", (req, res) => {
  res.send("Server is running");
});

/**
 * Webhook to handle incoming SMS messages.
 */
app.post("/webhook/incoming", (req, res) => {
  const message = req.body.data.payload;

  const senderId = message.from.phone_number;
  const receiverNumber = message.to[0].phone_number;
  const incomingText = message.text;

  const { signature } = signMessage(senderId, SHARED_SECRET, receiverNumber);
  const isVerified = signature === incomingText;

  let socketId = null;
  for (const [id, number] of socketMap.entries()) {
    if (number === receiverNumber) {
      socketId = id;
      break;
    }
  }

  if (socketId) {
    io.to(socketId).emit("verification_result", {
      verification_result: isVerified,
    });
    socketMap.delete(socketId);
  }

  res.status(200).send("Webhook received");
});

/**
 * Socket.IO connection handler.
 */
io.on("connection", (socket) => {
  socket.on("register", (data) => {
    const { signature, number } = signMessage(data, SHARED_SECRET);
    socketMap.set(socket.id, number);

    socket.emit("registered", { signature, number });
  });

  socket.on("disconnect", () => {
    socketMap.delete(socket.id);
  });
});

/**
 * Start the server.
 */
server.listen(PORT, async () => {
  await fetchPhoneNumbers();
  SHARED_SECRET = generateSharedSecret();

  console.log(`Server listening on port ${PORT}`);
});
