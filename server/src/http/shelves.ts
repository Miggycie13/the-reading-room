import { Router } from "express";
import { z } from "zod";
import { prisma } from "../data/db.js";
import { presentTitle } from "../data/present.js";
import { asyncRoute, HttpError } from "./errors.js";
import { requireReader } from "./guard.js";

export const shelvesRouter = Router();

const bodySchema = z.object({
  titleId: z.string().min(1, "Choose a title."),
});

shelvesRouter.use(requireReader);

async function requireTitle(titleId: string) {
  const title = await prisma.title.findUnique({ where: { id: titleId } });
  if (!title) throw new HttpError(404, "That title is not on the shelves.");
  return title;
}

shelvesRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const rows = await prisma.shelfEntry.findMany({
      where: { readerId: req.reader!.id },
      include: { title: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ titles: rows.map((row) => presentTitle(row.title)) });
  }),
);

shelvesRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const body = bodySchema.parse(req.body);
    await requireTitle(body.titleId);
    await prisma.shelfEntry.upsert({
      where: { readerId_titleId: { readerId: req.reader!.id, titleId: body.titleId } },
      update: {},
      create: { readerId: req.reader!.id, titleId: body.titleId },
    });
    res.status(201).json({ ok: true });
  }),
);

shelvesRouter.delete(
  "/:titleId",
  asyncRoute(async (req, res) => {
    const titleId = String(req.params.titleId);
    await prisma.shelfEntry.deleteMany({
      where: { readerId: req.reader!.id, titleId },
    });
    res.json({ ok: true });
  }),
);

shelvesRouter.get(
  "/bookmarks",
  asyncRoute(async (req, res) => {
    const rows = await prisma.bookmark.findMany({
      where: { readerId: req.reader!.id },
      include: { title: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ titles: rows.map((row) => presentTitle(row.title)) });
  }),
);

shelvesRouter.post(
  "/bookmarks",
  asyncRoute(async (req, res) => {
    const body = bodySchema.parse(req.body);
    await requireTitle(body.titleId);
    await prisma.bookmark.upsert({
      where: { readerId_titleId: { readerId: req.reader!.id, titleId: body.titleId } },
      update: {},
      create: { readerId: req.reader!.id, titleId: body.titleId },
    });
    res.status(201).json({ ok: true });
  }),
);

shelvesRouter.delete(
  "/bookmarks/:titleId",
  asyncRoute(async (req, res) => {
    const titleId = String(req.params.titleId);
    await prisma.bookmark.deleteMany({
      where: { readerId: req.reader!.id, titleId },
    });
    res.json({ ok: true });
  }),
);
