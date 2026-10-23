// Version web du panneau qui monte du bas de l'écran.
// Sur téléphone, BottomSheet.js utilise @gorhom/bottom-sheet (glisser pour fermer).
// Dans un navigateur cette bibliothèque ne s'anime pas correctement : on utilise ici le Modal
// de React Native, plus simple. Metro choisit ce fichier automatiquement pour le web.
import { Modal, View, Pressable, Dimensions, StyleSheet } from "react-native";


// « 80% » -> 80 % de la hauteur de la fenêtre ; 300 -> 300 pixels
function toPixels(snapPoint, windowHeight) {
  if (typeof snapPoint === "number") { return snapPoint; }
  const value = parseFloat(snapPoint);
  if (isNaN(value)) { return windowHeight * 0.5; }
  return String(snapPoint).trim().endsWith("%") ? (value / 100) * windowHeight : value;
}

function BottomSheet({ isOpen, onClose, children, backgroundStyle, snapPoints, theme, padding=20, enablePanDownToClose=true }) {
  const windowHeight = Dimensions.get("window").height;
  // Pas de glisser à la souris : on ouvre directement à la plus grande hauteur prévue
  const height = Math.min(windowHeight, Math.max(...(snapPoints ?? ["50%"]).map((point) => toPixels(point, windowHeight))));
  const close = () => { if (enablePanDownToClose) { onClose(); } };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { height, backgroundColor: theme.colors.background }, backgroundStyle]}>
          {enablePanDownToClose ? (
            <Pressable onPress={close} style={styles.handleZone} accessibilityLabel="Fermer">
              <View style={[styles.handle, { backgroundColor: theme.colors.onBackground }]} />
            </Pressable>
          ) : <View style={styles.handleZone} />}
          <View style={{ flex: 1, paddingHorizontal: padding, backgroundColor: theme.colors.background }}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.5)" },
  sheet: { width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  handleZone: { alignItems: "center", paddingVertical: 10 },
  handle: { width: 40, height: 5, borderRadius: 3 },
});

export { BottomSheet };
