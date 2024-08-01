
import upload from "../config/multer"

const uploadAvatar = upload.single('avatar')

const uploadImage= {
    uploadAvatar,
}

export default uploadImage