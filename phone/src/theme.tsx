import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

export const colors = {
  paper: "#f4efe4",
  card: "#fffaf3",
  ink: "#1e1914",
  soft: "#5c5348",
  line: "#ddd2c0",
  green: "#1b6b43",
  onGreen: "#f7fbf8",
};

export const radius = { control: 8, card: 12 };

export function PrimaryButton({ label, ...props }: PressableProps & { label: string }) {
  return (
    <Pressable {...props} style={[styles.base, styles.primary, props.disabled ? styles.disabled : null]}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, ...props }: PressableProps & { label: string }) {
  return (
    <Pressable {...props} style={[styles.base, styles.secondary, props.disabled ? styles.disabled : null]}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function TextButton({ label, ...props }: PressableProps & { label: string }) {
  return (
    <Pressable {...props} style={[styles.base, styles.text, props.disabled ? styles.disabled : null]}>
      <Text style={styles.textLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.control,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.green },
  primaryText: { color: colors.onGreen, fontWeight: "600" },
  secondary: { borderWidth: 1, borderColor: colors.ink, backgroundColor: "transparent" },
  secondaryText: { color: colors.ink, fontWeight: "600" },
  text: { backgroundColor: "transparent" },
  textLabel: { color: colors.green, fontWeight: "600" },
  disabled: { opacity: 0.45 },
});
