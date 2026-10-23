import { useState } from 'react';
import { View, Text, Platform, Dimensions, Share } from 'react-native';
import { CheckCircle2Icon, CircleIcon } from 'lucide-react-native';
import { PressableScale } from '../../global_components/PressableScale';
import * as Haptics from 'expo-haptics';

import { CustomButton } from '../../global_components/CustomButton';
import { UserData } from '../../../../core/UserData';
import { buildDiagnosticReport } from '../../../../utils/Diagnostic';
import { Logger } from '../../../../utils/Logger';
import { HapticsHandler } from '../../../../utils/HapticsHandler';


// Rapport de diagnostic : rien n'est envoyé automatiquement. Le rapport (anonymisé) est
// proposé au partage ou copié, pour le relire soi-même ou le donner à Claude.
function BugReportPopup({ windowDimensions, theme }) {
  const [selectedPossibleBug, setSelectedPossibleBug] = useState(0);
  const possibleBugs = [
    {
      'title': 'Problème de connexion',
      'subtitle': "L'application ne se connecte plus à mon compte",
      'code': 'Connection',
    },
    {
      'title': 'Notes non récupérées',
      'subtitle': "Mon compte se connecte mais mes notes n'apparaissent pas",
      'code': 'Marks',
    },
    {
      'title': 'Fausses moyennes / faux coefs',
      'subtitle': "Les 'devine coefficients' ne sont pas au top",
      'code': 'Coefficients & Averages',
    },
    {
      'title': 'Problème graphique',
      'subtitle': "J'ai des problèmes d'affichages sur mon écran",
      'code': 'Graphics',
    },
    {
      'title': 'Autre',
      'subtitle': `Problème plus dur à expliquer`,
      'code': 'Other',
    }
  ];

  const [status, setStatus] = useState("idle"); // idle | done | error

  async function shareBugReport() {
    const report = buildDiagnosticReport({
      category: possibleBugs[selectedPossibleBug].code,
      loginLogs: UserData.loginLogs,
      marksLogs: UserData.marksLogs,
    });
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(report);
      } else {
        await Share.share({ message: report });
      }
      Logger.info("Rapport de diagnostic préparé");
      setStatus("done");
    } catch (e) {
      setStatus("error");
    }
  }
  
  return (
    <View style={{
      backgroundColor: theme.colors.background,
    }}>
      <Text style={[theme.fonts.titleSmall, { marginBottom: 10 }]}>Quel type de bug est-ce ?</Text>
      {possibleBugs.map((bug, key) => <PressableScale onPress={() => {
        if (selectedPossibleBug != key) {
          setSelectedPossibleBug(key);
          HapticsHandler.vibrate(Haptics.ImpactFeedbackStyle.Light);
        }
        }} key={key} style={{
          paddingHorizontal: 10 - (selectedPossibleBug == key ? 1 : 0),
          paddingVertical: 5 - (selectedPossibleBug == key ? 1 : 0),
          backgroundColor: theme.colors.surface,
          marginTop: 10,
          borderRadius: 10,
          borderWidth:  selectedPossibleBug == key ? 1 : 0,
          borderColor: theme.colors.onSurfaceDisabled,
        }}>
          <Text style={[theme.fonts.bodyLarge, { width: Dimensions.get('window').width - 80 }]} numberOfLines={2}>{bug.title}</Text>
          <Text style={theme.fonts.labelMedium}>{bug.subtitle}</Text>
          <View style={{
            position: 'absolute',
            right: 5,
            top: 5,
          }}>
            {selectedPossibleBug == key ? <CheckCircle2Icon size={20 * windowDimensions.fontScale} color={theme.colors.onSurfaceDisabled}/> : <CircleIcon size={20 * windowDimensions.fontScale} color={theme.colors.onSurfaceDisabled}/>}
          </View>
        </PressableScale>
      )}

      <Text style={[theme.fonts.labelMedium, { marginTop: 20, textAlign: 'justify' }]}>
        Le rapport contient les dernières réponses d'ÉcoleDirecte, sans nom, identifiant, jeton ni coordonnées. Il n'est envoyé à personne : {Platform.OS === "web" ? "il est copié dans le presse-papiers" : "vous choisissez où le partager"}.
      </Text>
      <CustomButton
        title={status === "done" ? (Platform.OS === "web" ? "Rapport copié !" : "Rapport prêt !") : status === "error" ? "Impossible de préparer le rapport" : "Préparer le rapport"}
        onPress={shareBugReport}
        style={{
          backgroundColor: status === "error" ? theme.colors.tertiary : theme.colors.primary,
          marginTop: 10,
        }}
        theme={theme}
      />
    </View>
  );
}

export { BugReportPopup };