import { Router } from "express";
import { prisma } from "../data/db.js";
import { buildBibliographicCard } from "../data/card.js";
import { takeCard } from "../data/policy.js";
import { asyncRoute, HttpError } from "./errors.js";
import { guestAddress } from "./address.js";
import { optionalReader } from "./guard.js";

export const loansRouter = Router();

loansRouter.get(
  "/:titleId/card",
  optionalReader,
  asyncRoute(async (req, res) => {
    const titleId = String(req.params.titleId);
    const title = await prisma.title.findUnique({ where: { id: titleId } });
    if (!title) throw new HttpError(404, "That title is not on the shelves.");
    const signedIn = Boolean(req.reader);
    await takeCard({
      titleId: title.id,
      readerId: signedIn ? req.reader!.id : undefined,
      guestIp: signedIn ? undefined : guestAddress(req),
      unlimited: req.reader?.role === "desk",
    });
    const pdf = await buildBibliographicCard(title);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${title.slug}-bibliographic-card.pdf"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(pdf);
  }),
);
