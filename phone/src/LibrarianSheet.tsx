import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { askLibrarian, confirmLibrarian, type PendingSave, type ReaderProfile } from "./api";
import { PrimaryButton, TextButton, colors, radius } from "./theme";

type Turn = { role: "reader" | "librarian"; text: string };

export function LibrarianSheet({
  open,
  onClose,
  reader,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  reader: ReaderProfile | null;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([
    { role: "librarian", text: "Ask about a title, compare two works, or ask me to save one to your shelf." },
  ]);
  const [pending, setPending] = useState<PendingSave | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function ask() {
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
    if (!pending || !reader) return;
    setBusy(true);
    try {
      const title = await confirmLibrarian(pending.token);
      setPending(null);
      onSaved();
      setNote(`${title.work} is on your shelf.`);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "The shelf was not changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.sheetHeader}>
            <Text style={styles.heading}>Librarian</Text>
            <TextButton label="Close" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={styles.thread}>
            {turns.map((turn, index) => (
              <Text key={`${turn.role}-${index}`} style={turn.role === "reader" ? styles.reader : styles.librarian}>
                {turn.text}
              </Text>
            ))}
            {pending ? (
              <View style={styles.confirm}>
                <Text style={styles.meta}>Waiting for confirmation</Text>
                <Text style={styles.work}>{pending.work}</Text>
                <Text>{pending.writer}</Text>
                <PrimaryButton label="Confirm" disabled={busy} onPress={() => void confirm()} />
                <TextButton label="Not now" disabled={busy} onPress={() => setPending(null)} />
              </View>
            ) : null}
            {note ? <Text style={styles.meta}>{note}</Text> : null}
          </ScrollView>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask the librarian"
            placeholderTextColor={colors.soft}
            multiline
          />
          <PrimaryButton label="Ask" disabled={busy || !draft.trim()} onPress={() => void ask()} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(30, 25, 20, 0.28)" },
  sheet: {
    maxHeight: "82%",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: 16,
    gap: 10,
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heading: { fontSize: 18, fontWeight: "600", color: colors.ink },
  thread: { gap: 8, paddingBottom: 8 },
  reader: { backgroundColor: "#efe6d6", borderRadius: radius.card, padding: 10, color: colors.ink },
  librarian: {
    backgroundColor: "#f7fbf8",
    borderColor: "#d5e6db",
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 10,
    color: colors.ink,
  },
  confirm: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.card, padding: 12, gap: 6 },
  work: { fontFamily: "serif", fontSize: 20, color: colors.ink },
  meta: { color: colors.soft },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    minHeight: 64,
    padding: 10,
    color: colors.ink,
    textAlignVertical: "top",
  },
});
