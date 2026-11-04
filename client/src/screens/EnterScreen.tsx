import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api";
import { useRoom } from "../session";

export function EnterScreen() {
  const navigate = useNavigate();
  const { signIn, reader } = useRoom();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (reader) navigate("/");
  }, [reader, navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await login({ email, password });
      signIn(result.token, result.reader);
      navigate("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Sign in</h2>
      <form className="form" onSubmit={(event) => void submit(event)}>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          Sign in
        </button>
        <Link className="btn btn-text" to="/join">
          Create an account
        </Link>
      </form>
    </section>
  );
}
