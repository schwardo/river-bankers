import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Public assets (card PNGs, logo, etc.) live under public/. Remotion serves
// them at the root URL, so a card at public/material-deck/Logjam.png is
// addressable as staticFile("material-deck/Logjam.png").
