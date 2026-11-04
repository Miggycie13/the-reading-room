import { Router } from "express";
import { z } from "zod";
import { prisma } from "../data/db.js";
import { presentTitle } from "../data/present.js";
import { uniqueSlug } from "../data/slug.js";
import { asyncRoute, HttpError } from "./errors.js";
import { requireDesk } from "./guard.js";

export const deskRouter = Router();

const titleSchema = z.object({
  work: z.string().trim().min(1, "A title is required.").max(200),
  writer: z.string().trim().min(1, "A writer is required.").max(160),
  category: z.string().trim().min(1, "A section is required.").max(60),
  year: z.number().int().min(-3000).max(2100),
  note: z.string().trim().min(8, "Add a short bibliographic note.").max(600),
  gutenbergId: z.number().int().positive().nullable().optional(),
});

deskRouter.use(requireDesk);

function keys(work: string, writer: string, category: string) {
  return {
    workKey: work.toLowerCase(),
    writerKey: writer.toLowerCase(),
    categoryKey: category.toLowerCase(),
  };
}

deskRouter.get(
  "/summary",
  asyncRoute(async (_req, res) => {
    const [books, accounts, downloads, recent] = await Promise.all([
      prisma.title.count(),
      prisma.reader.count(),
      prisma.download.count(),
      prisma.download.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { title: true, reader: true },
      }),
    ]);
    res.json({
      books,
      accounts,
      downloads,
      recent: recent.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        work: row.title.work,
        titleId: row.titleId,
        who: row.reader ? row.reader.email : `Guest at ${row.guestIp ?? "unknown"}`,
      })),
    });
  }),
);

deskRouter.post(
  "/titles",
  asyncRoute(async (req, res) => {
    const body = titleSchema.parse(req.body);
    const slug = await uniqueSlug(body.work);
    const created = await prisma.title.create({
      data: {
        slug,
        work: body.work,
        writer: body.writer,
        category: body.category,
        year: body.year,
        note: body.note,
        gutenbergId: body.gutenbergId ?? null,
        ...keys(body.work, body.writer, body.category),
      },
    });
    res.status(201).json({ title: presentTitle(created) });
  }),
);

deskRouter.patch(
  "/titles/:id",
  asyncRoute(async (req, res) => {
    const id = String(req.params.id);
    const existing = await prisma.title.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "That title is not on the shelves.");
    const body = titleSchema.parse(req.body);
    const updated = await prisma.title.update({
      where: { id },
      data: {
        work: body.work,
        writer: body.writer,
        category: body.category,
        year: body.year,
        note: body.note,
        gutenbergId: body.gutenbergId ?? null,
        ...keys(body.work, body.writer, body.category),
      },
    });
    res.json({ title: presentTitle(updated) });
  }),
);

deskRouter.delete(
  "/titles/:id",
  asyncRoute(async (req, res) => {
    const id = String(req.params.id);
    const existing = await prisma.title.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "That title is not on the shelves.");
    await prisma.title.delete({ where: { id } });
    res.json({ ok: true });
  }),
);
