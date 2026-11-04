import PDFDocument from "pdfkit";
import { presentYear } from "./present.js";

type CardSource = {
  slug: string;
  work: string;
  writer: string;
  category: string;
  year: number;
  note: string;
  gutenbergId: number | null;
};

export function buildBibliographicCard(title: CardSource): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 64 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fillColor("#1b6b43").font("Helvetica").fontSize(11).text("THE READING ROOM");
    doc.moveDown(0.4);
    doc.fillColor("#1e1914").font("Times-Roman").fontSize(22).text("Bibliographic card");
    doc.moveDown(0.5);
    doc.fontSize(18).text(title.work);
    doc.moveDown(0.8);
    doc.font("Helvetica").fontSize(12);
    doc.text(`Writer: ${title.writer}`);
    doc.text(`Year: ${presentYear(title.year)}`);
    doc.text(`Section: ${title.category}`);
    doc.text(`Shelf mark: ${title.slug}`);
    doc.moveDown();
    doc.text(title.note, { width: 460 });
    doc.moveDown();
    if (title.gutenbergId) {
      const url = `https://www.gutenberg.org/ebooks/${title.gutenbergId}`;
      doc.fillColor("#1b6b43").text(`Project Gutenberg ebook ${title.gutenbergId}`, {
        link: url,
        underline: true,
      });
      doc.fillColor("#1e1914").text(url);
    }
    doc.moveDown(2);
    doc
      .fontSize(10)
      .fillColor("#5c5348")
      .text("This card records the work. It does not contain the book text.");
    doc.end();
  });
}
