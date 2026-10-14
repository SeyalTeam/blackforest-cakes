var configurations = {
  dbString: process.env.DB_STRING || "mongodb://127.0.0.1:27017/blackforestlocal",
  // dbString: process.env.DB_STRING_SECONDARY || "",
  apiPort: parseInt(process.env.API_PORT || process.env.PORT || 3000, 10),
  adminPort: 3001,
  cronPort: 3002,
  socketPort: 3003,
  jwtSecretKey: process.env.JWT_SECRET_KEY || "change-me",
  tokenExpDays: process.env.TOKEN_EXP_DAYS || "10d",
  awsS3accessKey: process.env.AWS_S3_ACCESS_KEY || "",
  awsS3SecretKey: process.env.AWS_S3_SECRET_KEY || "",
  awsS3bucket: "blackforestbasket",
  cloudMessageKey: process.env.CLOUD_MESSAGE_KEY || "",
  webPushPublicKey: process.env.WEB_PUSH_PUBLIC_KEY || "",
  webPushPrivateKey: process.env.WEB_PUSH_PRIVATE_KEY || "",
  socketURL: process.env.SOCKET_URL || "",
  twiloSid: process.env.TWILIO_SID || "",
  twiloAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  ApiUrlHost: process.env.API_URL_HOST || "http://localhost:3001",
  payloadApiUrl: process.env.PAYLOAD_API_URL || process.env.PAYLOAD_PUBLIC_SERVER_URL || "http://127.0.0.1:4000",
};

module.exports = configurations;
