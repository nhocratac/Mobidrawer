const isProduction = process.env.NEXT_PUBLIC_MODE_ENV === 'PRODUCTION';

const env = {
    HOST: process.env.HOST || 'localhost',
    PORT: process.env.PORT || 3000,
    NEXT_PUBLIC_MODE_ENV: process.env.NEXT_PUBLIC_MODE_ENV || 'development',
    NEXT_PUBLIC_BACKEND_URL: isProduction 
        ? process.env.NEXT_PUBLIC_BACKEND_URL 
        : 'http://localhost:8080/api/v1',
    NEXT_PUBLIC_BACKEND_SOCKET: isProduction 
        ? process.env.NEXT_PUBLIC_BACKEND_SOCKET 
        : 'http://localhost:8080/ws',
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: isProduction 
        ? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME 
        : 'your_cloud_name',
    NEXT_PUBLIC_CLOUDINARY_API_KEY: isProduction 
        ? process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY 
        : 'your_api_key',
    CLOUDINARY_API_SECRET: isProduction 
        ? process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET 
        : 'your_api_secret',
    NEXT_PUBLIC_FRONTEND_DOMAIN: isProduction 
        ? process.env.NEXT_PUBLIC_FRONTEND_DOMAIN 
        : 'http://localhost:3000'
};

export default env;
