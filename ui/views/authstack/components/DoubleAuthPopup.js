import { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Text, View } from "react-native";
import { DefaultTheme } from "react-native-paper";
import { CheckCircleIcon, CircleIcon } from "lucide-react-native";
import { PressableScale } from '../../global_components/PressableScale';
import { ScrollView } from "react-native-gesture-handler";

import { CustomButton } from "../../global_components/CustomButton";
import { UserData } from "../../../../core/UserData";
import * as EcoleDirecteAPI from "../../../../core/EcoleDirecteAPI";
import { parseHtmlData } from "../../../../utils/Utils";
import { Logger } from "../../../../utils/Logger";


// Double auth popup
function DoubleAuthPopup({ closePopup }) {
  const [isLoading, setIsLoading] = useState(true);
  const [wrongChoice, setWrongChoice] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [content, setContent] = useState(null);
  const [choices, setChoices] = useState([]);
  const [rawchoices, setRawChoices] = useState([]);
  async function getContent() {
    const response = await EcoleDirecteAPI.getDoubleAuthQuestion();
    if (response.httpStatus === 200 && response.json?.code === 200) {
      Logger.login("Question de double authentification reçue");
      setContent(parseHtmlData(response.json.data.question));
      setChoices(response.json.data.propositions.map(proposition => parseHtmlData(proposition)));
      setRawChoices(response.json.data.propositions);
      setIsLoading(false);
    } else {
      Logger.login(`Question de double authentification indisponible (code ${response.json?.code ?? response.httpStatus})`, true);
      setErrorMessage("Impossible de récupérer la question de sécurité d'ÉcoleDirecte. Réessayez plus tard.");
    }
  }
  useEffect(() => { getContent(); }, []);

  const [selectedChoice, setSelectedChoice] = useState(0);
  async function confirmChoice() {
    if (wrongChoice || isLoading) { return; }

    const response = await EcoleDirecteAPI.postDoubleAuthAnswer(rawchoices[selectedChoice]);
    if (response.httpStatus === 200 && response.json?.code === 200) {
      Logger.login("Double authentification réussie");
      // Codes de confiance : rangés dans le stockage sécurisé, ils évitent la question la prochaine fois
      const { cn, cv } = response.json.data;
      await UserData.saveTrustedDevice(cn, cv);
      const successful = await UserData.refreshLogin();
      if (successful === 1) {
        closePopup();
      } else {
        setErrorMessage("Réponse acceptée, mais la reconnexion a échoué. Fermez puis rouvrez l'appli.");
      }
    } else if (response.httpStatus === 200) {
      Logger.login("Mauvaise réponse à la double authentification", true);
      setWrongChoice(true);
    } else {
      Logger.login(`Échec de l'envoi de la réponse (HTTP ${response.httpStatus})`, true);
      setErrorMessage("ÉcoleDirecte ne répond pas. Vérifiez la connexion et réessayez.");
    }
  }
  
  return (
    <View>
      <ScrollView style={{ height: Dimensions.get('window').height  }}>
        <Text style={[DefaultTheme.fonts.titleSmall, {
          marginBottom: 30,
          marginTop: 60,
        }]}>Double authentification</Text>
        {wrongChoice ? (
          <Text style={[DefaultTheme.fonts.bodyMedium, {
            color: 'red',
            textAlign: 'center',
          }]}>Mauvaise réponse, votre compte a été suspendu, un mail de récupération a été envoyé.</Text>
        ) : errorMessage ? (
          <Text style={[DefaultTheme.fonts.bodyMedium, {
            color: 'red',
            textAlign: 'center',
          }]}>{errorMessage}</Text>
        ) : content && choices.length != 0 ? (
          <>
            <Text style={[DefaultTheme.fonts.bodyMedium, {
              marginBottom: 20,
            }]}>{content}</Text>
            {choices.map((item, index) => (
              <PressableScale key={index} style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
                borderWidth: 2,
                borderRadius: 10,
                borderColor: index == selectedChoice ? DefaultTheme.colors.primary : DefaultTheme.colors.surface,
                paddingHorizontal: 15,
                paddingVertical: 10,
              }} onPress={() => setSelectedChoice(index)}>
                {index == selectedChoice ? (
                  <CheckCircleIcon size={30} color={DefaultTheme.colors.primary}/>
                ) : (
                  <CircleIcon size={30} color={DefaultTheme.colors.onSurfaceDisabled} />
                )}
                <Text style={[DefaultTheme.fonts.bodyMedium, {
                  marginLeft: 10,
                }]}>{item}</Text>
              </PressableScale>
            ))}
            <View style={{ height: 150 }} />
          </>
        ) : (
          <ActivityIndicator size={25} color={DefaultTheme.colors.onSurfaceDisabled}/>
        )}
      </ScrollView>
      <View style={{
        position: 'absolute',
        bottom: 70,
        width: '100%',
      }}>
        <CustomButton
          title={"Confirmer"}
          onPress={() => confirmChoice()}
          willLoad={true}
          loadIcon={<ActivityIndicator size={25} color={DefaultTheme.colors.onPrimary}/>}
          theme={DefaultTheme}
        />
      </View>
    </View>
  );
}

export default DoubleAuthPopup;