const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withJava17(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => item.key !== 'org.gradle.java.home'
    );
    config.modResults.push({
      type: 'property',
      key: 'org.gradle.java.home',
      value: '/usr/lib/jvm/java-17-openjdk-amd64',
    });
    return config;
  });
};
