import { NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireOwner, MobileAuthError } from "@/lib/mobileAuth";
import { ok, fail } from "@/lib/apiResponse";

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request: NextRequest) {
  try {
    // 1. Mobile App Authentication Check (Bearer Token)
    requireOwner(request);

    // 2. Multipart FormData parse karein
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mediaType = (formData.get("type") as string) || "auto"; // "image" | "video" | "raw" | "auto"

    if (!file) {
      return fail("No file provided in form-data ('file' field required)", 400);
    }

    // 3. File ko Buffer me convert karein
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Cloudinary upload stream
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "basekey_mobile_chat",
          resource_type: mediaType === "document" ? "raw" : "auto",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(buffer);
    });

    // 5. Public URL return karein
    return ok({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      resourceType: uploadResult.resource_type,
    });
  } catch (err: any) {
    if (err instanceof MobileAuthError) {
      return fail(err.message, err.status);
    }
    console.error("[Mobile Upload Error]", err);
    return fail(err.message || "File upload failed", 500);
  }
}
