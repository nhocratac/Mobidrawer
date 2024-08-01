import multer from 'multer'
import {CloudinaryStorage} from 'multer-storage-cloudinary'
import cloudinary from './cloudinary'
import { env } from './environment'

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: env.APP_NAME,
        allowed_formats: ['jpg', 'png'],
    },
})

const upload = multer({storage: storage})

export default upload
