import { View, Text, ScrollView } from "react-native";

import { InfoCard } from './components/InfoCard';


function FeaturesPage({ pageStyle, windowDimensions, theme }) {
  return (
    <View style={pageStyle}>
      {/* Title */}
      <Text style={[
        theme.fonts.titleMedium,
        { marginBottom: 10 }
      ]}>Une appli simple, épurée, efficace</Text>
      <Text style={[
        theme.fonts.labelLarge,
        { marginBottom: 30 }
      ]}>À la fois pour les élèves, mais aussi pour les parents !</Text>

      {/* Features */}
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <InfoCard
          title="🚀 L'ajout parfait à ÉcoleDirecte"
          description="Retrouvez votre moyenne générale et vos moyennes par matière, parfois cachées sur ÉcoleDirecte !"
          theme={theme}
          style={{ marginBottom: 20 }}
          windowDimensions={windowDimensions}
        />
        <InfoCard
          title="🧠 Des fonctionnalités uniques"
          description="Profitez des fonctionnalités uniques comme le 'devine coefficient notes', pour approximer encore mieux vos moyennes."
          theme={theme}
          style={{ marginBottom: 20 }}
          windowDimensions={windowDimensions}
        />
        <InfoCard
          title="🔒 Vos identifiants restent chez vous"
          description="Ils ne sont envoyés qu'à ÉcoleDirecte (sur le web, via votre propre relais Vercel). Sur téléphone, le mot de passe est rangé dans le coffre sécurisé de l'appareil."
          theme={theme}
          style={{ marginBottom: 20 }}
          windowDimensions={windowDimensions}
        />
        <InfoCard
          title="🛠️ Une version à vous"
          description="Appli non officielle, à modifier librement pour un usage personnel, par exemple avec Claude."
          theme={theme}
          windowDimensions={windowDimensions}
        />
        <View style={{ height: 100 }}/>
      </ScrollView>
    </View>
  );
}

export { FeaturesPage };