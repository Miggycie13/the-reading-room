import { Router } from "express";
import { prisma } from "../data/db.js";
import { presentTitle } from "../data/present.js";
import { asyncRoute, HttpError } from "./errors.js";
import { optionalReader } from "./guard.js";

export const catalogRouter = Router();

function textQuery(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

catalogRouter.get(
  "/categories",
  asyncRoute(async (_req, res) => {
    const rows = await prisma.title.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });
    res.set("Cache-Control", "no-store");
    res.json({ categories: rows.map((row) => row.category) });
  }),
);

catalogRouter.get(
  "/titles",
  asyncRoute(async (req, res) => {
    const title = textQuery(req.query.title);
    const author = textQuery(req.query.author);
    const category = textQuery(req.query.category);
    const filters = [];
    if (title) filters.push({ workKey: { contains: title } });
    if (author) filters.push({ writerKey: { contains: author } });
    if (category) filters.push({ categoryKey: category });
    const rows = await prisma.title.findMany({
      where: filters.length ? { AND: filters } : undefined,
      orderBy: [{ writer: "asc" }, { work: "asc" }],
      take: 500,
    });
    res.set("Cache-Control", "no-store");
    res.json({ titles: rows.map(presentTitle) });
  }),
);

catalogRouter.get(
  "/titles/:id",
  optionalReader,
  asyncRoute(async (req, res) => {
    const id = String(req.params.id);
    const row = await prisma.title.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!row) throw new HttpError(404, "That title is not on the shelves.");
    let onShelf = false;
    let bookmarked = false;
    if (req.reader) {
      const [shelf, mark] = await Promise.all([
        prisma.shelfEntry.findUnique({
          where: { readerId_titleId: { readerId: req.reader.id, titleId: row.id } },
        }),
        prisma.bookmark.findUnique({
          where: { readerId_titleId: { readerId: req.reader.id, titleId: row.id } },
        }),
      ]);
      onShelf = Boolean(shelf);
      bookmarked = Boolean(mark);
    }
    res.set("Cache-Control", "no-store");
    res.json({ title: { ...presentTitle(row), onShelf, bookmarked } });
  }),
);
