import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

// ⚙️ Standard Backend Configuration (CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'nlzvncpy',
  api_key: process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '355452859549375',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'F3QJEDcKQtZHVwvQyQTqBrK1Brk',
  secure: true,
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // 🔒 Auth verification
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Strict typing for Cloudinary
    const resourceType = ((formData.get('resource_type') as string) || 'auto') as "auto" | "video" | "image" | "raw";

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64 buffer for Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Target folder selection
    const folder = (formData.get('folder') as string) || 'basekey-media';

    // 🚀 Signed Upload (API Key + Secret se signed upload hoti hai, preset ki zaroorat nahi)
    const result = await cloudinary.uploader.upload(base64, {
      resource_type: resourceType,
      folder: folder,
    });

    // Dono keys (url aur secure_url) return kiye hain taaki team page aur baaki components dono support ho sakein
    return NextResponse.json({
      url: result.secure_url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
    });
  } catch (error: any) {
    console.error('Cloudinary backend upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
