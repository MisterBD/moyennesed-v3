// Deux rangements distincts :
// - Storage : données ordinaires (notes en cache, coefficients, préférences).
//   Téléphone : AsyncStorage. Web : sessionStorage (effacé à la fermeture de l'onglet).
// - SecretStorage : identifiants et codes de confiance de la double authentification.
//   Téléphone : expo-secure-store (trousseau iOS / Keystore Android, chiffré).
//   Web : mémoire de la page uniquement, rien n'est écrit dans le navigateur.
// Règle : un mot de passe ne passe JAMAIS par Storage, ni par les journaux.
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const isWeb = Platform.OS === "web";

function sessionStore() {
  try { return typeof window !== "undefined" ? window.sessionStorage : null; }
  catch (e) { return null; }
}

export const Storage = {
  async getItem(key) {
    if (isWeb) { return sessionStore()?.getItem(key) ?? null; }
    return AsyncStorage.getItem(key);
  },
  async setItem(key, value) {
    if (isWeb) { sessionStore()?.setItem(key, value); return; }
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (isWeb) { sessionStore()?.removeItem(key); return; }
    await AsyncStorage.removeItem(key);
  },
  async clear() {
    if (isWeb) { sessionStore()?.clear(); return; }
    await AsyncStorage.clear();
  },
};

// Clés autorisées par SecureStore : lettres, chiffres, « . », « - », « _ ».
export const SECRET_KEYS = {
  credentials: "moyennes.credentials",
  trustedDevice: "moyennes.trusted-device",
};

const memorySecrets = new Map();

export const SecretStorage = {
  async getItem(key) {
    if (isWeb) { return memorySecrets.get(key) ?? null; }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    if (isWeb) { memorySecrets.set(key, value); return; }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key) {
    if (isWeb) { memorySecrets.delete(key); return; }
    await SecureStore.deleteItemAsync(key);
  },
  async clear() {
    for (const key of Object.values(SECRET_KEYS)) { await this.removeItem(key); }
  },
};

// Anciennes versions de l'appli : identifiants rangés en clair dans AsyncStorage.
// On les déplace dans le stockage sécurisé puis on efface la copie en clair.
export async function migrateLegacyPlainCredentials() {
  if (isWeb) { return; }
  const legacy = [["credentials", SECRET_KEYS.credentials], ["loginIDs", SECRET_KEYS.trustedDevice]];
  for (const [oldKey, newKey] of legacy) {
    const value = await AsyncStorage.getItem(oldKey);
    if (value) {
      if (!(await SecureStore.getItemAsync(newKey))) { await SecureStore.setItemAsync(newKey, value); }
      await AsyncStorage.removeItem(oldKey);
    }
  }
}
