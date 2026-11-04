import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBookmarks, removeBookmark, type TitleRecord } from "../api";
import { CatalogCard } from "../shell/CatalogCard";
import { useRoom } from "../session";

export function MarksScreen() {
  const { reader, shelfVersion, bumpShelf } = useRoom();
  const [titles, setTitles] = useState<TitleRecord[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reader) return;
    let cancelled = false;
    getBookmarks()
      .then((rows) => {
        if (!cancelled) setTitles(rows);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Bookmarks could not be opened.");
      });
    return () => {
      cancelled = true;
    };
  }, [reader, shelfVersion]);

  if (!reader) {
    return (
      <section>
        <h2>Bookmarks</h2>
        <p className="notice">
          Bookmarks stay with your account. <Link to="/enter">Sign in</Link>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>Bookmarks</h2>
      {message ? <p className="banner">{message}</p> : null}
      {titles.length === 0 ? <p className="notice">No bookmarks yet.</p> : null}
      <div className="stack">
        {titles.map((title) => (
          <CatalogCard
            key={title.id}
            title={title}
            action={
              <>
                <Link className="btn btn-text" to={`/titles/${title.id}`}>
                  Open record
                </Link>
                <button
                  className="btn btn-text"
                  type="button"
                  onClick={() => {
                    void removeBookmark(title.id).then(() => bumpShelf());
                  }}
                >
                  Remove
                </button>
              </>
            }
          />
        ))}
      </div>
    </section>
  );
}
