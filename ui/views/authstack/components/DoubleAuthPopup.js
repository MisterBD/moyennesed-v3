import axios from "axios";
import { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Text, View } from "react-native";
import { DefaultTheme } from "react-native-paper";
import { CheckCircleIcon, CircleIcon } from "lucide-react-native";
import { PressableScale } from "react-native-pressable-scale";
import { ScrollView } from "react-native-gesture-handler";

import { CustomButton } from "../../global_components/CustomButton";
import { UserData } from "../../../../core/UserData";
import { parseHtmlData } from "../../../../utils/Utils";
import { Logger } from "../../../../utils/Logger";
import AsyncStorage from "@react-native-async-storage/async-storage";


// Double auth popup
function DoubleAuthPopup({ closePopup }) {
  const [isLoading, setIsLoading] = useState(true);
  const [wrongChoice, setWrongChoice] = useState(false);

  const [content, setContent] = useState(null);
  const [choices, setChoices] = useState([]);
  const [rawchoices, setRawChoices] = useState([]);
  async function getContent() {
    var response = await axios.post(
      'https://api.ecoledirecte.com/v3/connexion/doubleauth.awp?verbe=get&v=4',
      'data={}',
      { headers: { "X-Token": UserData.token } },
    ).catch(error => {
      Logger.login(`An error occured while logging in : ${error}`, true);
    });
    
    switch (response.status) {
      case 200:
        Logger.login("API request successful");
        switch (response.data.code) {
          case 200:
            Logger.login("Got double auth content !");
            setContent(parseHtmlData(response.data.data.question))
            var tempPropositions = [];
            response.data.data.propositions.forEach(proposition => {
              tempPropositions.push(parseHtmlData(proposition));
            });
            setChoices(tempPropositions);
            setRawChoices(response.data.data.propositions);
            setIsLoading(false);
            break;
          default:
            Logger.login(`API responded with unknown code ${response.data.code}`, true);
            break;
        }
        break;
      default:
        Logger.login("API request failed", true);
        break;
    }
  }
  useEffect(() => { getContent(); }, []);

  const [selectedChoice, setSelectedChoice] = useState(0);
  async function confirmChoice() {
    if (wrongChoice) { return; }
    
    var response = await axios.post(
      'https://api.ecoledirecte.com/v3/connexion/doubleauth.awp?verbe=post&v=4',
      `data=${JSON.stringify({
        "choix": rawchoices[selectedChoice],
      })}`,
      { headers: { "X-Token": UserData.token } },
    ).catch(error => {
      Logger.login(`An error occured while logging in : ${error}`, true);
    });

    switch (response.status) {
      case 200:
        Logger.login("API request successful");
        switch (response.data.code) {
          case 200:
            Logger.login("Got double auth content !");
            const { cn, cv } = response.data.data;
            await AsyncStorage.setItem("loginIDs", JSON.stringify({
              cn,
              cv,
            }));
            const successful = await UserData.refreshLogin();
            if (successful) {
              Logger.login("Verification successful !");
              closePopup();
            }
            break;
          default:
            Logger.login('Wrong choice for confirmation, account blocked !');
            setWrongChoice(true);
            break;
        }
        break;
      default:
        Logger.login("API request failed", true);
        break;
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
      <CustomButton
        title={"Confirmer"}
        onPress={confirmChoice}
        willLoad={true}
        loadIcon={<ActivityIndicator size={25} color={DefaultTheme.colors.onPrimary}/>}
        theme={DefaultTheme}
        style={{
          position: 'absolute',
          bottom: 50,
          width: '100%',
        }}
      />
    </View>
  );
}

export default DoubleAuthPopup;