const express = require("express");
const { RtcTokenBuilder, RtcRole } = require("agora-token");
const dotenv = require("dotenv");
const serverless = require("serverless-http");
const conf = require("./config.js");

dotenv.config();
const PORT = conf.PORT;
const APP_ID = conf.APP_ID;
const APP_CERTIFICATE = conf.APP_CERTIFICATE;

const app = express();
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    hello: "hi",
  });
});

const nocache = (_, resp, next) => {
  resp.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  resp.header("Expires", "-1");
  resp.header("Pragma", "no-cache");
  next();
};

const generateRTCToken = (req, resp) => {
  resp.header("Access-Control-Allow-Origin", "*");
  const channelName = req.params.channel;
  if (!channelName) {
    return resp.status(500).json({ error: "channel is required" });
  }

  let uid = req.params.uid;
  if (!uid || uid === "") {
    return resp.status(500).json({ error: "uid is required" });
  }

  let role;
  if (req.params.role === "Broadcaster") {
    role = RtcRole.PUBLISHER;
  } else if (req.params.role === "Audience") {
    role = RtcRole.SUBSCRIBER;
  } else {
    return resp.status(500).json({ error: "role is incorrect" });
  }

  let expireTime = req.query.expiry;
  if (!expireTime || expireTime === "") {
    expireTime = 3600;
  } else {
    expireTime = parseInt(expireTime, 10);
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;

  let token;
  if (req.params.tokentype === "userAccount") {
    token = RtcTokenBuilder.buildTokenWithAccount(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpireTime
    );
  } else if (req.params.tokentype === "uid") {
    token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpireTime
    );
  } else {
    return resp.status(500).json({ error: "token type is invalid" });
  }

  return resp.json({ rtcToken: token });
};

router.get("/rtc/:channel/:role/:tokentype/:uid", nocache, generateRTCToken);
app.use("/.netlify/functions/api", router);
module.exports.handler = serverless(app);
