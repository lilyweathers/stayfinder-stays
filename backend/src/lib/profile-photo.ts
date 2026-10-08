import { randomUUID } from "node:crypto";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.js";
import type { BasicSupabaseClient } from "../types/supabase.js";

export const avatarBucket = "profile-photos";
export const maxPhotoBytes = 5 * 1024 * 1024;
export const photoSchema = z.object({
  content_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().min(1).max(Math.ceil(maxPhotoBytes / 3) * 4),
}).strict();

export function decodePhoto(photo: z.infer<typeof photoSchema>) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(photo.data) || photo.data.length % 4 !== 0) {
    throw new HTTPException(400, { message: "Invalid photo data" });
  }
  const bytes = Buffer.from(photo.data, "base64");
  if (!bytes.length || bytes.length > maxPhotoBytes) throw new HTTPException(400, { message: "Photo must be no larger than 5 MB" });
  const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!(photo.content_type === "image/png" && png || photo.content_type === "image/jpeg" && jpeg || photo.content_type === "image/webp" && webp)) {
    throw new HTTPException(400, { message: "Choose a JPEG, PNG, or WebP image" });
  }
  return bytes;
}

export async function storePhoto(client: Pick<BasicSupabaseClient, "storage"> | Pick<SupabaseClient<Database>, "storage">, folder: string, photo: z.infer<typeof photoSchema>, bytes: Buffer) {
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[photo.content_type];
  const path = `${folder}/${randomUUID()}.${extension}`;
  const { error } = await client.storage.from(avatarBucket).upload(path, bytes, { contentType: photo.content_type, upsert: false });
  if (error) throw new HTTPException(503, { message: "Could not upload your photo. Please try again. Check that profile photo storage is configured." });
  return { path, url: client.storage.from(avatarBucket).getPublicUrl(path).data.publicUrl };
}

// Supabase requires owned Storage objects to be removed before deleting a user.
export async function removeAccountPhotos(client: SupabaseClient<Database>, userId: string) {
  const bucket = client.storage.from(avatarBucket);
  async function clearFolder(folder: string): Promise<void> {
    for (;;) {
      const { data, error } = await bucket.list(folder, { limit: 100 });
      if (error) {
        if (String(error.statusCode) === "404") return; // Bucket not configured yet.
        throw new HTTPException(500, { message: "Could not remove account photos. Please try again." });
      }
      if (!data?.length) return;
      const files = data.filter(item => item.id).map(item => folder + "/" + item.name);
      for (const entry of data.filter(item => !item.id)) await clearFolder(folder + "/" + entry.name);
      if (files.length) {
        const { error } = await bucket.remove(files);
        if (error) throw new HTTPException(500, { message: "Could not remove account photos. Please try again." });
      }
    }
  }
  await clearFolder(userId);
}
