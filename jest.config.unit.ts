export default {
    collectCoverage: false,
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/*.test.ts'], // Inclut uniquement les fichiers se terminant par `.test.ts` (tests unitaires)
    verbose: true,
    rootDir: 'src',
    moduleNameMapper: {
      '^src/(.*)$': '<rootDir>/$1',
    },
  };
  