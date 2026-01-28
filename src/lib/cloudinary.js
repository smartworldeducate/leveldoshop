export const CLOUDINARY_UPLOAD_PRESET = 'profile_image';
export const CLOUDINARY_CLOUD_NAME = 'dejuhbel3';
export const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export const uploadToCloudinary = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    return data.secure_url;
  } catch (err) {
    console.error('Cloudinary Upload Error:', err);
    return null;
  }
};
