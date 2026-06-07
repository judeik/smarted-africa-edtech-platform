import dotenv from 'dotenv';
dotenv.config();

const required = (key) => {
  const val = process.env[key];
  if (!val && process.env.NODE_ENV === 'production') {
    console.error(`FATAL: Missing required env var: ${key}`);
    process.exit(1);
  }
  return val;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  dbUri: process.env.MONGO_URI || 'mongodb://localhost:27017/smarted_dev',

  jwtSecret: required('JWT_SECRET') || 'dev_jwt_secret_CHANGE_IN_PRODUCTION',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  refreshSecret: process.env.REFRESH_SECRET || 'dev_refresh_secret_CHANGE_IN_PRODUCTION',

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: process.env.EMAIL_FROM || 'no-reply@smarted.africa',

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,

  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,

  sentryDsn: process.env.SENTRY_DSN,

  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,
};

export default env;
