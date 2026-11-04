import { useEffect, useState } from "react";
import { Platform, StatusBar as NativeStatusBar, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { hasStoredToken, loadStoredSession, me, saveToken, type ReaderProfile } from "./src/api";
import { BookScreen } from "./src/BookScreen";
import { LibrarianSheet } from "./src/LibrarianSheet";
import { Tabs } from "./src/Tabs";
import { colors } from "./src/theme";

type TabName = "catalog" | "shelf" | "marks" | "account";

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabName>("catalog");
  const [bookId, setBookId] = useState<string | null>(null);
  const [librarianOpen, setLibrarianOpen] = useState(false);
  const [reader, setReader] = useState<ReaderProfile | null>(null);
  const [shelfVersion, setShelfVersion] = useState(0);
  const topInset = (Platform.OS === "android" ? NativeStatusBar.currentHeight : 20) ?? 24;

  useEffect(() => {
    void loadStoredSession()
      .then(() => (hasStoredToken() ? me() : null))
      .then((profile) => {
        if (profile) setReader(profile);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message === "Sign in to continue.") return saveToken(null);
        return undefined;
      })
      .finally(() => setReady(true));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <StatusBar style="dark" />
      {ready ? (
        bookId ? (
          <BookScreen
            id={bookId}
            reader={reader}
            topInset={topInset}
            onBack={() => setBookId(null)}
            onLibrarian={() => setLibrarianOpen(true)}
            onChanged={() => setShelfVersion((current) => current + 1)}
          />
        ) : (
          <Tabs
            tab={tab}
            onTab={setTab}
            onOpen={setBookId}
            onLibrarian={() => setLibrarianOpen(true)}
            reader={reader}
            onReader={setReader}
            shelfVersion={shelfVersion}
            topInset={topInset}
          />
        )
      ) : null}
      <LibrarianSheet
        open={librarianOpen}
        onClose={() => setLibrarianOpen(false)}
        reader={reader}
        onSaved={() => setShelfVersion((current) => current + 1)}
      />
    </View>
  );
}
