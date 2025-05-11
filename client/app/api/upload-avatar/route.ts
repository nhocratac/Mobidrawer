import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { UploadApiResponse } from "cloudinary";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const userId = formData.get("userId") as string;

  if (!file || !(file instanceof File) || !userId) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result: UploadApiResponse | undefined = await new Promise(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `avatars/${userId}`,
            public_id: "avatar",
            overwrite: true,
          },
          (err, result) => {
            if (err || !result) reject(err);
            else resolve(result);
          }
        )
        .end(buffer);
    }
  );

  if (!result) {
    throw new Error("upload image fail");
  }

  return NextResponse.json({ url: result.secure_url });
}
