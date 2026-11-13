/** Upload file names are generated server-side; anything else is rejected. */
export const UPLOAD_NAME = /^[a-z]+-[0-9a-f]{8}-\d{10,16}\.webp$/;
