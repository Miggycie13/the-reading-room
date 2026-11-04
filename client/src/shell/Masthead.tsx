import { NavLink } from "react-router-dom";
import { useRoom } from "../session";

export function Masthead() {
  const { reader, librarianOpen, setLibrarianOpen, signOut } = useRoom();

  return (
    <header className="masthead">
      <div>
        <p className="brand">The Reading Room</p>
        <p className="kicker">A public-domain catalog</p>
      </div>
      <nav className="nav">
        <NavLink to="/" end>
          Catalog
        </NavLink>
        <NavLink to="/shelf">Shelf</NavLink>
        <NavLink to="/marks">Bookmarks</NavLink>
        {reader?.role === "desk" ? <NavLink to="/desk">Desk</NavLink> : null}
        <button className="btn btn-text" type="button" onClick={() => setLibrarianOpen(!librarianOpen)}>
          {librarianOpen ? "Hide librarian" : "Librarian"}
        </button>
        {reader ? (
          <>
            <span className="who">{reader.name}</span>
            <button className="btn btn-text" type="button" onClick={() => void signOut()}>
              Log out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/enter">Sign in</NavLink>
            <NavLink to="/join">Register</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
