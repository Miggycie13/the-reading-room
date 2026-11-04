import cors from "cors";
import express from "express";
import { openShelves } from "./bootstrap.js";
import { catalogRouter } from "./http/catalog.js";
import { deskRouter } from "./http/desk.js";
import { onError } from "./http/errors.js";
import { librarianRouter } from "./http/librarian.js";
import { loansRouter } from "./http/loans.js";
import { sessionRouter } from "./http/session.js";
import { shelvesRouter } from "./http/shelves.js";
import { shelvesAreReady } from "./ready.js";

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ready: shelvesAreReady() });
});

app.use("/api", (req, res, next) => {
  if (shelvesAreReady() || req.path === "/health") {
    next();
    return;
  }
  res.set("Cache-Control", "no-store");
  res.status(503).json({ error: "The reading room is still opening the shelves." });
});

app.use("/api/session", sessionRouter);
app.use("/api/loans", loansRouter);
app.use("/api/shelves", shelvesRouter);
app.use("/api/desk", deskRouter);
app.use("/api/librarian", librarianRouter);
app.use("/api", catalogRouter);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "That path is not in the reading room." });
});
app.use(onError);

const port = Number(process.env.PORT) || 4100;

// Open the port before schema setup so the website can retry.
app.listen(port, "0.0.0.0", () => {
  console.log(`The reading room is listening on port ${port}`);
  void openShelves().catch((error) => {
    console.error("Could not open the shelves.", error);
  });
});
