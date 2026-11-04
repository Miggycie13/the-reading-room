import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getShelf, removeFromShelf, type TitleRecord } from "../api";
import { CatalogCard } from "../shell/CatalogCard";
import { useRoom } from "../session";

export function ShelfScreen() {
  const { reader, shelfVersion, bumpShelf } = useRoom();
  const [titles, setTitles] = useState<TitleRecord[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reader) return;
    let cancelled = false;
    getShelf()
      .then((rows) => {
        if (!cancelled) setTitles(rows);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "The shelf could not be opened.");
      });
    return () => {
      cancelled = true;
    };
  }, [reader, shelfVersion]);

  if (!reader) {
    return (
      <section>
        <h2>My shelf</h2>
        <p className="notice">
          Sign in to see the shelf that follows you between the website and the phone. <Link to="/enter">Sign in</Link>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>My shelf</h2>
      {message ? <p className="banner">{message}</p> : null}
      {titles.length === 0 ? <p className="notice">Nothing is on your shelf yet.</p> : null}
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
                    void removeFromShelf(title.id).then(() => bumpShelf());
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
