import bcrypt from "bcryptjs";
import { prisma } from "./db.js";
import { WORKS } from "./works.js";

export async function seedReadingRoom(): Promise<void> {
  const slugs = new Set<string>();
  const identities = new Set<string>();
  for (const work of WORKS) {
    if (slugs.has(work.slug)) throw new Error(`Duplicate slug ${work.slug}`);
    slugs.add(work.slug);
    const identity = `${work.work.toLowerCase()}|${work.writer.toLowerCase()}`;
    if (identities.has(identity)) throw new Error(`Duplicate work ${work.work}`);
    identities.add(identity);
  }
  if (WORKS.length < 200) {
    throw new Error(`The catalog seed has ${WORKS.length} titles; at least 200 are required.`);
  }

  const readerHash = await bcrypt.hash("Reader123!", 10);
  const deskHash = await bcrypt.hash("Desk123!", 10);
  await prisma.reader.upsert({
    where: { email: "reader@readingroom.local" },
    update: { name: "Rowan Hale", role: "reader", passwordHash: readerHash },
    create: {
      email: "reader@readingroom.local",
      name: "Rowan Hale",
      role: "reader",
      passwordHash: readerHash,
    },
  });
  await prisma.reader.upsert({
    where: { email: "desk@readingroom.local" },
    update: { name: "Morgan Ellis", role: "desk", passwordHash: deskHash },
    create: {
      email: "desk@readingroom.local",
      name: "Morgan Ellis",
      role: "desk",
      passwordHash: deskHash,
    },
  });

  const existing = await prisma.title.count();
  if (existing >= 200) {
    console.log(`Catalog already holds ${existing} titles; skipping book inserts.`);
    return;
  }

  for (const work of WORKS) {
    await prisma.title.upsert({
      where: { slug: work.slug },
      update: {},
      create: {
        slug: work.slug,
        work: work.work,
        writer: work.writer,
        category: work.category,
        year: work.year,
        note: work.note,
        gutenbergId: work.gutenbergId,
        workKey: work.work.toLowerCase(),
        writerKey: work.writer.toLowerCase(),
        categoryKey: work.category.toLowerCase(),
      },
    });
  }
  console.log(`Catalog holds ${await prisma.title.count()} titles.`);
}
