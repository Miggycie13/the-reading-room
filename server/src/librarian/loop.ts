import type { CatalogRecord } from "../data/present.js";
import { presentYear } from "../data/present.js";
import { HttpError } from "../http/errors.js";
import { executeTool, type FoundTitles, type ShelfProposal } from "./tools.js";

export type LibrarianStep = {
  tool: "find_titles" | "read_record" | "save_to_shelf";
  args: Record<string, unknown>;
  ids?: string[];
};

export type PendingSave = {
  token: string;
  titleId: string;
  work: string;
  writer: string;
};

export type ConversationResult = {
  reply: string;
  pending: PendingSave | null;
  steps: LibrarianStep[];
};

function tidy(value: string): string {
  return value
    .replace(/^[\s"'“”]+|[\s"'“”?.!,]+$/g, "")
    .replace(/^(the book|the novel|the title|the work)\s+/i, "")
    .trim();
}

export function comparisonTargets(message: string): string[] | null {
  const text = message.replace(/\?+$/g, "").trim();
  const comparative =
    /\b(compare|comparison|contrast|versus|vs\.?|difference between)\b/i.test(text) ||
    /\bwhich\b[\s\S]+\bor\b/i.test(text);
  if (!comparative) return null;
  const patterns = [
    /compare\s+(.+?)\s+(?:and|with|to|vs\.?|versus)\s+(.+)/i,
    /contrast\s+(.+?)\s+(?:and|with|to)\s+(.+)/i,
    /difference between\s+(.+?)\s+and\s+(.+)/i,
    /(.+?)\s+(?:vs\.?|versus)\s+(.+)/i,
    /which\b[\s\S]*?\b([^,]+?)\s+or\s+(.+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const left = tidy(match[1] ?? "");
    const right = tidy(match[2] ?? "");
    if (left && right) return [left, right];
  }
  return [tidy(text)];
}

function isSaveRequest(message: string): boolean {
  return /\b(save|add|place|put|keep)\b/i.test(message) && /\bshelf\b/i.test(message);
}

function saveQuery(message: string): string {
  return tidy(
    message
      .replace(/\b(to my shelf|on my shelf|onto my shelf|to the shelf|on the shelf)\b/gi, " ")
      .replace(/\b(please|could you|would you|can you|save|add|place|put|keep)\b/gi, " ")
      .replace(/\s+/g, " "),
  );
}

function searchPhrase(message: string): string {
  const stripped = message
    .replace(/^(please|can you|could you|would you|tell me about|what is|who wrote|when was|describe)\s+/i, "")
    .replace(/\?+$/g, "")
    .trim();
  return stripped || message.trim();
}

function comparisonReply(records: CatalogRecord[]): string {
  const unique: CatalogRecord[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    unique.push(record);
  }
  if (!unique.length) return "I searched the catalog and found no records to compare.";
  const lines = unique.map(
    (record) =>
      `${record.work} (${presentYear(record.year)}) by ${record.writer}, filed under ${record.category}. ${record.note}`,
  );
  const earliest = unique.reduce((left, right) => (left.year < right.year ? left : right));
  const latest = unique.reduce((left, right) => (left.year > right.year ? left : right));
  const sections = [...new Set(unique.map((record) => record.category))];
  let closing = `The earlier record here is ${earliest.work} (${presentYear(earliest.year)}).`;
  if (earliest.id !== latest.id) {
    closing += ` The later one is ${latest.work} (${presentYear(latest.year)}).`;
  }
  closing +=
    sections.length > 1
      ? ` They are filed under ${sections.join(", ")}.`
      : ` They are filed under ${sections[0]}.`;
  return `${lines.join("\n\n")}\n\n${closing}`;
}

function detailReply(record: CatalogRecord): string {
  const link = record.gutenbergUrl ? ` A Project Gutenberg ebook is ${record.gutenbergUrl}.` : "";
  return `${record.work} (${presentYear(record.year)}) is by ${record.writer} and is filed under ${record.category}. ${record.note}${link}`;
}

function listReply(found: FoundTitles, query: string): string {
  if (!found.titles.length) return "No titles match.";
  const lines = found.titles.map(
    (record) => `${record.work} - ${record.writer} (${presentYear(record.year)}, ${record.category})`,
  );
  return `I found these records for “${query}”:\n${lines.join("\n")}`;
}

async function readReturnedIds(ids: string[], steps: LibrarianStep[]): Promise<CatalogRecord[]> {
  const records: CatalogRecord[] = [];
  for (const id of ids) {
    const record = (await executeTool("read_record", { id })) as CatalogRecord | null;
    steps.push({ tool: "read_record", args: { id } });
    if (record) records.push(record);
  }
  return records;
}

export async function converse(input: { message: string; readerId?: string }): Promise<ConversationResult> {
  const message = input.message.trim();
  if (!message) throw new HttpError(400, "Ask the librarian a question.");
  const steps: LibrarianStep[] = [];

  if (isSaveRequest(message)) {
    const query = saveQuery(message) || message;
    const found = (await executeTool("find_titles", { query, limit: 4 })) as FoundTitles;
    steps.push({ tool: "find_titles", args: { query, limit: 4 }, ids: found.ids });
    const topId = found.ids[0];
    if (!topId) {
      return { reply: `I could not find “${query}” on the shelves.`, pending: null, steps };
    }
    const records = await readReturnedIds([topId], steps);
    const record = records[0];
    if (!record) {
      return { reply: "I found a catalog id, but the record could not be read.", pending: null, steps };
    }
    if (!input.readerId) {
      return {
        reply: `“${record.work}” by ${record.writer} is in the catalog. A shelf is kept for signed-in readers. Sign in, then ask me again.`,
        pending: null,
        steps,
      };
    }
    const proposal = (await executeTool("save_to_shelf", { id: record.id }, input.readerId)) as ShelfProposal;
    steps.push({ tool: "save_to_shelf", args: { id: record.id } });
    return {
      reply: `I can place “${record.work}” by ${record.writer} on your shelf. Nothing is saved until you press Confirm.`,
      pending: {
        token: proposal.token,
        titleId: proposal.titleId,
        work: proposal.work,
        writer: proposal.writer,
      },
      steps,
    };
  }

  const targets = comparisonTargets(message);
  if (targets) {
    const records: CatalogRecord[] = [];
    for (const query of targets) {
      const found = (await executeTool("find_titles", { query, limit: 4 })) as FoundTitles;
      steps.push({ tool: "find_titles", args: { query, limit: 4 }, ids: found.ids });
      records.push(...(await readReturnedIds(found.ids, steps)));
    }
    return { reply: comparisonReply(records), pending: null, steps };
  }

  const query = searchPhrase(message);
  const found = (await executeTool("find_titles", { query, limit: 6 })) as FoundTitles;
  steps.push({ tool: "find_titles", args: { query, limit: 6 }, ids: found.ids });
  const wantsRecord = /\b(about|summar|who wrote|when|year|describe|tell me)\b/i.test(message);
  if (wantsRecord && found.ids[0]) {
    const records = await readReturnedIds([found.ids[0]], steps);
    if (records[0]) return { reply: detailReply(records[0]), pending: null, steps };
  }
  return { reply: listReply(found, query), pending: null, steps };
}
