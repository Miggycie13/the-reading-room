import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { me, logout as logoutRequest, type ReaderProfile } from "./api";

type Room = {
  reader: ReaderProfile | null;
  sessionReady: boolean;
  librarianOpen: boolean;
  setLibrarianOpen: (open: boolean) => void;
  signIn: (token: string, reader: ReaderProfile) => void;
  signOut: () => Promise<void>;
  shelfVersion: number;
  bumpShelf: () => void;
};

const RoomContext = createContext<Room | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const [reader, setReader] = useState<ReaderProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [librarianOpen, setLibrarianOpen] = useState(false);
  const [shelfVersion, setShelfVersion] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("reading-room-token");
    if (!token) {
      setSessionReady(true);
      return;
    }
    me()
      .then(setReader)
      .catch(() => localStorage.removeItem("reading-room-token"))
      .finally(() => setSessionReady(true));
  }, []);

  const value = useMemo<Room>(
    () => ({
      reader,
      sessionReady,
      librarianOpen,
      setLibrarianOpen,
      signIn: (token, next) => {
        localStorage.setItem("reading-room-token", token);
        setReader(next);
      },
      signOut: async () => {
        try {
          await logoutRequest();
        } catch {
          localStorage.removeItem("reading-room-token");
        }
        localStorage.removeItem("reading-room-token");
        setReader(null);
      },
      shelfVersion,
      bumpShelf: () => setShelfVersion((current) => current + 1),
    }),
    [reader, sessionReady, librarianOpen, shelfVersion],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): Room {
  const value = useContext(RoomContext);
  if (!value) throw new Error("RoomProvider is missing.");
  return value;
}
