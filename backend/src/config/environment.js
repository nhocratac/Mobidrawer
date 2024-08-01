import "dotenv/config"

export const env = {
  MONGODB_URI: process.env.MONGO_DB_URL,
  DATABASE_NAME: process.env.DATABASE_NAME,

  APP_HOST: process.env.APP_HOST,
  APP_PORT: process.env.APP_PORT,

  SECRECT_KEY: process.env.SECRECT_KEY,
  EXPIRED_API_KEY: process.env.EXPIRED_API_KEY,
  APP_NAME: process.env.APP_NAME,

  BUILD_MODE: process.env.BUILD_MODE,
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
}
