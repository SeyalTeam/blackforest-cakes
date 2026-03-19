var configurations = {
  dbString: process.env.DB_STRING || "",
  // dbString: process.env.DB_STRING_SECONDARY || "",
  apiPort: 3000,
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
  socketURL: "http://localhost:3003",
  twiloSid: process.env.TWILIO_SID || "",
  twiloAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  ApiUrlHost: process.env.API_URL_HOST || "http://localhost:3001",
};

module.exports = configurations;
