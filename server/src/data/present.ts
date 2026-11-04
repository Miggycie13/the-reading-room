export type CatalogRecord = {
  id: string;
  slug: string;
  work: string;
  writer: string;
  category: string;
  year: number;
  note: string;
  gutenbergId: number | null;
  gutenbergUrl: string | null;
};

export function presentTitle(title: {
  id: string;
  slug: string;
  work: string;
  writer: string;
  category: string;
  year: number;
  note: string;
  gutenbergId: number | null;
}): CatalogRecord {
  return {
    id: title.id,
    slug: title.slug,
    work: title.work,
    writer: title.writer,
    category: title.category,
    year: title.year,
    note: title.note,
    gutenbergId: title.gutenbergId,
    gutenbergUrl: title.gutenbergId
      ? `https://www.gutenberg.org/ebooks/${title.gutenbergId}`
      : null,
  };
}

export function presentYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : String(year);
}
