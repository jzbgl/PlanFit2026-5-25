const BASE = 'http://localhost:3456';

export async function forumAuth(localUserId: number, name: string, avatar?: string) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ localUserId, name, avatar }),
  });
  return res.json();
}

export async function getPosts() {
  const res = await fetch(`${BASE}/api/posts`);
  return res.json();
}

export async function createPost(forumUserId: number, content: string, image?: string, category?: string, anonymous?: boolean) {
  const res = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forumUserId, content, image, category, anonymous }),
  });
  return res.json();
}

export async function deletePost(postId: number, forumUserId: number) {
  const res = await fetch(`${BASE}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forumUserId }),
  });
  return res.json();
}

export async function uploadImage(file: File) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${BASE}/api/upload`, { method: 'POST', body: form });
  return res.json();
}

export async function getComments(postId: number) {
  const res = await fetch(`${BASE}/api/posts/${postId}/comments`);
  return res.json();
}

export async function createComment(postId: number, forumUserId: number, content: string) {
  const res = await fetch(`${BASE}/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forumUserId, content }),
  });
  return res.json();
}

export async function toggleLike(postId: number, forumUserId: number) {
  const res = await fetch(`${BASE}/api/posts/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forumUserId }),
  });
  return res.json();
}

export async function getLikes(postId: number) {
  const res = await fetch(`${BASE}/api/posts/${postId}/likes`);
  return res.json();
}

export async function adminAuth(forumUserId: number, password: string) {
  const res = await fetch(`${BASE}/api/admin-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forumUserId, password }),
  });
  return res.json();
}

export async function adminCheck(forumUserId: number) {
  const res = await fetch(`${BASE}/api/admin-check/${forumUserId}`);
  return res.json();
}

export function getImageUrl(path: string) {
  if (!path) return null;
  return `${BASE}${path}`;
}
