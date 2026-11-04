import type { ReactNode } from "react";
import { displayYear, type TitleRecord } from "../api";

export function CatalogCard({
  title,
  action,
}: {
  title: TitleRecord;
  action?: ReactNode;
}) {
  return (
    <article className="catalog-card">
      <p className="eyebrow">
        {title.category} · {displayYear(title.year)}
      </p>
      <h3 className="work-title">{title.work}</h3>
      <p className="writer">{title.writer}</p>
      <p className="note">{title.note}</p>
      {action ? <div className="actions">{action}</div> : null}
    </article>
  );
}
