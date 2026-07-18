import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";

type Props = PropsWithChildren<{
  eyebrow: string;
  title: string;
  lead?: string;
  dismissKeyboardOnTouchOutside?: boolean;
}>;

export function Screen({ children, dismissKeyboardOnTouchOutside = false }: Props) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps={dismissKeyboardOnTouchOutside ? "handled" : "always"}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 110,
    gap: 16
  }
});
