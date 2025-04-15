
const env = {
    HOST: process.env.HOST || 'localhost',
    PORT: process.env.PORT || 3000,
    MODE_ENV: process.env.MODE_ENV || 'development',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1',
    NEXT_PUBLIC_BACKEND_SOCKET: process.env.NEXT_PUBLIC_BACKEND_SOCKET || 'http://localhost:8080/ws',
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your_cloud_name',
    NEXT_PUBLIC_CLOUDINARY_API_KEY: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || 'your_api_key',
    CLOUDINARY_API_SECRET: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET || 'your_api_secret',
}

export default env
