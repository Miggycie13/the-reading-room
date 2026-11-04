import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api";
import { useRoom } from "../session";

export function JoinScreen() {
  const navigate = useNavigate();
  const { signIn } = useRoom();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await register({ name, email, password });
      signIn(result.token, result.reader);
      navigate("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Register</h2>
      <form className="form" onSubmit={(event) => void submit(event)}>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          Create account
        </button>
        <Link className="btn btn-text" to="/enter">
          Already registered? Sign in
        </Link>
      </form>
    </section>
  );
}
