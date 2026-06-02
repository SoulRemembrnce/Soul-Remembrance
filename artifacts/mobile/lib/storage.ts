import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "./firebase";

/**
 * Upload a local image URI to Firebase Storage and return the public download URL.
 * Path: avatars/{role}/{userId}.jpg
 */
export async function uploadAvatar(
  userId: string,
  localUri: string,
  role: "client" | "practitioner"
): Promise<string> {
  const path = `avatars/${role}/${userId}.jpg`;
  const storageRef = ref(storage, path);

  const resp = await fetch(localUri);
  const blob = await resp.blob();

  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}

/**
 * Upload a verification document image to Firebase Storage.
 * Path: verificationDocs/{userId}/{type}_{index}.jpg
 */
export async function uploadVerificationDoc(
  userId: string,
  localUri: string,
  type: "certificate" | "insurance" | "dbs",
  index = 0
): Promise<string> {
  const path = `verificationDocs/${userId}/${type}_${index}.jpg`;
  const storageRef = ref(storage, path);

  const resp = await fetch(localUri);
  const blob = await resp.blob();

  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}
