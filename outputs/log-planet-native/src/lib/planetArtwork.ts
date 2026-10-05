import type { ImageSourcePropType } from "react-native";
import type { PlanetLayout } from "./planetCompanionLayout";
import { ROMI_SEATED_GEOMETRY } from "./planetCompanionLayout";

type PlanetArtwork = {
  layout: PlanetLayout;
  base: ImageSourcePropType;
  companion: null | {
    source: ImageSourcePropType;
    label: string;
    geometry: typeof ROMI_SEATED_GEOMETRY;
  };
};

// Approved artwork and matching placement layout are activated together.
export const planetArtwork: PlanetArtwork = {
  layout: "companion-seat-v1",
  base: require("../../assets/assets_v5/continent/bare_planet.png"),
  companion: {
    source: require("../../../../../character/assets/characters/romi-seated-standard.png"),
    label: "로미",
    geometry: ROMI_SEATED_GEOMETRY
  }
};
