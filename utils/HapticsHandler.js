import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

import { Preferences } from "../core/Preferences";


export class HapticsHandler {
  static vibrate(impactWeight) {
    // Pas de vibrations dans un navigateur
    if (Preferences.vibrate && Platform.OS !== "web") {
      Haptics.impactAsync(impactWeight).catch(() => {});
    }
  }
}
