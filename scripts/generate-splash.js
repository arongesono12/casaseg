const { readFileSync, writeFileSync, mkdirSync } = require("fs");
const { join } = require("path");
const { Resvg } = require("@resvg/resvg-js");

const PUBLIC = "public";
const ASSETS = "assets";
const ONBOARDING = join(PUBLIC, "Onboarding");
const LOGO_SVG = join(PUBLIC, "logo", "logo.svg");

const screens = [
  { dir: "casaseg_splash_screen", name: "splash-icon" },
  { dir: "onboarding_get_started", name: "onboarding-get-started" },
  { dir: "onboarding_discover_properties", name: "onboarding-discover" },
  { dir: "onboarding_community_trust", name: "onboarding-community" },
];

const svg = readFileSync(LOGO_SVG, "utf8");
const logo = new Resvg(svg, { fitTo: { mode: "width", value: 200 } });
const logoPng = logo.render().asPng();

console.log("Logo rendered: %d bytes", logoPng.length);

mkdirSync(join(ASSETS, "images", "onboarding"), { recursive: true });

for (const screen of screens) {
  const refPath = join(ONBOARDING, screen.dir, "screen.png");
  const ref = readFileSync(refPath);
  const outPath = screen.name === "splash-icon"
    ? join(ASSETS, "images", "splash-icon.png")
    : join(ASSETS, "images", "onboarding", screen.name + ".png");
  writeFileSync(outPath, ref);
  console.log("Copied: %s -> %s", refPath, outPath);
}

console.log("Done! Splash screen images created.");
