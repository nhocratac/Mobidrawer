const description = 'My web app will help you in your daily life'

const env = {
    HOST: process.env.HOST || 'localhost',
    PORT: process.env.PORT || 3000,
    MODE_ENV: process.env.MODE_ENV || 'development',
    APP_NAME: process.env.APP_NAME || 'My App',
    DESCRIPTION: description,
}

export default env
