module.exports = {
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  overrides: [
    {
      files: ["**/*.ts?(x)"],
      rules: {
        "@typescript-eslint/no-non-null-assertion": "error",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-unnecessary-type-assertion": "error",
        "@typescript-eslint/consistent-type-assertions": [
          "error",
          { assertionStyle: "as", objectLiteralTypeAssertions: "never" },
        ],
        "import/order": [
          "error",
          {
            alphabetize: {
              order: "asc",
              caseInsensitive: true,
            },
            groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
            "newlines-between": "always",
            pathGroups: [
              {
                group: "internal",
                pattern: "assets/**",
              },
              {
                group: "internal",
                pattern: "components/**",
              },
              {
                group: "internal",
                pattern: "context",
              },
              {
                group: "internal",
                pattern: "config/**",
              },
              {
                group: "internal",
                pattern: "contracts/**",
              },
              {
                group: "internal",
                pattern: "services/**",
              },
              {
                group: "internal",
                pattern: "sharedTypes/**",
              },
              {
                group: "internal",
                pattern: "views/**",
              },
            ],
            pathGroupsExcludedImportTypes: ["builtin"],
          },
        ],
      },
    },
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  rules: {
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "src/setupTests.ts", "src/test-utils/*"],
        optionalDependencies: false,
        peerDependencies: false,
        bundledDependencies: false,
      },
    ],
    "no-duplicate-imports": ["error", { includeExports: true }],
  },
  settings: {
  
  },
};
