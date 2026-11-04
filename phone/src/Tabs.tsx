import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createTitle,
  deskSummary,
  displayYear,
  getBookmarks,
  getCategories,
  getShelf,
  getTitles,
  login,
  logout,
  me,
  register,
  removeBookmark,
  removeFromShelf,
  saveBase,
  saveToken,
  DEFAULT_BASE,
  getBase,
  type ReaderProfile,
  type TitleRecord,
} from "./api";
import { PrimaryButton, SecondaryButton, TextButton, colors, radius } from "./theme";

const UNREACHABLE = "The reading room could not be reached on port 4100.";

type TabName = "catalog" | "shelf" | "marks" | "account";

export function Tabs({
  tab,
  onTab,
  onOpen,
  onLibrarian,
  reader,
  onReader,
  shelfVersion,
  topInset,
}: {
  tab: TabName;
  onTab: (tab: TabName) => void;
  onOpen: (id: string) => void;
  onLibrarian: () => void;
  reader: ReaderProfile | null;
  onReader: (reader: ReaderProfile | null) => void;
  shelfVersion: number;
  topInset: number;
}) {
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: topInset }]}>
        <Text style={styles.brand}>The Reading Room</Text>
        <TextButton label="Librarian" onPress={onLibrarian} />
      </View>
      <View style={styles.body}>
        {tab === "catalog" ? <CatalogPane onOpen={onOpen} /> : null}
        {tab === "shelf" ? <ShelfPane reader={reader} onOpen={onOpen} shelfVersion={shelfVersion} /> : null}
        {tab === "marks" ? <MarksPane reader={reader} onOpen={onOpen} shelfVersion={shelfVersion} /> : null}
        {tab === "account" ? <AccountPane reader={reader} onReader={onReader} /> : null}
      </View>
      <View style={styles.tabs}>
        {(
          [
            ["catalog", "Catalog"],
            ["shelf", "Shelf"],
            ["marks", "Marks"],
            ["account", "Account"],
          ] as const
        ).map(([name, label]) => (
          <Pressable key={name} onPress={() => onTab(name)} style={styles.tab}>
            <Text style={name === tab ? styles.tabOn : styles.tabOff}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CatalogPane({ onOpen }: { onOpen: (id: string) => void }) {
  const [draft, setDraft] = useState({ title: "", author: "", category: "" });
  const [query, setQuery] = useState(draft);
  const [titles, setTitles] = useState<TitleRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [problem, setProblem] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
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
        timer = setTimeout(pull, 4000);
      }
    };
    void pull();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [query]);

  return (
    <View style={styles.fill}>
      <View style={styles.filters}>
        <TextInput style={styles.input} placeholder="Title" placeholderTextColor={colors.soft} value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} />
        <TextInput style={styles.input} placeholder="Author" placeholderTextColor={colors.soft} value={draft.author} onChangeText={(author) => setDraft({ ...draft, author })} />
        <TextInput style={styles.input} placeholder="Category" placeholderTextColor={colors.soft} value={draft.category} onChangeText={(category) => setDraft({ ...draft, category })} />
        <View style={styles.row}>
          <SecondaryButton label="Search" onPress={() => setQuery(draft)} />
          <TextButton
            label="Clear"
            onPress={() => {
              const empty = { title: "", author: "", category: "" };
              setDraft(empty);
              setQuery(empty);
            }}
          />
        </View>
        {categories.length ? <Text style={styles.meta}>Sections: {categories.join(", ")}</Text> : null}
      </View>
      {problem ? <Text style={styles.banner}>{UNREACHABLE}</Text> : null}
      {!loaded && !problem ? <Text style={styles.meta}>Opening the shelves…</Text> : null}
      {loaded && !problem && titles.length === 0 ? <Text style={styles.meta}>No titles match.</Text> : null}
      <FlatList
        data={titles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpen(item.id)} style={styles.card}>
            <Text style={styles.meta}>
              {item.category} · {displayYear(item.year)}
            </Text>
            <Text style={styles.work}>{item.work}</Text>
            <Text style={styles.writer}>{item.writer}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function ShelfPane({
  reader,
  onOpen,
  shelfVersion,
}: {
  reader: ReaderProfile | null;
  onOpen: (id: string) => void;
  shelfVersion: number;
}) {
  const [titles, setTitles] = useState<TitleRecord[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reader) return;
    let cancelled = false;
    getShelf()
      .then((rows) => {
        if (!cancelled) setTitles(rows);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "The shelf could not be opened.");
      });
    return () => {
      cancelled = true;
    };
  }, [reader, shelfVersion]);

  if (!reader) return <Text style={styles.meta}>Sign in on the Account tab to see your shelf.</Text>;
  return (
    <View style={styles.fill}>
      {message ? <Text style={styles.banner}>{message}</Text> : null}
      {titles.length === 0 ? <Text style={styles.meta}>Nothing is on your shelf yet.</Text> : null}
      <FlatList
        data={titles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => onOpen(item.id)}>
              <Text style={styles.work}>{item.work}</Text>
              <Text style={styles.writer}>{item.writer}</Text>
            </Pressable>
            <TextButton
              label="Remove"
              onPress={() => {
                void removeFromShelf(item.id).then(() => setTitles((current) => current.filter((row) => row.id !== item.id)));
              }}
            />
          </View>
        )}
      />
    </View>
  );
}

