module.exports = {
  presets: [
    [
      require.resolve("@babel/preset-env"),
      {
        targets: { node: 8 },
      },
    ],
    require.resolve("@babel/preset-typescript"),
  ],
  plugins: [require.resolve("babel-plugin-macros")],
};
