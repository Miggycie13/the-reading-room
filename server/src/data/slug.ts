import { prisma } from "./db.js";

export function slugify(work: string): string {
  const base = work
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return base || "title";
}

export async function uniqueSlug(work: string): Promise<string> {
  const base = slugify(work);
  let slug = base;
  let suffix = 2;
  while (await prisma.title.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}
