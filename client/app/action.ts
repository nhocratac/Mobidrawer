"use server"

import cloudinary from "@/lib/cloudinary";
import { UploadApiResponse } from "cloudinary";

export const uploadFile = async (formData: FormData, userId: string) => {
  try {
    const file = formData.get("file");
    if(!file || !(file instanceof File)) {
      throw new Error("Invalid file");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    const result: UploadApiResponse | undefined = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({
            public_id: file.name,
            overwrite: true,
            folder: `blogs/${userId}`
        }, (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(result);
        })
        .end(buffer);
    });


    if(!result) {
        throw new Error("upload image fail");
    }
    return {
        url: result.secure_url,
        alt: file.name,
    };
  } catch (error) {
    throw error
  }
};
