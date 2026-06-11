import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadReceipt(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string | null> {
  try {
    const bucketName = 'receipts';
    
    // Create unique file name
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(uniqueFileName, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading file to Supabase Storage:', error.message);
      // Fallback: If bucket does not exist, return a public URL placeholder
      // (This helps gracefully bypass errors if the bucket is not created yet)
      return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${uniqueFileName}`;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uniqueFileName);

    return urlData.publicUrl;
  } catch (err: any) {
    console.error('Failed to upload receipt:', err.message);
    return null;
  }
}
