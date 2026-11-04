import { prisma } from "../data/db.js";
import type { CatalogRecord } from "../data/present.js";
import { presentTitle } from "../data/present.js";
import { HttpError } from "../http/errors.js";

export const toolDefinitions = [
  {
    name: "find_titles",
    description: "Search the live catalog by words in the title, the writer, or the section.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "integer" },
      },
      required: ["query"],
    },
  },
  {
    name: "read_record",
    description: "Read one catalog record by its id.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "save_to_shelf",
    description: "Propose placing a title on the signed-in reader's shelf. Does not write until the reader confirms.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
] as const;

export type ToolName = (typeof toolDefinitions)[number]["name"];

const STOP_WORDS = new Set([
  "the", "a", "an", "of", "and", "or", "about", "on", "in", "for", "to", "please",
  "me", "what", "who", "when", "where", "which", "is", "are", "was", "were", "by",
  "tell", "describe", "book", "books", "title", "titles", "work", "works", "novel",
  "story", "with", "from", "that", "this", "into", "your", "my",
]);

export type FoundTitles = { ids: string[]; titles: CatalogRecord[] };

export async function findTitles(query: string, limit = 5): Promise<FoundTitles> {
  const take = Math.min(Math.max(limit, 1), 8);
  const phrase = query.trim().toLowerCase();
  if (!phrase) return { ids: [], titles: [] };

  const direct = await prisma.title.findMany({
    where: {
      OR: [
        { workKey: { contains: phrase } },
        { writerKey: { contains: phrase } },
        { categoryKey: { contains: phrase } },
      ],
    },
    orderBy: [{ year: "asc" }, { work: "asc" }],
    take,
  });
  const chosen = direct.length ? direct : await findByWords(phrase, take);
  const titles = chosen.map(presentTitle);
  return { ids: titles.map((title) => title.id), titles };
}

async function findByWords(phrase: string, take: number) {
  const words = phrase
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  if (!words.length) return [];
  return prisma.title.findMany({
    where: {
      AND: words.map((word) => ({
        OR: [{ workKey: { contains: word } }, { writerKey: { contains: word } }, { categoryKey: { contains: word } }],
      })),
    },
    orderBy: [{ year: "asc" }, { work: "asc" }],
    take,
  });
}

export async function readRecord(id: string): Promise<CatalogRecord | null> {
  if (!id) return null;
  const row = await prisma.title.findUnique({ where: { id } });
  return row ? presentTitle(row) : null;
}

export type ShelfProposal = {
  token: string;
  titleId: string;
  work: string;
  writer: string;
  readerId: string;
  at: number;
};

const proposals = new Map<string, ShelfProposal>();

export async function saveToShelf(titleId: string, readerId: string): Promise<ShelfProposal> {
  const row = await prisma.title.findUnique({ where: { id: titleId } });
  if (!row) throw new HttpError(404, "That title is not on the shelves.");
  const proposal: ShelfProposal = {
    token: crypto.randomUUID(),
    titleId: row.id,
    work: row.work,
    writer: row.writer,
    readerId,
    at: Date.now(),
  };
  proposals.set(proposal.token, proposal);
  return proposal;
}

export async function confirmShelfProposal(token: string, readerId: string) {
  const proposal = proposals.get(token);
  if (!proposal || proposal.readerId !== readerId || Date.now() - proposal.at > 30 * 60 * 1000) {
    proposals.delete(token);
    throw new HttpError(404, "That confirmation has expired. Ask the librarian again.");
  }
  const entry = await prisma.shelfEntry.upsert({
    where: { readerId_titleId: { readerId, titleId: proposal.titleId } },
    update: {},
    create: { readerId, titleId: proposal.titleId },
    include: { title: true },
  });
  proposals.delete(token);
  return entry;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  readerId?: string,
): Promise<FoundTitles | CatalogRecord | null | ShelfProposal | { needsAccount: true }> {
  if (!toolDefinitions.some((tool) => tool.name === name)) {
    throw new HttpError(400, "Unknown librarian tool.");
  }
  if (name === "find_titles") {
    return findTitles(String(args.query ?? ""), Number(args.limit ?? 5));
  }
  if (name === "read_record") {
    return readRecord(String(args.id ?? ""));
  }
  if (name === "save_to_shelf") {
    if (!readerId) return { needsAccount: true };
    return saveToShelf(String(args.id ?? ""), readerId);
  }
  throw new HttpError(400, "Unknown librarian tool.");
}
