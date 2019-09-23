module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: { node: 8 }
      }
    ],
    require.resolve("@babel/preset-typescript")
  ],
  plugins: ["@babel/plugin-proposal-class-properties"]
};
