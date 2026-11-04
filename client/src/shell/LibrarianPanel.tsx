import { useState, type FormEvent } from "react";
import { askLibrarian, confirmLibrarian, type PendingSave } from "../api";
import { useRoom } from "../session";

type Turn = { role: "reader" | "librarian"; text: string };

export function LibrarianPanel() {
  const { bumpShelf } = useRoom();
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "librarian",
      text: "Ask about a title, compare two works, or ask me to save one to your shelf.",
    },
  ]);
  const [pending, setPending] = useState<PendingSave | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function ask(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setNote("");
    setTurns((current) => [...current, { role: "reader", text: message }]);
    setBusy(true);
    try {
      const result = await askLibrarian(message);
      setTurns((current) => [...current, { role: "librarian", text: result.reply }]);
      setPending(result.pending);
    } catch (error) {
      setTurns((current) => [
        ...current,
        { role: "librarian", text: error instanceof Error ? error.message : "I could not reach the catalog." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    setNote("");
    try {
      const title = await confirmLibrarian(pending.token);
      setPending(null);
      bumpShelf();
      setNote(`“${title.work}” is on your shelf.`);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "The shelf was not changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="panel" aria-label="Librarian">
      <h2>Librarian</h2>
      <div className="thread">
        {turns.map((turn, index) => (
          <p className={`bubble ${turn.role}`} key={`${turn.role}-${index}`}>
            {turn.text}
          </p>
        ))}
      </div>
      {pending ? (
        <div className="confirm-box">
          <p className="eyebrow">Waiting for confirmation</p>
          <p className="work-title">{pending.work}</p>
          <p className="writer">{pending.writer}</p>
          <div className="actions">
            <button className="btn btn-primary" type="button" onClick={() => void confirm()} disabled={busy}>
              Confirm
            </button>
            <button className="btn btn-text" type="button" onClick={() => setPending(null)} disabled={busy}>
              Not now
            </button>
          </div>
        </div>
      ) : null}
      {note ? <p className="note">{note}</p> : null}
      <form className="ask" onSubmit={(event) => void ask(event)}>
        <label>
          Question
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} />
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy || !draft.trim()}>
          Ask
        </button>
      </form>
    </aside>
  );
}
