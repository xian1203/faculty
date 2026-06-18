/**
 * Cloudinary Service
 * Handles image uploads and transformations
 */
export class CloudinaryService {
  private static readonly CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  private static readonly UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET;
  private static readonly UPLOAD_URL = `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`;

  /**
   * Upload image to Cloudinary
   * @param file - Image file to upload
   * @param folder - Optional folder path in Cloudinary
   * @returns URL of uploaded image
   */
  static async uploadImage(file: File, folder: string = 'honesty_store/products'): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.UPLOAD_PRESET);
      formData.append('folder', folder);
      formData.append('resource_type', 'auto');

      const response = await fetch(this.UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload image to Cloudinary');
    }
  }

  /**
   * Generate optimized image URL for display
   * @param publicId - Cloudinary public ID
   * @param options - Transformation options
   */
  static getOptimizedUrl(
    publicId: string,
    options?: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      format?: string;
    }
  ): string {
    const baseUrl = `https://res.cloudinary.com/${this.CLOUD_NAME}/image/fetch`;
    const params = new URLSearchParams();

    if (options?.width) params.append('w', options.width.toString());
    if (options?.height) params.append('h', options.height.toString());
    if (options?.crop) params.append('c', options.crop);
    if (options?.quality) params.append('q', options.quality);
    if (options?.format) params.append('f', options.format);

    return `${baseUrl}/${params.toString()}/${publicId}`;
  }

  /**
   * Delete image from Cloudinary (requires backend)
   * Frontend cannot delete without exposing API secret
   * Use backend endpoint instead
   */
  static async deleteImage(publicId: string): Promise<void> {
    try {
      // This should be called from a backend endpoint
      const response = await fetch('/api/cloudinary/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId }),
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error('Failed to delete image from Cloudinary');
    }
  }

  /**
   * Get Cloudinary cloud name
   */
  static getCloudName(): string {
    return this.CLOUD_NAME;
  }

  /**
   * Get upload preset
   */
  static getUploadPreset(): string {
    return this.UPLOAD_PRESET;
  }
}
