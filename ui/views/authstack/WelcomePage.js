import { useEffect, useRef } from "react";
import { View, Text, Dimensions, Platform } from "react-native";
import LottieView from '../global_components/LottieAnimation';


function WelcomePage({ pageStyle, theme }) {
  // Animation
  const animationRef = useRef(null);
  useEffect(() => {
    animationRef.current?.reset();
    setTimeout(() => {
      animationRef.current?.play();
    }, 100)
  }, []);
  
  return (
    <View style={pageStyle}>
      {/* Welcome text */}
      <Text style={[
        theme.fonts.titleLarge,
        { marginBottom: 10 }
      ]}>Bienvenue sur <Text style={theme.fonts.titleLarge}>Mes moyennes</Text></Text>
      <Text style={theme.fonts.labelLarge}>L'appli pour consulter vos moyennes facilement et rapidement</Text>
      <Text style={[theme.fonts.labelMedium, { marginTop: 10 }]}>Version personnelle et non officielle de MoyennesED (Diego Finocchiaro)</Text>
      {/* Animation */}
      <View style={{
        position: 'absolute',
        top: 180,
      }}>
        {Platform.OS != "web" && <LottieView
          ref={animationRef}
          source={require("../../../assets/lottie/welcome-animation.json")}
          style={{
            width: Dimensions.get('window').width,
            height: Dimensions.get('window').width,
          }}
        />}
      </View>
    </View>
  );
}

export { WelcomePage };