import type { Request } from "express";

function normalize(ip: string): string {
  return ip.replace(/^::ffff:/, "").trim();
}

export function guestAddress(req: Request): string {
  const socketIp = normalize(req.socket.remoteAddress || "unknown");
  const loopback = socketIp === "127.0.0.1" || socketIp === "::1";
  if (loopback) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) {
      const first = normalize(forwarded.split(",")[0] ?? "");
      if (first) return first;
    }
  }
  return socketIp;
}
