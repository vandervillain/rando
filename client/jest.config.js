module.exports = {
  preset: 'jest-playwright-preset',
  testMatch: ['**/__tests__/**/*.+(ts|js)', '**/?(*.)+(spec|test).+(ts|js)'],
  transform: {
    '^.+\\.(ts)$': 'ts-jest',
  },
  // testEnvironmentOptions: {
  //   'jest-playwright': {
  //     launchType: 'LAUNCH',
  //     launchOptions: {
  //       headless: false,
  //       slowMo: 300,
  //       devtools: true,
  //       args: [
  //         '--allow-file-access-from-files', // allows API access for file:// URLs
  //         '--use-fake-ui-for-media-stream', // disables the translation popup
  //         '--disable-translate', // provide fake media streams
  //         '--mute-audio', // mute audio output
  //       ],
  //     },
  //     connectOptions: {
  //       slowMo: 250,
  //     },
  //     browsers: ['chromium'],
  //   },
  //},
}
