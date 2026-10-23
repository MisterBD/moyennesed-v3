import { useEffect } from "react";
import useState from "react-usestateref";
import { StatusBar, Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useTheme } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { AuthStack } from "./ui/views/authstack/AuthStack";
import { AppStack } from "./ui/views/appstack/AppStack";
import { BottomSheet } from "./ui/views/global_components/BottomSheet";
import DoubleAuthPopup from "./ui/views/authstack/components/DoubleAuthPopup";
import { useFonts, refreshTheme } from "./ui/hooks/useStyles";
import { UserData } from "./core/UserData";
import { Preferences } from "./core/Preferences";
import { CoefficientManager } from "./core/CoefficientsManager";
import { AppContextProvider } from "./utils/AppContext";
import { Logger } from "./utils/Logger";
import { Storage, migrateLegacyPlainCredentials } from "./utils/Storage";


// Keep SplashScreen on while app is loading
SplashScreen.preventAutoHideAsync();

// Main App
function App() {
  // App state needed to show either AppStack or AuthStack
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  useEffect(() => { if (isAppLoaded) { SplashScreen.hideAsync(); } }, [isAppLoaded]);

  // Light/Dark mode
  const theme = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => { setIsDarkMode(Preferences.isDarkMode); }, [Preferences.isDarkMode]);
  refreshTheme(theme, isDarkMode);

  // Main initialize function
  useEffect(() => { initialize(); }, []);
  async function initialize() {
    try {
      // Load fonts
      await useFonts();

      // Ancienne version : identifiants en clair -> déplacés dans le stockage sécurisé
      await migrateLegacyPlainCredentials();

      // Identifiants enregistrés (stockage sécurisé) = compte déjà connecté
      if (await UserData.hasSavedCredentials()) {
        Logger.load("Compte déjà connecté, chargement du cache...");

        // Load all local files
        await Preferences.load();
        await CoefficientManager.load();
        await UserData.loadCache();
        setLoggedIn(true);

        setIsAppLoaded(true);
      } else {
        Logger.load("Aucun compte connecté");
        // Web : le mot de passe n'est gardé qu'en mémoire, il disparaît au rechargement de la page.
        // On repart alors de zéro pour ne pas garder de notes d'une session précédente.
        if (Platform.OS === "web") { await Storage.clear(); }
        setIsAppLoaded(true);
      }
    } catch (e) {
      Logger.load(`Erreur au démarrage : ${e?.message ?? "inconnue"}`, true);
      setIsAppLoaded(true);
    }
  }

  // Double auth popup
  const [isDoubleAuthPopupOpen, setIsDoubleAuthPopupOpen] = useState(false);
  function renderDoubleAuthPopup() {
    if (!isDoubleAuthPopupOpen) { return null; }
    return <BottomSheet
      key={'double-auth'}
      isOpen={isDoubleAuthPopupOpen}
      onClose={() => setIsDoubleAuthPopupOpen(false)}
      snapPoints={["100%"]}
      enablePanDownToClose={false}
      children={<DoubleAuthPopup closePopup={() => {
        setLoggedIn(true);
        setIsDoubleAuthPopupOpen(false);
      }} />}
      theme={theme}
    />;
  }

  // Don't load UI until app is loaded
  if (!isAppLoaded) { return null; }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Top status bar */}
      <StatusBar
        translucent={true}
        backgroundColor="transparent"
        barStyle={isDarkMode ? "light-content" : "dark-content"}
      />
      <BottomSheetModalProvider>
        {/* Update UI when logging-in/out */}
        <AppContextProvider state={{ loggedIn, setLoggedIn }}>
          {/* AuthStack / AppStack */}
          {loggedIn
            ? <AppStack setIsDarkMode={setIsDarkMode} isDoubleAuthPopupOpen={isDoubleAuthPopupOpen} openDoubleAuthPopup={() => setIsDoubleAuthPopupOpen(true)} theme={theme}/>
            : <AuthStack openDoubleAuthPopup={() => setIsDoubleAuthPopupOpen(true)} theme={theme}/>}
          
          {/* Double auth popup */}
          {renderDoubleAuthPopup()}
        </AppContextProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

export default App;