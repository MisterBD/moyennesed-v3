// Bouton qui rétrécit légèrement quand on appuie dessus.
// Remplace la bibliothèque react-native-pressable-scale (plus maintenue depuis 2021 et en partie
// incompatible avec Reanimated 4) : uniquement des composants React Native de base, marche aussi sur le web.
import { useRef } from "react";
import { Animated, Pressable } from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PressableScale({ children, style, onPress, activeScale = 0.95, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(value) {
    Animated.spring(scale, { toValue: value, useNativeDriver: false, speed: 40, bounciness: 6 }).start();
  }

  return (
    <AnimatedPressable
      {...props}
      onPress={onPress}
      onPressIn={() => animateTo(activeScale)}
      onPressOut={() => animateTo(1)}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

export { PressableScale };
