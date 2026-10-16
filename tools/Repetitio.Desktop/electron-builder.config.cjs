const path = require("node:path");

module.exports = {
  appId: "local.repetitio.desktop",
  productName: "Repetitio",
  asar: true,
  directories: { output: process.env.REPETITIO_RELEASE_DIRECTORY || "../../artifacts" },
  extraMetadata: { version: process.env.REPETITIO_VERSION || require("./package.json").version },
  files: ["*.cjs", "ui/**/*", "assets/icon.ico", "!electron-builder.config.cjs", "!test/**/*"],
  extraResources: [{ from: process.env.REPETITIO_DESKTOP_STAGE || ".stage", to: "runtime", filter: ["**/*"] }],
  win: { icon: path.join(__dirname, "assets/icon.ico"), target: ["nsis", "portable"] },
  nsis: { oneClick: true, perMachine: false, deleteAppDataOnUninstall: false, createDesktopShortcut: true, createStartMenuShortcut: true,
    include: path.join(__dirname, "installer.nsh"),
    artifactName: "Repetitio-Setup.exe" },
  portable: { artifactName: "Repetitio.exe" }
};
