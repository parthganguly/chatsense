import { defineConfig } from "@playwright/test"

/**
 * Mobile viewport smoke tests for the static export in `out/`.
 * Run `npm run build` first; the config serves `out/` with http-server.
 */
const PORT = Number(process.env.PW_PORT ?? 4319)

export default defineConfig({
  testDir: "tests/viewport",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  webServer: {
    command: `npx http-server out -a 127.0.0.1 -p ${PORT} -c-1 --silent`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 3,
  },
  projects: [
    { name: "android-360x800", use: { viewport: { width: 360, height: 800 } } },
    { name: "phone-390x844", use: { viewport: { width: 390, height: 844 } } },
    { name: "android-412x915", use: { viewport: { width: 412, height: 915 } } },
  ],
})
