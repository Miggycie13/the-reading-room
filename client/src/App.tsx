import { Route, Routes } from "react-router-dom";
import { Masthead } from "./shell/Masthead";
import { LibrarianPanel } from "./shell/LibrarianPanel";
import { useRoom } from "./session";
import { CatalogScreen } from "./screens/CatalogScreen";
import { TitleScreen } from "./screens/TitleScreen";
import { EnterScreen } from "./screens/EnterScreen";
import { JoinScreen } from "./screens/JoinScreen";
import { ShelfScreen } from "./screens/ShelfScreen";
import { MarksScreen } from "./screens/MarksScreen";
import { DeskScreen } from "./screens/DeskScreen";

export function App() {
  const { librarianOpen } = useRoom();

  return (
    <div className="page">
      <Masthead />
      <div className={librarianOpen ? "workspace with-librarian" : "workspace"}>
        <main className="stage">
          <Routes>
            <Route path="/" element={<CatalogScreen />} />
            <Route path="/titles/:id" element={<TitleScreen />} />
            <Route path="/enter" element={<EnterScreen />} />
            <Route path="/join" element={<JoinScreen />} />
            <Route path="/shelf" element={<ShelfScreen />} />
            <Route path="/marks" element={<MarksScreen />} />
            <Route path="/desk" element={<DeskScreen />} />
          </Routes>
        </main>
        {librarianOpen ? <LibrarianPanel /> : null}
      </div>
    </div>
  );
}
