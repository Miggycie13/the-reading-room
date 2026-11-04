import { useEffect, useState, type FormEvent } from "react";
import {
  createTitle,
  deleteTitle,
  deskSummary,
  displayYear,
  getTitles,
  updateTitle,
  type DeskSummary,
  type TitleRecord,
} from "../api";
import { useRoom } from "../session";

const empty = { work: "", writer: "", category: "Essays", year: "1900", note: "", gutenbergId: "" };

export function DeskScreen() {
  const { reader } = useRoom();
  const [summary, setSummary] = useState<DeskSummary | null>(null);
  const [titles, setTitles] = useState<TitleRecord[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [nextSummary, nextTitles] = await Promise.all([deskSummary(), getTitles({ title: "", author: "", category: "" })]);
    setSummary(nextSummary);
    setTitles(nextTitles);
  }

  useEffect(() => {
    if (reader?.role !== "desk") return;
    void refresh().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "The desk could not be opened.");
    });
  }, [reader]);

  if (!reader) return <p className="notice">Sign in with a desk account to open the desk.</p>;
  if (reader.role !== "desk") return <p className="notice">The desk is reserved for staff.</p>;

  function draftFromForm() {
    const year = Number(form.year);
    const gutenberg = form.gutenbergId.trim();
    return {
      work: form.work.trim(),
      writer: form.writer.trim(),
      category: form.category.trim(),
      year,
      note: form.note.trim(),
      gutenbergId: gutenberg ? Number(gutenberg) : null,
    };
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const draft = draftFromForm();
      if (editing) await updateTitle(editing, draft);
      else await createTitle(draft);
      setForm(empty);
      setEditing(null);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The title was not saved.");
    } finally {
      setBusy(false);
    }
  }

  const visible = titles.filter((title) => {
    const haystack = `${title.work} ${title.writer}`.toLowerCase();
    return haystack.includes(filter.trim().toLowerCase());
  });

  return (
    <section>
      <h2>Desk</h2>
      {summary ? (
        <div className="stats">
          <article className="stat">
            <strong>{summary.books}</strong>
            Books
          </article>
          <article className="stat">
            <strong>{summary.accounts}</strong>
            Accounts
          </article>
          <article className="stat">
            <strong>{summary.downloads}</strong>
            Downloads
          </article>
        </div>
      ) : null}
      {message ? <p className="banner">{message}</p> : null}
      <form className="form" onSubmit={(event) => void save(event)}>
        <h3>{editing ? "Edit a title" : "Add a title"}</h3>
        <label>
          Title
          <input value={form.work} onChange={(event) => setForm({ ...form, work: event.target.value })} required />
        </label>
        <label>
          Author
          <input value={form.writer} onChange={(event) => setForm({ ...form, writer: event.target.value })} required />
        </label>
        <label>
          Category
          <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required />
        </label>
        <label>
          Year
          <input value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} required />
        </label>
        <label>
          Bibliographic note
          <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} required />
        </label>
        <label>
          Project Gutenberg ebook id
          <input value={form.gutenbergId} onChange={(event) => setForm({ ...form, gutenbergId: event.target.value })} />
        </label>
        <div className="actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {editing ? "Save changes" : "Add title"}
          </button>
          {editing ? (
            <button
              className="btn btn-text"
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(empty);
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
      <h3>Recent downloads</h3>
      <div className="stack">
        {summary?.recent.length ? (
          summary.recent.map((row) => (
            <p className="catalog-card" key={row.id}>
              {row.work} · {row.who} · {new Date(row.createdAt).toLocaleString()}
            </p>
          ))
        ) : (
          <p className="note">No cards have been taken yet.</p>
        )}
      </div>
      <h3>Titles on the shelves</h3>
      <label>
        Find in the desk list
        <input value={filter} onChange={(event) => setFilter(event.target.value)} />
      </label>
      <div className="stack">
        {visible.map((title) => (
          <article className="catalog-card desk-row" key={title.id}>
            <div>
              <h3 className="work-title">{title.work}</h3>
              <p className="writer">
                {title.writer} · {displayYear(title.year)} · {title.category}
              </p>
            </div>
            <div className="actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setEditing(title.id);
                  setForm({
                    work: title.work,
                    writer: title.writer,
                    category: title.category,
                    year: String(title.year),
                    note: title.note,
                    gutenbergId: title.gutenbergId ? String(title.gutenbergId) : "",
                  });
                }}
              >
                Edit
              </button>
              <button
                className="btn btn-text"
                type="button"
                onClick={() => {
                  if (!window.confirm(`Delete “${title.work}”?`)) return;
                  void deleteTitle(title.id)
                    .then(() => refresh())
                    .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Delete failed."));
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
