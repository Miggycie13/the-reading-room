import { Router } from "express";
import { z } from "zod";
import { presentTitle } from "../data/present.js";
import { asyncRoute } from "./errors.js";
import { optionalReader, requireReader } from "./guard.js";
import { converse } from "../librarian/loop.js";
import { confirmShelfProposal } from "../librarian/tools.js";

export const librarianRouter = Router();

const talkSchema = z.object({
  message: z.string().trim().min(1, "Ask the librarian a question.").max(800),
});

const confirmSchema = z.object({
  token: z.string().min(1, "That confirmation is missing."),
});

librarianRouter.post(
  "/converse",
  optionalReader,
  asyncRoute(async (req, res) => {
    const body = talkSchema.parse(req.body);
    const result = await converse({
      message: body.message,
      readerId: req.reader?.id,
    });
    res.json(result);
  }),
);

librarianRouter.post(
  "/confirm",
  requireReader,
  asyncRoute(async (req, res) => {
    const body = confirmSchema.parse(req.body);
    const entry = await confirmShelfProposal(body.token, req.reader!.id);
    res.json({ title: presentTitle(entry.title) });
  }),
);
