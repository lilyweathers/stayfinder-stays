export interface ProfilePhotoInput { content_type: "image/jpeg" | "image/png" | "image/webp"; data: string }
export const maxPhotoBytes = 5 * 1024 * 1024;
export function validatePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (!file.size || file.size > maxPhotoBytes) throw new Error("Photo must be no larger than 5 MB.");
}
export async function readPhoto(file: File): Promise<ProfilePhotoInput> {
  validatePhoto(file);
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read your photo. Please try again."));
    reader.readAsDataURL(file);
  });
  return { content_type: file.type as ProfilePhotoInput["content_type"], data };
}
