module.exports = function(api) {
  api.cache(true);
  return {
    // babel-preset-expo ajoute tout seul le plugin de react-native-reanimated / worklets
    presets: ['babel-preset-expo'],
  };
};
