module.exports = {
  __experimentalThemes: ["gatsby-theme-sidebar"],
  plugins: [
    "gatsby-mdx",
    {
      resolve: "gatsby-plugin-typography",
      options: {
        pathToConfigModule: "src/typography"
      }
    },
    "gatsby-plugin-emotion",
    {
      resolve: "gatsby-plugin-google-analytics",
      options: {
        trackingId: "UA-140394521-1"
      }
    }
  ]
};
