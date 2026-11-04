import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories, getTitles, type TitleRecord } from "../api";
import { CatalogCard } from "../shell/CatalogCard";

const UNREACHABLE = "The reading room could not be reached on port 4100.";

export function CatalogScreen() {
  const [draft, setDraft] = useState({ title: "", author: "", category: "" });
  const [query, setQuery] = useState(draft);
  const [titles, setTitles] = useState<TitleRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [problem, setProblem] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const pull = async () => {
      try {
        const next = await getTitles(query);
        if (cancelled) return;
        setTitles(next);
        setProblem(false);
        setLoaded(true);
        getCategories()
          .then((rows) => {
            if (!cancelled) setCategories(rows);
          })
          .catch(() => undefined);
      } catch {
        if (cancelled) return;
        setProblem(true);
        timer = window.setTimeout(pull, 4000);
      }
    };

    void pull();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <section>
      <h2>Catalog</h2>
      <p className="lede">Search by title, writer, or section. Each record opens onto a bibliographic card, not the book text.</p>
      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(draft);
        }}
      >
        <label>
          Title
          <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        </label>
        <label>
          Author
          <input value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} />
        </label>
        <label>
          Category
          <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
            <option value="">Any section</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-secondary" type="submit">
          Search
        </button>
        <button
          className="btn btn-text"
          type="button"
          onClick={() => {
            const empty = { title: "", author: "", category: "" };
            setDraft(empty);
            setQuery(empty);
          }}
        >
          Clear
        </button>
      </form>
      {problem ? (
        <p className="banner" role="status">
          {UNREACHABLE}
        </p>
      ) : null}
      {!loaded && !problem ? <p className="notice">Opening the shelves…</p> : null}
      {loaded && !problem && titles.length === 0 ? <p className="notice">No titles match.</p> : null}
      <div className="stack">
        {titles.map((title) => (
          <CatalogCard
            key={title.id}
            title={title}
            action={
              <Link className="btn btn-text" to={`/titles/${title.id}`}>
                Open record
              </Link>
            }
          />
        ))}
      </div>
    </section>
  );
}
