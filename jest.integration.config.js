/** Jest config for integration tests only. Requires docker-compose-db.yml (Postgres + Redis). */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|html)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  testMatch: ['<rootDir>/test/integration/**/*.(test|spec).(ts|tsx|js)'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  testTimeout: 20000,
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  forceExit: true,
  detectOpenHandles: true,
  maxWorkers: 1,
};
