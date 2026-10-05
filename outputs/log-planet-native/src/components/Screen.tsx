import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";

type Props = PropsWithChildren<{
  eyebrow: string;
  title: string;
  lead?: string;
  dismissKeyboardOnTouchOutside?: boolean;
  bottomPadding?: number;
}>;

export function Screen({ children, dismissKeyboardOnTouchOutside = false, bottomPadding = 110 }: Props) {
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
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
