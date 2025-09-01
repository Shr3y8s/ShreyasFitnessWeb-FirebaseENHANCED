module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2018,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    "linebreak-style": "off", // Turn off linebreak style to support both Windows and Unix
    "max-len": ["error", {"code": 100}], // Increase line length limit
    "comma-dangle": ["error", "always-multiline"], // Require trailing commas in multiline
    "no-trailing-spaces": "error", // No trailing spaces
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
