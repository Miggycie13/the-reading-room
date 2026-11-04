import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "./errors.js";

const SECRET = process.env.JWT_SECRET || "reading-room-local-secret";

export type AuthReader = {
  id: string;
  email: string;
  name: string;
  role: "reader" | "desk";
};

type TokenPayload = AuthReader & { sub: string; jti: string };

const revoked = new Set<string>();

declare global {
  namespace Express {
    interface Request {
      reader?: AuthReader;
      tokenJti?: string;
    }
  }
}

export function signReader(reader: AuthReader): string {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { sub: reader.id, email: reader.email, name: reader.name, role: reader.role, jti },
    SECRET,
    { expiresIn: "7d" },
  );
}

export function revokeCurrentToken(req: Request): void {
  if (req.tokenJti) revoked.add(req.tokenJti);
}

function readPayload(header?: string): TokenPayload | null {
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), SECRET) as TokenPayload;
    if (!payload?.sub || !payload.jti || revoked.has(payload.jti)) return null;
    if (payload.role !== "reader" && payload.role !== "desk") return null;
    return payload;
  } catch {
    return null;
  }
}

function attach(req: Request, payload: TokenPayload): void {
  req.reader = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };
  req.tokenJti = payload.jti;
}

export function optionalReader(req: Request, _res: Response, next: NextFunction): void {
  const payload = readPayload(req.header("authorization"));
  if (payload) attach(req, payload);
  next();
}

export function requireReader(req: Request, _res: Response, next: NextFunction): void {
  const payload = readPayload(req.header("authorization"));
  if (!payload) {
    next(new HttpError(401, "Sign in to continue."));
    return;
  }
  attach(req, payload);
  next();
}

export function requireDesk(req: Request, _res: Response, next: NextFunction): void {
  const payload = readPayload(req.header("authorization"));
  if (!payload) {
    next(new HttpError(401, "Sign in to continue."));
    return;
  }
  if (payload.role !== "desk") {
    next(new HttpError(403, "The desk is reserved for staff."));
    return;
  }
  attach(req, payload);
  next();
}
