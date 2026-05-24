module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-detect-browsers'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {
        random: true,
        seed: '37808',
        oneFailurePerSpec: true,
        failFast: false,
        timeoutInterval: 10000,
      },
      clearContext: false,
    },
    detectBrowsers: {
      usePhantomJS: false,
      postDetection: function (availableBrowsers) {
        // Preferir versiones headless si están disponibles
        if (availableBrowsers.includes('ChromeHeadless')) return ['ChromeHeadless'];
        if (availableBrowsers.includes('FirefoxHeadless')) return ['FirefoxHeadless'];
        if (availableBrowsers.includes('Chrome')) return ['Chrome'];
        if (availableBrowsers.includes('Firefox')) return ['Firefox'];
        return availableBrowsers;
      },
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/rappiNoticias'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: [],
    singleRun: false,
    restartOnFileChange: true,
  });
};