function MarksPane({
  reader,
  onOpen,
  shelfVersion,
}: {
  reader: ReaderProfile | null;
  onOpen: (id: string) => void;
  shelfVersion: number;
}) {
  const [titles, setTitles] = useState<TitleRecord[]>([]);

  useEffect(() => {
    if (!reader) return;
    let cancelled = false;
    getBookmarks()
      .then((rows) => {
        if (!cancelled) setTitles(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reader, shelfVersion]);

  if (!reader) return <Text style={styles.meta}>Sign in on the Account tab to see bookmarks.</Text>;
  return (
    <View style={styles.fill}>
      {titles.length === 0 ? <Text style={styles.meta}>No bookmarks yet.</Text> : null}
      <FlatList
        data={titles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => onOpen(item.id)}>
              <Text style={styles.work}>{item.work}</Text>
              <Text style={styles.writer}>{item.writer}</Text>
            </Pressable>
            <TextButton
              label="Remove"
              onPress={() => {
                void removeBookmark(item.id).then(() => setTitles((current) => current.filter((row) => row.id !== item.id)));
              }}
            />
          </View>
        )}
      />
    </View>
  );
}

function AccountPane({
  reader,
  onReader,
}: {
  reader: ReaderProfile | null;
  onReader: (reader: ReaderProfile | null) => void;
}) {
  const [base, setBase] = useState(getBase());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [counts, setCounts] = useState("");
  const [work, setWork] = useState("");
  const [writer, setWriter] = useState("");
  const [category, setCategory] = useState("Essays");
  const [year, setYear] = useState("1900");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (reader?.role !== "desk") return;
    deskSummary()
      .then((summary) => setCounts(`${summary.books} books · ${summary.accounts} accounts · ${summary.downloads} downloads`))
      .catch(() => undefined);
  }, [reader]);

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Text style={styles.writer}>API address</Text>
      <TextInput style={styles.input} value={base} onChangeText={setBase} autoCapitalize="none" autoCorrect={false} />
      <SecondaryButton
        label="Save address"
        onPress={() => {
          void saveBase(base).then(() => setMessage(`Using ${getBase()}`));
        }}
      />
      <Text style={styles.meta}>The emulator default is {DEFAULT_BASE}.</Text>
      {message ? <Text style={styles.banner}>{message}</Text> : null}
      {reader ? (
        <View style={styles.card}>
          <Text style={styles.work}>{reader.name}</Text>
          <Text style={styles.writer}>{reader.email}</Text>
          <Text style={styles.meta}>{reader.role === "desk" ? "Desk" : "Reader"}</Text>
          <TextButton
            label="Log out"
            onPress={() => {
              void logout()
                .catch(() => undefined)
                .finally(() => {
                  void saveToken(null);
                  onReader(null);
                });
            }}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.soft} value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.soft} autoCapitalize="none" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.soft} secureTextEntry value={password} onChangeText={setPassword} />
          <PrimaryButton
            label="Sign in"
            onPress={() => {
              void login(email, password)
                .then(async (result) => {
                  await saveToken(result.token);
                  onReader(result.reader);
                  setMessage("");
                })
                .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Sign-in failed."));
            }}
          />
          <SecondaryButton
            label="Register"
            onPress={() => {
              void register(name, email, password)
                .then(async (result) => {
                  await saveToken(result.token);
                  onReader(result.reader);
                })
                .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Registration failed."));
            }}
          />
        </View>
      )}
      {reader?.role === "desk" ? (
        <View style={styles.card}>
          <Text style={styles.work}>Desk</Text>
          {counts ? <Text style={styles.meta}>{counts}</Text> : null}
          <TextInput style={styles.input} placeholder="Title" placeholderTextColor={colors.soft} value={work} onChangeText={setWork} />
          <TextInput style={styles.input} placeholder="Author" placeholderTextColor={colors.soft} value={writer} onChangeText={setWriter} />
          <TextInput style={styles.input} placeholder="Category" placeholderTextColor={colors.soft} value={category} onChangeText={setCategory} />
          <TextInput style={styles.input} placeholder="Year" placeholderTextColor={colors.soft} value={year} onChangeText={setYear} />
          <TextInput style={styles.input} placeholder="Bibliographic note" placeholderTextColor={colors.soft} value={note} onChangeText={setNote} />
          <PrimaryButton
            label="Add title"
            onPress={() => {
              void createTitle({
                work: work.trim(),
                writer: writer.trim(),
                category: category.trim(),
                year: Number(year),
                note: note.trim(),
                gutenbergId: null,
              })
                .then(() => {
                  setWork("");
                  setWriter("");
                  setNote("");
                  setMessage("Title added.");
                  return me();
                })
                .then(() => deskSummary())
                .then((summary) => setCounts(`${summary.books} books · ${summary.accounts} accounts · ${summary.downloads} downloads`))
                .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "The title was not added."));
            }}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  fill: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.green,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { fontFamily: "serif", fontSize: 22, color: colors.ink },
  body: { flex: 1 },
  tabs: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabOn: { color: colors.green, fontWeight: "600" },
  tabOff: { color: colors.soft },
  filters: { padding: 12, gap: 8 },
  list: { padding: 12, gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 14,
    gap: 6,
  },
  work: { fontFamily: "serif", fontSize: 20, color: colors.ink },
  writer: { color: colors.ink },
  meta: { color: colors.soft },
  banner: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#f6e7c8",
    borderColor: "#e4d0a4",
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 12,
    color: colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: radius.control,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.ink,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
