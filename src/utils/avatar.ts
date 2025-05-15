// src/utils/avatar.ts
export function getUserAvatar(url: string, username: string) {
  // Return the provided URL if it exists, otherwise use the default placeholder
  return url || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
}