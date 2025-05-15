// src/utils/avatar.ts
export function getUserAvatar(url: string, username: string) {
  // Kullanıcının avatar URL’si varsa onu döndür, yoksa bir placeholder oluştur
  return url || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`;
}
