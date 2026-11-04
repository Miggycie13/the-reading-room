import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  addBookmark,
  addToShelf,
  displayYear,
  downloadCard,
  getTitle,
  removeBookmark,
  removeFromShelf,
  type ReaderProfile,
  type TitleRecord,
} from "./api";
import { PrimaryButton, SecondaryButton, TextButton, colors, radius } from "./theme";

export function BookScreen({
  id,
  reader,
  onBack,
  onLibrarian,
  onChanged,
  topInset,
}: {
  id: string;
  reader: ReaderProfile | null;
  onBack: () => void;
  onLibrarian: () => void;
  onChanged: () => void;
  topInset: number;
}) {
  const [title, setTitle] = useState<TitleRecord | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTitle(id)
      .then((next) => {
        if (!cancelled) setTitle(next);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "That record could not be opened.");
      });
    return () => {
      cancelled = true;
    };
  }, [id, reader?.id]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      onChanged();
      setTitle(await getTitle(id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request did not finish.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: topInset }]}>
        <TextButton label="Back" onPress={onBack} />
        <TextButton label="Librarian" onPress={onLibrarian} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {message ? <Text style={styles.banner}>{message}</Text> : null}
        {title ? (
          <View style={styles.card}>
            <Text style={styles.meta}>
              {title.category} · {displayYear(title.year)}
            </Text>
            <Text style={styles.work}>{title.work}</Text>
            <Text style={styles.writer}>{title.writer}</Text>
            <Text style={styles.note}>{title.note}</Text>
            {title.gutenbergUrl ? <Text style={styles.link}>{title.gutenbergUrl}</Text> : null}
            <PrimaryButton label="Download bibliographic card" disabled={busy} onPress={() => void run(() => downloadCard(title))} />
            {reader ? (
              <>
                <SecondaryButton
                  label={title.onShelf ? "Remove from shelf" : "Save to shelf"}
                  disabled={busy}
                  onPress={() => void run(() => (title.onShelf ? removeFromShelf(title.id) : addToShelf(title.id)))}
                />
                <TextButton
                  label={title.bookmarked ? "Remove bookmark" : "Bookmark"}
                  disabled={busy}
                  onPress={() => void run(() => (title.bookmarked ? removeBookmark(title.id) : addBookmark(title.id)))}
                />
              </>
            ) : (
              <Text style={styles.meta}>Sign in on the Account tab to keep a shelf.</Text>
            )}
          </View>
        ) : (
          <Text style={styles.meta}>Opening the record…</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  body: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 16,
    gap: 10,
  },
  meta: { color: colors.soft },
  work: { fontFamily: "serif", fontSize: 28, color: colors.ink },
  writer: { color: colors.ink, fontSize: 16 },
  note: { color: colors.ink },
  link: { color: colors.green },
  banner: {
    backgroundColor: "#f6e7c8",
    borderColor: "#e4d0a4",
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 12,
    color: colors.ink,
  },
});
