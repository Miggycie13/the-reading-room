import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

const TOKEN_KEY = "reading-room-token";
const BASE_KEY = "reading-room-base";
export const DEFAULT_BASE = "http://10.0.2.2:4100";

let base = DEFAULT_BASE;
let token: string | null = null;

export type ReaderProfile = {
  id: string;
  email: string;
  name: string;
  role: "reader" | "desk";
};

export type TitleRecord = {
  id: string;
  slug: string;
  work: string;
  writer: string;
  category: string;
  year: number;
  note: string;
  gutenbergId: number | null;
  gutenbergUrl: string | null;
  onShelf?: boolean;
  bookmarked?: boolean;
};

export type PendingSave = {
  token: string;
  titleId: string;
  work: string;
  writer: string;
};

export type LibrarianReply = {
  reply: string;
  pending: PendingSave | null;
  steps: { tool: string; args: Record<string, unknown>; ids?: string[] }[];
};

export type TitleDraft = {
  work: string;
  writer: string;
  category: string;
  year: number;
  note: string;
  gutenbergId: number | null;
};

export function displayYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : String(year);
}

export function getBase(): string {
  return base;
}

export function hasStoredToken(): boolean {
  return Boolean(token);
}

export async function loadStoredSession(): Promise<void> {
  const [savedBase, savedToken] = await Promise.all([
    AsyncStorage.getItem(BASE_KEY),
    AsyncStorage.getItem(TOKEN_KEY),
  ]);
  base = (savedBase || DEFAULT_BASE).replace(/\/$/, "");
  token = savedToken;
}

export async function saveBase(next: string): Promise<void> {
  base = (next.trim() || DEFAULT_BASE).replace(/\/$/, "");
  await AsyncStorage.setItem(BASE_KEY, base);
}

export async function saveToken(next: string | null): Promise<void> {
  token = next;
  if (next) await AsyncStorage.setItem(TOKEN_KEY, next);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

function headers(json = false): Record<string, string> {
  const result: Record<string, string> = {};
  if (json) result["Content-Type"] = "application/json";
  if (token) result.Authorization = `Bearer ${token}`;
  return result;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...headers(Boolean(init?.body)), ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!response.ok) {
    let message = "The reading room could not complete that request.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      message = "The reading room could not complete that request.";
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export async function getTitles(filters: { title: string; author: string; category: string }): Promise<TitleRecord[]> {
  const params = new URLSearchParams();
  if (filters.title.trim()) params.set("title", filters.title.trim());
  if (filters.author.trim()) params.set("author", filters.author.trim());
  if (filters.category.trim()) params.set("category", filters.category.trim());
  const body = await request<{ titles: TitleRecord[] }>(`/api/titles?${params.toString()}`);
  return body.titles;
}

export async function getCategories(): Promise<string[]> {
  const body = await request<{ categories: string[] }>("/api/categories");
  return body.categories;
}

export async function getTitle(id: string): Promise<TitleRecord> {
  const body = await request<{ title: TitleRecord }>(`/api/titles/${id}`);
  return body.title;
}

export async function login(email: string, password: string) {
  return request<{ token: string; reader: ReaderProfile }>("/api/session/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(name: string, email: string, password: string) {
  return request<{ token: string; reader: ReaderProfile }>("/api/session/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function logout(): Promise<void> {
  await request("/api/session/logout", { method: "POST" });
}

export async function me(): Promise<ReaderProfile> {
  const body = await request<{ reader: ReaderProfile }>("/api/session/me");
  return body.reader;
}

export async function getShelf(): Promise<TitleRecord[]> {
  const body = await request<{ titles: TitleRecord[] }>("/api/shelves");
  return body.titles;
}

export async function addToShelf(titleId: string): Promise<void> {
  await request("/api/shelves", { method: "POST", body: JSON.stringify({ titleId }) });
}

export async function removeFromShelf(titleId: string): Promise<void> {
  await request(`/api/shelves/${titleId}`, { method: "DELETE" });
}

export async function getBookmarks(): Promise<TitleRecord[]> {
  const body = await request<{ titles: TitleRecord[] }>("/api/shelves/bookmarks");
  return body.titles;
}

export async function addBookmark(titleId: string): Promise<void> {
  await request("/api/shelves/bookmarks", { method: "POST", body: JSON.stringify({ titleId }) });
}

export async function removeBookmark(titleId: string): Promise<void> {
  await request(`/api/shelves/bookmarks/${titleId}`, { method: "DELETE" });
}

export async function askLibrarian(message: string): Promise<LibrarianReply> {
  return request<LibrarianReply>("/api/librarian/converse", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function confirmLibrarian(confirmToken: string): Promise<TitleRecord> {
  const body = await request<{ title: TitleRecord }>("/api/librarian/confirm", {
    method: "POST",
    body: JSON.stringify({ token: confirmToken }),
  });
  return body.title;
}

export async function deskSummary() {
  return request<{
    books: number;
    accounts: number;
    downloads: number;
    recent: { id: string; createdAt: string; work: string; who: string }[];
  }>("/api/desk/summary");
}

export async function createTitle(draft: TitleDraft): Promise<void> {
  await request("/api/desk/titles", { method: "POST", body: JSON.stringify(draft) });
}

export async function downloadCard(title: TitleRecord): Promise<void> {
  const response = await fetch(`${base}/api/loans/${title.id}/card`, { headers: headers() });
  if (!response.ok) {
    let message = "The card could not be prepared.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      message = "The card could not be prepared.";
    }
    throw new Error(message);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const file = new File(Paths.cache, `${title.slug}-bibliographic-card.pdf`);
  if (file.exists) file.delete();
  file.create();
  await file.write(bytes);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: "Bibliographic card" });
  }
}
