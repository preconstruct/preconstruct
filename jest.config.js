module.exports = {
  snapshotFormat: {
    // preserve input order of the keys since it's important for `package.json#exports`
    compareKeys: () => 0,
  },
  reporters: ["default", "jest-junit"],
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname",
  ],
};
