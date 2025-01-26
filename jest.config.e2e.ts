import { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '\\.(e2e)\\.test\\.ts$',
  verbose: true, // Affiche des logs détaillés
  rootDir: '.', // Définit la racine du projet (où se trouve le fichier jest.config.e2e.ts)
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1', // Corrige le mapping pour `src/...`
  },
  testTimeout: 30000, // Augmente le délai d'exécution des tests si nécessaire
};

export default config;
