module.exports = {
  env: {
    browser: true,
    es2022: true
  },
  globals: {
    process: "readonly"
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: "latest",
    sourceType: "module"
  }
};
