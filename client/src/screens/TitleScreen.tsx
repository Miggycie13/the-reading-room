import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addBookmark,
  addToShelf,
  displayYear,
  downloadCard,
  getTitle,
  removeBookmark,
  removeFromShelf,
  type TitleRecord,
} from "../api";
import { useRoom } from "../session";

export function TitleScreen() {
  const { id = "" } = useParams();
  const { reader, shelfVersion, bumpShelf } = useRoom();
  const [title, setTitle] = useState<TitleRecord | null>(null);
  const [problem, setProblem] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProblem("");
    getTitle(id)
      .then((next) => {
        if (!cancelled) setTitle(next);
      })
      .catch((error: unknown) => {
        if (!cancelled) setProblem(error instanceof Error ? error.message : "That record could not be opened.");
      });
    return () => {
      cancelled = true;
    };
  }, [id, shelfVersion, reader?.id]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      bumpShelf();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request did not finish.");
    } finally {
      setBusy(false);
    }
  }

  if (problem) return <p className="banner">{problem}</p>;
  if (!title) return <p className="notice">Opening the record…</p>;

  return (
    <article className="title-screen">
      <p className="eyebrow">
        {title.category} · {displayYear(title.year)}
      </p>
      <h2 className="work-title">{title.work}</h2>
      <p className="writer">{title.writer}</p>
      <p>{title.note}</p>
      {title.gutenbergUrl ? (
        <p>
          <a href={title.gutenbergUrl}>Project Gutenberg ebook {title.gutenbergId}</a>
        </p>
      ) : null}
      {message ? <p className="banner">{message}</p> : null}
      <div className="actions">
        <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void run(() => downloadCard(title))}>
          Download bibliographic card
        </button>
        {reader ? (
          <>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={busy}
              onClick={() => void run(() => (title.onShelf ? removeFromShelf(title.id) : addToShelf(title.id)))}
            >
              {title.onShelf ? "Remove from shelf" : "Save to shelf"}
            </button>
            <button
              className="btn btn-text"
              type="button"
              disabled={busy}
              onClick={() => void run(() => (title.bookmarked ? removeBookmark(title.id) : addBookmark(title.id)))}
            >
              {title.bookmarked ? "Remove bookmark" : "Bookmark"}
            </button>
          </>
        ) : (
          <Link className="btn btn-text" to="/enter">
            Sign in to keep a shelf
          </Link>
        )}
      </div>
    </article>
  );
}
