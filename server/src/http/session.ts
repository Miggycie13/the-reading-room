import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../data/db.js";
import { asyncRoute, HttpError } from "./errors.js";
import { requireReader, revokeCurrentToken, signReader } from "./guard.js";

export const sessionRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1, "A name is required.").max(80),
  email: z.string().trim().email("Enter a valid email.").max(120),
  password: z.string().min(8, "Use at least 8 characters.").max(80),
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Enter a password."),
});

function publicReader(reader: { id: string; email: string; name: string; role: string }) {
  return {
    id: reader.id,
    email: reader.email,
    name: reader.name,
    role: reader.role === "desk" ? "desk" : "reader",
  } as const;
}

sessionRouter.post(
  "/register",
  asyncRoute(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const email = body.email.toLowerCase();
    const existing = await prisma.reader.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, "An account with that email already exists.");
    const reader = await prisma.reader.create({
      data: {
        email,
        name: body.name,
        passwordHash: await bcrypt.hash(body.password, 10),
        role: "reader",
      },
    });
    const profile = publicReader(reader);
    res.status(201).json({ token: signReader(profile), reader: profile });
  }),
);

sessionRouter.post(
  "/login",
  asyncRoute(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const reader = await prisma.reader.findUnique({ where: { email: body.email.toLowerCase() } });
    const matches = reader ? await bcrypt.compare(body.password, reader.passwordHash) : false;
    if (!reader || !matches) {
      throw new HttpError(401, "Those credentials were not recognized.");
    }
    const profile = publicReader(reader);
    res.json({ token: signReader(profile), reader: profile });
  }),
);

sessionRouter.post(
  "/logout",
  requireReader,
  asyncRoute(async (req, res) => {
    revokeCurrentToken(req);
    res.json({ ok: true });
  }),
);

sessionRouter.get(
  "/me",
  requireReader,
  asyncRoute(async (req, res) => {
    const reader = await prisma.reader.findUnique({ where: { id: req.reader!.id } });
    if (!reader) throw new HttpError(401, "Sign in to continue.");
    res.json({ reader: publicReader(reader) });
  }),
);
