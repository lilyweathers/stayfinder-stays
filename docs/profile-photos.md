# Profile photos

Apply [015_profile_photos.sql](../database/015_profile_photos.sql) in the Supabase SQL Editor before testing uploads.
The migration creates a public profile-photos bucket with a 5 MB limit and JPEG/PNG/WebP restrictions.
Authenticated Storage policies restrict listing, uploading, and deleting to the current user's ID folder.

Registration accepts an optional device photo, including when email confirmation is enabled. The backend needs the existing SUPABASE_ADMIN_KEY for this pre-login upload; keep this key only in backend/.env. The signup photo receives a random registration path, and its public URL is saved in Supabase Auth user_metadata.avatar_url together with display_name. Failed or masked duplicate signups remove the staged upload.

Authenticated edits use the request's user client and a generated path within the verified user ID folder. Omitting a photo preserves it; remove_photo clears it. Successful replacement/removal cleans up the previous generated image in that user's folder. Registration photos use admin-owned paths and are retained when replaced or removed; their metadata link is cleared. Account deletion removes user-owned profile uploads before deleting the user.

The browser sends the selected image as base64 JSON; the API validates size, declared MIME type, and file signature, and bounds the request body. The UI previews selected files and falls back to initials when a saved image cannot load. Photo URLs are public; they are presentation data, never authorization data.

## Browser checks

1. Register a temporary account with a name and photo. Confirm email if required, then sign in.
2. Verify the photo on Profile and reload to verify persistence.
3. Edit profile to replace the photo and name; save and reload.
4. Remove the photo; save and verify initials return.
5. Try an unsupported file or a file larger than 5 MB; verify the error.
6. Delete the temporary account and verify its user-owned uploads do not block deletion.

Automated API tests use simulated Supabase responses; hosted Storage and browser checks still require the migration and live verification.

References: [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [bucket restrictions](https://supabase.com/docs/guides/storage/buckets/creating-buckets), and [account metadata](https://supabase.com/docs/reference/javascript/auth-updateuser).
