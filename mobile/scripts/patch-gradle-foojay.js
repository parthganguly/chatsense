/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs")
const path = require("node:path")

const settingsPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@react-native",
  "gradle-plugin",
  "settings.gradle.kts",
)

if (!fs.existsSync(settingsPath)) {
  process.exit(0)
}

const before = fs.readFileSync(settingsPath, "utf8")
const after = before.replace(
  'id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0")',
  'id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0")',
)

if (after !== before) {
  fs.writeFileSync(settingsPath, after)
  console.log("Patched React Native Gradle Foojay resolver for Gradle 9.")
}
