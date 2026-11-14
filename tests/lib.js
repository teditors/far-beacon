// Shared test helper: builds the rules fresh and returns them, so tests always run against the current source.
const { buildRules } = require('../tools/build.js');
const Rules = require(buildRules()).Rules;
globalThis.Rules = Rules;
module.exports = { Rules, R: Rules };
