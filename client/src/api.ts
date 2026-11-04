const TOKEN_KEY = "reading-room-token";

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

export type TitleFilters = {
  title: string;
  author: string;
  category: string;
};

export type DeskSummary = {
  books: number;
  accounts: number;
  downloads: number;
  recent: { id: string; createdAt: string; work: string; titleId: string; who: string }[];
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

export function displayYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : String(year);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
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
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("application/pdf")) return (await response.blob()) as T;
  return (await response.json()) as T;
}

export async function getTitles(filters: TitleFilters): Promise<TitleRecord[]> {
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

export async function register(input: { name: string; email: string; password: string }) {
  return request<{ token: string; reader: ReaderProfile }>("/api/session/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function login(input: { email: string; password: string }) {
  return request<{ token: string; reader: ReaderProfile }>("/api/session/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logout(): Promise<void> {
  await request("/api/session/logout", { method: "POST" });
}

export async function me(): Promise<ReaderProfile> {
  const body = await request<{ reader: ReaderProfile }>("/api/session/me");
  return body.reader;
}

export async function downloadCard(title: TitleRecord): Promise<void> {
  const blob = await request<Blob>(`/api/loans/${title.id}/card`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.slug}-bibliographic-card.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

export async function deskSummary(): Promise<DeskSummary> {
  return request<DeskSummary>("/api/desk/summary");
}

export type TitleDraft = {
  work: string;
  writer: string;
  category: string;
  year: number;
  note: string;
  gutenbergId: number | null;
};

export async function createTitle(draft: TitleDraft): Promise<TitleRecord> {
  const body = await request<{ title: TitleRecord }>("/api/desk/titles", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  return body.title;
}

export async function updateTitle(id: string, draft: TitleDraft): Promise<TitleRecord> {
  const body = await request<{ title: TitleRecord }>(`/api/desk/titles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(draft),
  });
  return body.title;
}

export async function deleteTitle(id: string): Promise<void> {
  await request(`/api/desk/titles/${id}`, { method: "DELETE" });
}

export async function askLibrarian(message: string): Promise<LibrarianReply> {
  return request<LibrarianReply>("/api/librarian/converse", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function confirmLibrarian(token: string): Promise<TitleRecord> {
  const body = await request<{ title: TitleRecord }>("/api/librarian/confirm", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  return body.title;
}
