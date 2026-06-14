module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["**/*.js", "!tests/**", "!node_modules/**"],
  setupFiles: ["dotenv/config"],
  transformIgnorePatterns: ["node_modules/(?!(uuid)/)"],
  transform: {
    "^.+\\.js$": "babel-jest",
  },
};
