// Correct babel.config.js structure (example with NativeWind and Reanimated)
module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ['babel-preset-expo', { jsxImportSource: 'nativewind' }], // Use NativeWind as a preset
            'nativewind/babel' // is sometimes recommended here too, depending on versions
        ],
        plugins: [
            'react-native-reanimated/plugin', // Must be the last entry
        ],
    };
};
