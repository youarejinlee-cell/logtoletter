import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Image, ImageSourcePropType, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { categoryForEntry } from "../lib/entryCategories";
import { Entry, EntryCategory, Mood } from "../types/domain";

type Props = {
  entries: Entry[];
};

type UniverseView = "home" | "planet" | "continent" | "guide";

type MoodBiome = "calm" | "grateful" | "proud" | "excited" | "anxious" | "other";
type ContinentLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type MoodGroup = "positive" | "neutral" | "negative";
type UniverseCategory = "work" | "taste" | "relationship" | "self-discipline" | "wealth" | "health";
type UniverseContinentRank = 1 | 2 | 3 | 4 | 5 | 6;
type UniverseContinentLevel = "bare" | 1 | 2 | 3 | 4 | 5;
type V4Category = UniverseCategory | "etc";
type V4Level = 1 | 2 | 3 | 4;
type V4SlotKey = "land_01" | "land_02" | "land_03" | "land_04" | "land_05" | "land_06" | "etc_lake";
type V4AssetSide = "left" | "right" | "center";
type UniverseScenario = {
  title: string;
  counts: Partial<Record<V4Category, number>>;
};

type ContinentMeta = {
  key: UniverseCategory;
  name: string;
  label: string;
  color: string;
  softColor: string;
  keeperColor: string;
};

type ContinentSlice = ContinentMeta & {
  count: number;
  ratio: number;
  entries: Entry[];
};

const continentMeta: ContinentMeta[] = [
  { key: "work", name: "일의 대륙", label: "일", color: "#a9c7ff", softColor: "rgba(169, 199, 255, 0.24)", keeperColor: "#d9e6ff" },
  { key: "taste", name: "취향의 대륙", label: "취향/취미", color: "#ffc56f", softColor: "rgba(255, 197, 111, 0.22)", keeperColor: "#ffe5b8" },
  { key: "relationship", name: "관계의 대륙", label: "관계", color: "#85e3d0", softColor: "rgba(133, 227, 208, 0.22)", keeperColor: "#c8f4ea" },
  { key: "self-discipline", name: "성찰의 대륙", label: "자아성찰", color: "#c5a8ff", softColor: "rgba(197, 168, 255, 0.22)", keeperColor: "#e2d4ff" },
  { key: "wealth", name: "돈의 대륙", label: "돈", color: "#f4dc82", softColor: "rgba(244, 220, 130, 0.21)", keeperColor: "#f8edba" },
  { key: "health", name: "건강의 대륙", label: "건강", color: "#9fe0aa", softColor: "rgba(159, 224, 170, 0.22)", keeperColor: "#d4f0da" }
];

const moodBiomes: Array<{ key: MoodBiome; label: string; icon: string; color: string; glow: string }> = [
  { key: "calm", label: "평온", icon: "☾", color: "#7ec8ff", glow: "rgba(126, 200, 255, 0.28)" },
  { key: "grateful", label: "감사", icon: "♧", color: "#94e58d", glow: "rgba(148, 229, 141, 0.28)" },
  { key: "proud", label: "성취", icon: "▲", color: "#a996ff", glow: "rgba(169, 150, 255, 0.32)" },
  { key: "excited", label: "설렘", icon: "✦", color: "#ff8cc8", glow: "rgba(255, 140, 200, 0.3)" },
  { key: "anxious", label: "불안", icon: "☁", color: "#a7adbf", glow: "rgba(167, 173, 191, 0.24)" },
  { key: "other", label: "기타", icon: "…", color: "#d8d9ff", glow: "rgba(216, 217, 255, 0.22)" }
];

const v3PlanetBaseAsset = require("../../assets/universe_continent_v3/universe_base_bare.png");
const v4BackgroundAsset = require("../../assets/assets_v4/continent/background.png");
const v4BarePlanetAsset = require("../../assets/assets_v4/continent/bare_planet.png");

const v3ContinentBareAssets: Record<UniverseContinentRank, ImageSourcePropType> = {
  1: require("../../assets/universe_continent_v3/continent_1_bare.png"),
  2: require("../../assets/universe_continent_v3/continent_2_bare.png"),
  3: require("../../assets/universe_continent_v3/continent_3_bare.png"),
  4: require("../../assets/universe_continent_v3/continent_4_bare.png"),
  5: require("../../assets/universe_continent_v3/continent_5_bare.png"),
  6: require("../../assets/universe_continent_v3/continent_6_bare.png")
};

const v3ContinentAssets: Record<UniverseContinentRank, Record<UniverseCategory, Record<Exclude<UniverseContinentLevel, "bare">, ImageSourcePropType>>> = {
  1: {
    work: {
      1: require("../../assets/universe_continent_v3/continent_1_work_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_1_work_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_1_work_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_1_work_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_1_work_lv5.png")
    },
    taste: {
      1: require("../../assets/universe_continent_v3/continent_1_taste_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_1_taste_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_1_taste_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_1_taste_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_1_taste_lv5.png")
    },
    relationship: {
      1: require("../../assets/universe_continent_v3/continent_1_relationship_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_1_relationship_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_1_relationship_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_1_relationship_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_1_relationship_lv5.png")
    },
    "self-discipline": {
      1: require("../../assets/universe_continent_v3/continent_1_self-discipline_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_1_self-discipline_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_1_self-discipline_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_1_self-discipline_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_1_self-discipline_lv5.png")
    },
    wealth: {
      1: require("../../assets/universe_continent_v3/continent_1_wealth_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_1_wealth_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_1_wealth_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_1_wealth_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_1_wealth_lv5.png")
    },
    health: {
      1: require("../../assets/universe_continent_v3/continent_1_health_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_1_health_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_1_health_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_1_health_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_1_health_lv5.png")
    }
  },
  2: {
    work: {
      1: require("../../assets/universe_continent_v3/continent_2_work_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_2_work_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_2_work_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_2_work_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_2_work_lv5.png")
    },
    taste: {
      1: require("../../assets/universe_continent_v3/continent_2_taste_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_2_taste_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_2_taste_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_2_taste_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_2_taste_lv5.png")
    },
    relationship: {
      1: require("../../assets/universe_continent_v3/continent_2_relationship_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_2_relationship_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_2_relationship_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_2_relationship_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_2_relationship_lv5.png")
    },
    "self-discipline": {
      1: require("../../assets/universe_continent_v3/continent_2_self-discipline_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_2_self-discipline_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_2_self-discipline_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_2_self-discipline_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_2_self-discipline_lv5.png")
    },
    wealth: {
      1: require("../../assets/universe_continent_v3/continent_2_wealth_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_2_wealth_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_2_wealth_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_2_wealth_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_2_wealth_lv5.png")
    },
    health: {
      1: require("../../assets/universe_continent_v3/continent_2_health_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_2_health_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_2_health_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_2_health_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_2_health_lv5.png")
    }
  },
  3: {
    work: {
      1: require("../../assets/universe_continent_v3/continent_3_work_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_3_work_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_3_work_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_3_work_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_3_work_lv5.png")
    },
    taste: {
      1: require("../../assets/universe_continent_v3/continent_3_taste_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_3_taste_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_3_taste_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_3_taste_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_3_taste_lv5.png")
    },
    relationship: {
      1: require("../../assets/universe_continent_v3/continent_3_relationship_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_3_relationship_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_3_relationship_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_3_relationship_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_3_relationship_lv5.png")
    },
    "self-discipline": {
      1: require("../../assets/universe_continent_v3/continent_3_self-discipline_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_3_self-discipline_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_3_self-discipline_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_3_self-discipline_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_3_self-discipline_lv5.png")
    },
    wealth: {
      1: require("../../assets/universe_continent_v3/continent_3_wealth_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_3_wealth_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_3_wealth_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_3_wealth_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_3_wealth_lv5.png")
    },
    health: {
      1: require("../../assets/universe_continent_v3/continent_3_health_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_3_health_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_3_health_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_3_health_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_3_health_lv5.png")
    }
  },
  4: {
    work: {
      1: require("../../assets/universe_continent_v3/continent_4_work_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_4_work_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_4_work_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_4_work_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_4_work_lv5.png")
    },
    taste: {
      1: require("../../assets/universe_continent_v3/continent_4_taste_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_4_taste_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_4_taste_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_4_taste_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_4_taste_lv5.png")
    },
    relationship: {
      1: require("../../assets/universe_continent_v3/continent_4_relationship_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_4_relationship_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_4_relationship_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_4_relationship_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_4_relationship_lv5.png")
    },
    "self-discipline": {
      1: require("../../assets/universe_continent_v3/continent_4_self-discipline_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_4_self-discipline_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_4_self-discipline_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_4_self-discipline_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_4_self-discipline_lv5.png")
    },
    wealth: {
      1: require("../../assets/universe_continent_v3/continent_4_wealth_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_4_wealth_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_4_wealth_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_4_wealth_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_4_wealth_lv5.png")
    },
    health: {
      1: require("../../assets/universe_continent_v3/continent_4_health_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_4_health_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_4_health_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_4_health_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_4_health_lv5.png")
    }
  },
  5: {
    work: {
      1: require("../../assets/universe_continent_v3/continent_5_work_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_5_work_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_5_work_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_5_work_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_5_work_lv5.png")
    },
    taste: {
      1: require("../../assets/universe_continent_v3/continent_5_taste_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_5_taste_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_5_taste_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_5_taste_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_5_taste_lv5.png")
    },
    relationship: {
      1: require("../../assets/universe_continent_v3/continent_5_relationship_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_5_relationship_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_5_relationship_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_5_relationship_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_5_relationship_lv5.png")
    },
    "self-discipline": {
      1: require("../../assets/universe_continent_v3/continent_5_self-discipline_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_5_self-discipline_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_5_self-discipline_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_5_self-discipline_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_5_self-discipline_lv5.png")
    },
    wealth: {
      1: require("../../assets/universe_continent_v3/continent_5_wealth_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_5_wealth_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_5_wealth_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_5_wealth_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_5_wealth_lv5.png")
    },
    health: {
      1: require("../../assets/universe_continent_v3/continent_5_health_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_5_health_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_5_health_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_5_health_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_5_health_lv5.png")
    }
  },
  6: {
    work: {
      1: require("../../assets/universe_continent_v3/continent_6_work_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_6_work_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_6_work_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_6_work_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_6_work_lv5.png")
    },
    taste: {
      1: require("../../assets/universe_continent_v3/continent_6_taste_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_6_taste_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_6_taste_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_6_taste_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_6_taste_lv5.png")
    },
    relationship: {
      1: require("../../assets/universe_continent_v3/continent_6_relationship_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_6_relationship_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_6_relationship_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_6_relationship_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_6_relationship_lv5.png")
    },
    "self-discipline": {
      1: require("../../assets/universe_continent_v3/continent_6_self-discipline_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_6_self-discipline_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_6_self-discipline_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_6_self-discipline_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_6_self-discipline_lv5.png")
    },
    wealth: {
      1: require("../../assets/universe_continent_v3/continent_6_wealth_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_6_wealth_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_6_wealth_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_6_wealth_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_6_wealth_lv5.png")
    },
    health: {
      1: require("../../assets/universe_continent_v3/continent_6_health_lv1.png"),
      2: require("../../assets/universe_continent_v3/continent_6_health_lv2.png"),
      3: require("../../assets/universe_continent_v3/continent_6_health_lv3.png"),
      4: require("../../assets/universe_continent_v3/continent_6_health_lv4.png"),
      5: require("../../assets/universe_continent_v3/continent_6_health_lv5.png")
    }
  }
};

const continentLayerOrder = ["up-left", "up-right", "down-right", "down-left"] as const;

const continentLayerAssets: Record<(typeof continentLayerOrder)[number], number> = {
  "up-left": require("../../assets/universe-nature-version/universe-continent-up-left-lv0.png"),
  "down-left": require("../../assets/universe-nature-version/universe-continent-down-left-lv0.png"),
  "up-right": require("../../assets/universe-nature-version/universe-continent-up-right-lv0.png"),
  "down-right": require("../../assets/universe-nature-version/universe-continent-down-right-lv0.png")
};

const continentLayerLevelAssets: Partial<Record<(typeof continentLayerOrder)[number], Record<ContinentLevel, number>>> = {
  "up-left": {
    0: require("../../assets/universe-nature-version/universe-continent-up-left-lv0.png"),
    1: require("../../assets/universe-nature-version/universe-continent-up-left-lv1.png"),
    2: require("../../assets/universe-nature-version/universe-continent-up-left-lv2.png"),
    3: require("../../assets/universe-nature-version/universe-continent-up-left-lv3.png"),
    4: require("../../assets/universe-nature-version/universe-continent-up-left-lv4.png"),
    5: require("../../assets/universe-nature-version/universe-continent-up-left-lv5.png"),
    6: require("../../assets/universe-nature-version/universe-continent-up-left-lv6.png")
  },
  "up-right": {
    0: require("../../assets/universe-nature-version/universe-continent-up-right-lv0.png"),
    1: require("../../assets/universe-nature-version/universe-continent-up-right-lv1.png"),
    2: require("../../assets/universe-nature-version/universe-continent-up-right-lv2.png"),
    3: require("../../assets/universe-nature-version/universe-continent-up-right-lv3.png"),
    4: require("../../assets/universe-nature-version/universe-continent-up-right-lv4.png"),
    5: require("../../assets/universe-nature-version/universe-continent-up-right-lv5.png"),
    6: require("../../assets/universe-nature-version/universe-continent-up-right-lv6.png")
  },
  "down-right": {
    0: require("../../assets/universe-nature-version/universe-continent-down-right-lv0.png"),
    1: require("../../assets/universe-nature-version/universe-continent-down-right-lv1.png"),
    2: require("../../assets/universe-nature-version/universe-continent-down-right-lv2.png"),
    3: require("../../assets/universe-nature-version/universe-continent-down-right-lv3.png"),
    4: require("../../assets/universe-nature-version/universe-continent-down-right-lv4.png"),
    5: require("../../assets/universe-nature-version/universe-continent-down-right-lv5.png"),
    6: require("../../assets/universe-nature-version/universe-continent-down-right-lv6.png")
  },
  "down-left": {
    0: require("../../assets/universe-nature-version/universe-continent-down-left-lv0.png"),
    1: require("../../assets/universe-nature-version/universe-continent-down-left-lv1.png"),
    2: require("../../assets/universe-nature-version/universe-continent-down-left-lv2.png"),
    3: require("../../assets/universe-nature-version/universe-continent-down-left-lv3.png"),
    4: require("../../assets/universe-nature-version/universe-continent-down-left-lv4.png"),
    5: require("../../assets/universe-nature-version/universe-continent-down-left-lv5.png"),
    6: require("../../assets/universe-nature-version/universe-continent-down-left-lv6.png")
  }
};

const CONTINENT_CANVAS_SIZE = 1254;

type ContinentBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const continentLayerTargets: Partial<Record<(typeof continentLayerOrder)[number], ContinentBounds>> = {
  "up-left": { x: 0.18, y: 0.15, width: 0.34, height: 0.39 },
  "up-right": { x: 0.48, y: 0.16, width: 0.32, height: 0.38 },
  "down-right": { x: 0.39, y: 0.47, width: 0.37, height: 0.33 },
  "down-left": { x: 0.20, y: 0.50, width: 0.25, height: 0.30 }
};

const continentAlphaBounds: Partial<Record<(typeof continentLayerOrder)[number], Record<ContinentLevel, ContinentBounds>>> = {
  "up-left": {
    0: { x: 163, y: 52, width: 924, height: 1123 },
    1: { x: 118, y: 60, width: 1045, height: 1117 },
    2: { x: 128, y: 60, width: 1032, height: 1107 },
    3: { x: 126, y: 55, width: 1034, height: 1108 },
    4: { x: 106, y: 39, width: 1054, height: 1126 },
    5: { x: 104, y: 35, width: 1056, height: 1132 },
    6: { x: 106, y: 40, width: 1054, height: 1127 }
  },
  "up-right": {
    0: { x: 170, y: 87, width: 926, height: 1098 },
    1: { x: 701, y: 201, width: 368, height: 438 },
    2: { x: 204, y: 134, width: 894, height: 1024 },
    3: { x: 79, y: 0, width: 1097, height: 1254 },
    4: { x: 128, y: 62, width: 998, height: 1135 },
    5: { x: 133, y: 55, width: 995, height: 1134 },
    6: { x: 121, y: 25, width: 1055, height: 1201 }
  },
  "down-right": {
    0: { x: 493, y: 591, width: 524, height: 464 },
    1: { x: 123, y: 163, width: 1103, height: 985 },
    2: { x: 101, y: 118, width: 1139, height: 1018 },
    3: { x: 74, y: 109, width: 1152, height: 1036 },
    4: { x: 138, y: 131, width: 1047, height: 985 },
    5: { x: 123, y: 128, width: 1076, height: 1012 },
    6: { x: 112, y: 112, width: 1083, height: 1030 }
  },
  "down-left": {
    0: { x: 141, y: 573, width: 311, height: 381 },
    1: { x: 141, y: 573, width: 311, height: 381 },
    2: { x: 141, y: 573, width: 311, height: 381 },
    3: { x: 141, y: 573, width: 311, height: 381 },
    4: { x: 141, y: 573, width: 311, height: 381 },
    5: { x: 141, y: 573, width: 311, height: 381 },
    6: { x: 141, y: 573, width: 311, height: 381 }
  }
};

const moodBiomeMap: Record<Mood, MoodBiome> = {
  calm: "calm",
  joy: "excited",
  moved: "grateful",
  recovered: "calm",
  happy: "excited",
  delight: "excited",
  excited: "excited",
  fun: "excited",
  hopeful: "proud",
  grateful: "grateful",
  proud: "proud",
  peaceful: "calm",
  lucky: "grateful",
  selfEsteem: "proud",
  anxious: "anxious",
  soSo: "other",
  indifferent: "calm",
  curious: "excited",
  accepting: "calm",
  reflective: "other",
  envious: "anxious",
  instructive: "proud",
  difficult: "anxious",
  worried: "anxious",
  tired: "anxious",
  sad: "anxious",
  depressed: "anxious",
  angry: "anxious",
  irritated: "anxious",
  jealous: "anxious",
  prideHurt: "anxious",
  sensitive: "anxious",
  regret: "anxious",
  blank: "anxious",
  complex: "other"
};

function dateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKeyForDate(value: string | Date) {
  return dateKey(value).slice(0, 7);
}

function normalizeUniverseCategory(category: EntryCategory | null): UniverseCategory | null {
  if (!category || category === "other") return null;
  if (category === "relationship" || category === "relationships" || category === "love" || category === "family") return "relationship";
  if (category === "selfDiscipline" || category === "habit" || category === "attitude" || category === "dream") return "self-discipline";
  if (category === "work" || category === "taste" || category === "wealth" || category === "health") return category;
  return null;
}

function monthLabelFromKey(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${year}년 ${Number(month)}월`;
}

function shiftMonth(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function availableMonthKeys(entries: Entry[]) {
  const months = new Set(entries.map((entry) => monthKeyForDate(entry.createdAt)));
  months.add(monthKeyForDate(new Date()));
  return [...months].sort();
}

function periodLabel(entries: Entry[]) {
  if (!entries.length) return "아직 생성 전";
  const sorted = [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const first = new Date(sorted[0].createdAt);
  const last = new Date(sorted[sorted.length - 1].createdAt);
  return `${first.getFullYear()}.${String(first.getMonth() + 1).padStart(2, "0")} ~ ${last.getFullYear()}.${String(last.getMonth() + 1).padStart(2, "0")}`;
}

function streakDays(entries: Entry[]) {
  if (!entries.length) return 0;
  const days = new Set(entries.map((entry) => dateKey(entry.createdAt)));
  const sorted = [...days].sort();
  let best = 1;
  let current = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    const prev = new Date(`${sorted[index - 1]}T00:00:00`).getTime();
    const next = new Date(`${sorted[index]}T00:00:00`).getTime();
    if (next - prev === 24 * 60 * 60 * 1000) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
}

function buildUniverse(entries: Entry[]) {
  const categories = new Map<UniverseCategory, Entry[]>();
  const etcEntries: Entry[] = [];
  const biomes = new Map<MoodBiome, Entry[]>();
  const moods = new Set<Mood>();

  entries.forEach((entry) => {
    const rawCategory = categoryForEntry(entry);
    const category = normalizeUniverseCategory(rawCategory);
    if (category) {
      categories.set(category, [...(categories.get(category) || []), entry]);
    } else if (rawCategory === "other") {
      etcEntries.push(entry);
    }
    const biome = moodBiomeMap[entry.mood] || "other";
    biomes.set(biome, [...(biomes.get(biome) || []), entry]);
    moods.add(entry.mood);
  });

  return {
    totalEntries: entries.length,
    streak: streakDays(entries),
    moodKinds: moods.size,
    visitedAreas: categories.size,
    period: periodLabel(entries),
    categories,
    etcEntries,
    biomes
  };
}

function topContinents(data: ReturnType<typeof buildUniverse>): ContinentSlice[] {
  const lastEntryTime = (entries: Entry[]) => entries.length
    ? Math.max(...entries.map((entry) => new Date(entry.createdAt).getTime()))
    : Number.MAX_SAFE_INTEGER;
  const slices = continentMeta
    .map((continent) => {
      const continentEntries = data.categories.get(continent.key) || [];
      return {
        ...continent,
        entries: continentEntries,
        count: continentEntries.length,
        ratio: data.totalEntries ? continentEntries.length / data.totalEntries : 0
      };
    })
    .filter((continent) => continent.count > 0)
    .sort((a, b) => b.count - a.count || lastEntryTime(a.entries) - lastEntryTime(b.entries) || a.label.localeCompare(b.label, "ko"))
    .slice(0, 6);

  return slices;
}

function visibleContinents(continents: ContinentSlice[], rotationIndex: number) {
  if (continents.length <= 6) return continents;
  return Array.from({ length: 6 }).map((_, index) => continents[(rotationIndex + index) % continents.length]);
}

function latestMonthKey(entries: Entry[]) {
  if (!entries.length) return monthKeyForDate(new Date());
  const latest = [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return monthKeyForDate(latest.createdAt);
}

function entriesInMonth(entries: Entry[], monthKey: string) {
  return entries.filter((entry) => dateKey(entry.createdAt).startsWith(monthKey));
}

function continentDevelopmentLevel(entries: Entry[]): UniverseContinentLevel {
  if (entries.length <= 1) return "bare";
  if (entries.length < 5) return 1;
  if (entries.length < 8) return 2;
  if (entries.length < 12) return 3;
  if (entries.length < 15) return 4;
  return 5;
}

function activeV4Levels(count: number): V4Level[] {
  if (count >= 10) return [1, 2, 3, 4];
  if (count >= 7) return [1, 2, 3];
  if (count >= 4) return [1, 2];
  if (count >= 1) return [1];
  return [];
}

function emotionLayerForEntries(entries: Entry[]) {
  const positive = entries.filter((entry) => {
    const biome = moodBiomeMap[entry.mood] || "other";
    return biome === "calm" || biome === "grateful" || biome === "proud" || biome === "excited";
  }).length;
  const negative = entries.filter((entry) => (moodBiomeMap[entry.mood] || "other") === "anxious").length;

  if (positive === 0 && negative === 0) return "none";
  if (negative > positive) return "mixed";
  if (positive > 0) return "light";
  return "none";
}

function topBiomeEntries(entries: Entry[]) {
  const counts = moodBiomes.map((biome) => ({
    ...biome,
    count: entries.filter((entry) => (moodBiomeMap[entry.mood] || "other") === biome.key).length
  }));
  return counts.sort((a, b) => b.count - a.count);
}

function percent(count: number, total: number) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

function averageEnergy(entries: Entry[]) {
  if (!entries.length) return 0;
  return Math.round(entries.reduce((sum, entry) => sum + Math.max(0, Math.min(100, entry.energy)), 0) / entries.length);
}

function moodGroupForMood(mood: Mood): MoodGroup {
  const biome = moodBiomeMap[mood] || "other";
  if (biome === "anxious") return "negative";
  if (biome === "other") return "neutral";
  return "positive";
}

function moodGroupCounts(entries: Entry[]) {
  return entries.reduce<Record<MoodGroup, number>>((acc, entry) => {
    acc[moodGroupForMood(entry.mood)] += 1;
    return acc;
  }, { positive: 0, neutral: 0, negative: 0 });
}

const v3ContinentFrames: Record<UniverseContinentRank, ContinentBounds> = {
  1: { x: 0.08, y: 0.13, width: 0.39, height: 0.28 },
  2: { x: 0.53, y: 0.14, width: 0.38, height: 0.27 },
  3: { x: 0.08, y: 0.42, width: 0.36, height: 0.25 },
  4: { x: 0.56, y: 0.42, width: 0.35, height: 0.25 },
  5: { x: 0.16, y: 0.68, width: 0.32, height: 0.22 },
  6: { x: 0.54, y: 0.69, width: 0.31, height: 0.21 }
};

const V4_PLANET_WIDTH = 1126;
const V4_PLANET_HEIGHT = 1397;

type V4DecoLayer = "background" | "boundary" | "foreground";
type V4DecoSpec = {
  key: string;
  source: ImageSourcePropType;
  layer: V4DecoLayer;
  center: { x: number; y: number };
  width: number;
  aspectRatio: number;
  rotation?: number;
};

const v4DecoAssets: V4DecoSpec[] = [
  { key: "mars", source: require("../../assets/assets_v4/deco/deco_mars.png"), layer: "background", center: { x: 145, y: 140 }, width: 115, aspectRatio: 1 },
  { key: "saturn", source: require("../../assets/assets_v4/deco/deco_saturn.png"), layer: "background", center: { x: 1000, y: 1370 }, width: 160, aspectRatio: 1 },
  { key: "rocket", source: require("../../assets/assets_v4/deco/deco_rocket.png"), layer: "background", center: { x: 235, y: 315 }, width: 500, aspectRatio: 1, rotation: 20 },
  { key: "satellite", source: require("../../assets/assets_v4/deco/deco_satellite.png"), layer: "boundary", center: { x: 870, y: 60 }, width: 364, aspectRatio: 1 },
  { key: "astronaut-1", source: require("../../assets/assets_v4/deco/deco_astronaut_1.png"), layer: "boundary", center: { x: 1005, y: 335 }, width: 230, aspectRatio: 1 },
  { key: "astronaut-2", source: require("../../assets/assets_v4/deco/deco_astronaut_2.png"), layer: "boundary", center: { x: 125, y: 1230 }, width: 230, aspectRatio: 1 },
  { key: "airship", source: require("../../assets/assets_v4/deco/deco_airship.png"), layer: "foreground", center: { x: 335, y: 1335 }, width: 296, aspectRatio: 1 },
  { key: "pirateship", source: require("../../assets/assets_v4/deco/deco_pirateship.png"), layer: "foreground", center: { x: 975, y: 1040 }, width: 350, aspectRatio: 1 },
  { key: "seagull-1", source: require("../../assets/assets_v4/deco/deco_seagull_1.png"), layer: "foreground", center: { x: 525, y: 790 }, width: 115, aspectRatio: 1.5 },
  { key: "seagull-2", source: require("../../assets/assets_v4/deco/deco_seagull_2.png"), layer: "foreground", center: { x: 610, y: 745 }, width: 125, aspectRatio: 1.5 }
];

function activeV4Deco(data: ReturnType<typeof buildUniverse>) {
  return v4DecoAssets.slice(0, Math.floor(data.totalEntries / 3));
}

type V4MoodDecoSpec = {
  key: string;
  source: ImageSourcePropType;
  canvas: { width: number; height: number };
  alphaCenter: { x: number; y: number };
  width: number;
  center: { x: number; y: number };
  group: MoodGroup;
  slot: V4SlotKey;
};

const v4MoodDecoAssets: Record<MoodGroup, Omit<V4MoodDecoSpec, "key" | "center" | "group" | "slot">[]> = {
  neutral: [
    { source: require("../../assets/assets_v4/deco/deco_tree_1.png"), canvas: { width: 1254, height: 1254 }, alphaCenter: { x: 625, y: 619 }, width: 118 },
    { source: require("../../assets/assets_v4/deco/deco_tree_2.png"), canvas: { width: 1254, height: 1254 }, alphaCenter: { x: 642, y: 608 }, width: 110 },
    { source: require("../../assets/assets_v4/deco/deco_tree_3.png"), canvas: { width: 1254, height: 1254 }, alphaCenter: { x: 628, y: 604 }, width: 106 },
    { source: require("../../assets/assets_v4/deco/deco_tree_4.png"), canvas: { width: 1254, height: 1254 }, alphaCenter: { x: 636, y: 619 }, width: 102 },
    { source: require("../../assets/assets_v4/deco/deco_tree_5.png"), canvas: { width: 1254, height: 1254 }, alphaCenter: { x: 634, y: 625 }, width: 102 }
  ],
  negative: [
    { source: require("../../assets/assets_v4/deco/negative_cloud_1.png"), canvas: { width: 1536, height: 1024 }, alphaCenter: { x: 769, y: 488 }, width: 150 },
    { source: require("../../assets/assets_v4/deco/negative_cloud_2.png"), canvas: { width: 1536, height: 1024 }, alphaCenter: { x: 757, y: 485 }, width: 146 },
    { source: require("../../assets/assets_v4/deco/negative_cloud3.png"), canvas: { width: 1402, height: 1122 }, alphaCenter: { x: 695, y: 542 }, width: 123 }
  ],
  positive: [
    { source: require("../../assets/assets_v4/deco/positive_diamond_star_1.png"), canvas: { width: 1254, height: 1254 }, alphaCenter: { x: 627, y: 607 }, width: 85 },
    { source: require("../../assets/assets_v4/deco/positive_diamond_star_2.png"), canvas: { width: 1536, height: 1024 }, alphaCenter: { x: 738, y: 513 }, width: 93 }
  ]
};

const v4StreetlightMoodAsset = {
  source: require("../../assets/assets_v4/deco/deco_streetlight.png"),
  canvas: { width: 1122, height: 1402 },
  alphaCenter: { x: 560, y: 701 },
  width: 115
};

const v4MoodDecoPositions: Record<V4SlotKey, Record<MoodGroup, Array<{ x: number; y: number }>>> = {
  land_01: { neutral: [{ x: 555, y: 961 }, { x: 538, y: 1040 }, { x: 522, y: 1118 }], negative: [{ x: 431, y: 835 }, { x: 66, y: 865 }, { x: 480, y: 1084 }], positive: [{ x: 389, y: 735 }, { x: 120, y: 949 }, { x: 177, y: 1022 }] },
  land_02: { neutral: [{ x: 453, y: 469 }, { x: 411, y: 529 }, { x: 370, y: 603 }], negative: [{ x: 172, y: 384 }, { x: 106, y: 454 }, { x: 410, y: 580 }], positive: [{ x: 352, y: 323 }, { x: 407, y: 421 }, { x: 124, y: 626 }] },
  land_03: { neutral: [{ x: 649, y: 455 }, { x: 647, y: 529 }, { x: 713, y: 570 }], negative: [{ x: 945, y: 430 }, { x: 620, y: 510 }, { x: 848, y: 572 }], positive: [{ x: 890, y: 351 }, { x: 705, y: 477 }, { x: 871, y: 522 }] },
  land_04: { neutral: [{ x: 426, y: 247 }, { x: 460, y: 290 }, { x: 506, y: 331 }], negative: [{ x: 512, y: 192 }, { x: 779, y: 235 }, { x: 455, y: 301 }], positive: [{ x: 682, y: 182 }, { x: 571, y: 269 }, { x: 691, y: 351 }] },
  land_05: { neutral: [{ x: 710, y: 976 }, { x: 675, y: 1026 }, { x: 702, y: 1090 }], negative: [{ x: 966, y: 868 }, { x: 642, y: 1069 }, { x: 846, y: 1085 }], positive: [{ x: 1002, y: 891 }, { x: 714, y: 1128 }, { x: 937, y: 1000 }] },
  land_06: { neutral: [{ x: 853, y: 649 }, { x: 874, y: 693 }, { x: 920, y: 726 }], negative: [{ x: 799, y: 672 }, { x: 1035, y: 710 }, { x: 905, y: 750 }], positive: [{ x: 1000, y: 608 }, { x: 1028, y: 637 }, { x: 867, y: 740 }] },
  etc_lake: { neutral: [{ x: 474, y: 529 }, { x: 504, y: 791 }, { x: 620, y: 889 }], negative: [{ x: 546, y: 691 }, { x: 495, y: 738 }, { x: 825, y: 814 }], positive: [{ x: 745, y: 706 }, { x: 780, y: 733 }, { x: 579, y: 825 }] }
};

function activeV4MoodDeco(visible: ContinentSlice[], data: ReturnType<typeof buildUniverse>) {
  const targets = [
    ...visible.slice(0, 6).map((continent, index) => ({ slot: v4RankSlots[index], entries: continent.entries })),
    { slot: "etc_lake" as V4SlotKey, entries: data.etcEntries }
  ];
  return (["neutral", "negative", "positive"] as MoodGroup[]).flatMap((group) => targets.flatMap(({ slot, entries }) => {
    const count = Math.min(3, Math.floor(moodGroupCounts(entries)[group] / 3));
    return v4MoodDecoPositions[slot][group].slice(0, count).map((center, index) => {
      const source = slot === "etc_lake" && group === "neutral"
        ? v4StreetlightMoodAsset
        : v4MoodDecoAssets[group][index % v4MoodDecoAssets[group].length];
      const slotScale = slot === "land_06" && group === "neutral" ? 0.9 : 1;
      return { ...source, width: source.width * slotScale, key: `${slot}-${group}-${index}`, center: { x: center.x, y: center.y - 25 }, group, slot };
    });
  }));
}

type V4AssetSpec = {
  source: ImageSourcePropType;
  canvas: { width: number; height: number };
  alphaBox: ContinentBounds;
  alphaCenter: { x: number; y: number };
};

type V4SlotSpec = {
  key: V4SlotKey;
  box: ContinentBounds;
  levelCenters: Record<V4Level, { x: number; y: number }>;
  lv1Side: V4AssetSide;
  assetSide: V4AssetSide;
  areaRatio: Record<V4Level, number>;
};

type V4PlacementSpec = {
  levelCenters: Record<V4Level, { x: number; y: number }>;
  sides: Record<V4Level, V4AssetSide>;
  areaRatio: Record<V4Level, number>;
};

const v4Assets: Record<V4Category, Record<V4Level, Partial<Record<V4AssetSide, V4AssetSpec>>>> = {
  work: {
    1: {
      left: { source: require("../../assets/assets_v4/continent/work_lv1_apple_tree_left.png"), canvas: { width: 1536, height: 1024 }, alphaBox: { x: 138, y: 32, width: 1291, height: 951 }, alphaCenter: { x: 778, y: 590 } },
      right: { source: require("../../assets/assets_v4/continent/work_lv1_apple_tree_right.png"), canvas: { width: 1536, height: 1024 }, alphaBox: { x: 59, y: 217, width: 1418, height: 662 }, alphaCenter: { x: 756, y: 558 } }
    },
    2: {
      left: { source: require("../../assets/assets_v4/continent/work_lv2_house_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 119, y: 117, width: 1033, height: 1052 }, alphaCenter: { x: 645, y: 649 } },
      right: { source: require("../../assets/assets_v4/continent/work_lv2_house_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 107, y: 180, width: 1074, height: 979 }, alphaCenter: { x: 625, y: 683 } }
    },
    3: {
      left: { source: require("../../assets/assets_v4/continent/work_lv3_farmers_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 128, y: 131, width: 989, height: 962 }, alphaCenter: { x: 634, y: 626 } },
      right: { source: require("../../assets/assets_v4/continent/work_lv3_farmers_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 128, y: 131, width: 989, height: 962 }, alphaCenter: { x: 634, y: 626 } }
    },
    4: {
      right: { source: require("../../assets/assets_v4/continent/work_lv4_cow_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 90, y: 119, width: 1101, height: 982 }, alphaCenter: { x: 640, y: 606 } }
    }
  },
  taste: {
    1: {
      left: { source: require("../../assets/assets_v4/continent/taste_lv1_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 80, y: 82, width: 1104, height: 1109 }, alphaCenter: { x: 633, y: 646 } },
      right: { source: require("../../assets/assets_v4/continent/taste_lv1_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 85, y: 119, width: 1072, height: 1008 }, alphaCenter: { x: 624, y: 613 } }
    },
    2: {
      left: { source: require("../../assets/assets_v4/continent/taste_lv2_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 90, y: 25, width: 1062, height: 1203 }, alphaCenter: { x: 617, y: 741 } },
      right: { source: require("../../assets/assets_v4/continent/taste_lv2_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 107, y: 26, width: 1057, height: 1202 }, alphaCenter: { x: 629, y: 727 } }
    },
    3: {
      left: { source: require("../../assets/assets_v4/continent/taste_lv3_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 161, y: 90, width: 951, height: 1084 }, alphaCenter: { x: 628, y: 631 } },
      right: { source: require("../../assets/assets_v4/continent/taste_lv3_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 142, y: 90, width: 951, height: 1084 }, alphaCenter: { x: 625, y: 631 } }
    },
    4: {
      left: { source: require("../../assets/assets_v4/continent/taste_lv4_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 127, y: 136, width: 986, height: 1004 }, alphaCenter: { x: 619, y: 636 } },
      right: { source: require("../../assets/assets_v4/continent/taste_lv4_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 141, y: 136, width: 986, height: 1004 }, alphaCenter: { x: 634, y: 636 } }
    }
  },
  relationship: {
    1: {
      left: { source: require("../../assets/assets_v4/continent/relationship_lv1_left.png"), canvas: { width: 1402, height: 1122 }, alphaBox: { x: 79, y: 104, width: 1239, height: 907 }, alphaCenter: { x: 694, y: 664 } },
      right: { source: require("../../assets/assets_v4/continent/relationship_lv1_right.png"), canvas: { width: 1402, height: 1122 }, alphaBox: { x: 48, y: 109, width: 1319, height: 865 }, alphaCenter: { x: 706, y: 678 } }
    },
    2: {
      left: { source: require("../../assets/assets_v4/continent/relationship_lv2_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 127, y: 53, width: 1010, height: 1150 }, alphaCenter: { x: 635, y: 783 } },
      right: { source: require("../../assets/assets_v4/continent/relationship_lv2_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 158, y: 63, width: 938, height: 1089 }, alphaCenter: { x: 628, y: 772 } }
    },
    3: {
      left: { source: require("../../assets/assets_v4/continent/relationship_lv3_left.png"), canvas: { width: 1448, height: 1086 }, alphaBox: { x: 87, y: 117, width: 1263, height: 855 }, alphaCenter: { x: 740, y: 542 } }
    },
    4: {
      left: { source: require("../../assets/assets_v4/continent/relationship_lv4_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 93, y: 207, width: 1098, height: 825 }, alphaCenter: { x: 616, y: 663 } },
      right: { source: require("../../assets/assets_v4/continent/relationship_lv4_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 63, y: 207, width: 1098, height: 825 }, alphaCenter: { x: 637, y: 663 } }
    }
  },
  "self-discipline": {
    1: {
      left: { source: require("../../assets/assets_v4/continent/self-discipline_lv1_willow_tree_left.png"), canvas: { width: 1360, height: 1156 }, alphaBox: { x: 137, y: 40, width: 1091, height: 1058 }, alphaCenter: { x: 689, y: 579 } },
      right: { source: require("../../assets/assets_v4/continent/self-discipline_lv1_willow_tree_right.png"), canvas: { width: 1344, height: 1170 }, alphaBox: { x: 183, y: 93, width: 989, height: 1005 }, alphaCenter: { x: 695, y: 607 } }
    },
    2: {
      left: { source: require("../../assets/assets_v4/continent/self-discipline_lv2_fond_left.png"), canvas: { width: 1402, height: 1122 }, alphaBox: { x: 57, y: 157, width: 1289, height: 779 }, alphaCenter: { x: 703, y: 551 } },
      right: { source: require("../../assets/assets_v4/continent/self-discipline_lv2_fond_right.png"), canvas: { width: 1402, height: 1122 }, alphaBox: { x: 57, y: 157, width: 1289, height: 779 }, alphaCenter: { x: 703, y: 551 } }
    },
    3: {
      left: { source: require("../../assets/assets_v4/continent/self-discipline_lv3_meditation_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 224, y: 129, width: 810, height: 954 }, alphaCenter: { x: 631, y: 687 } },
      right: { source: require("../../assets/assets_v4/continent/self-discipline_lv3_meditation_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 313, y: 185, width: 592, height: 835 }, alphaCenter: { x: 626, y: 675 } }
    },
    4: {
      left: { source: require("../../assets/assets_v4/continent/self-discipline_lv4_left.png"), canvas: { width: 1448, height: 1086 }, alphaBox: { x: 139, y: 166, width: 1214, height: 715 }, alphaCenter: { x: 707, y: 566 } },
      right: { source: require("../../assets/assets_v4/continent/self-discipline_lv4_right.png"), canvas: { width: 1448, height: 1086 }, alphaBox: { x: 95, y: 166, width: 1214, height: 715 }, alphaCenter: { x: 740, y: 566 } }
    }
  },
  wealth: {
    1: {
      left: { source: require("../../assets/assets_v4/continent/wealth_lv1_mine_left.png"), canvas: { width: 1402, height: 1122 }, alphaBox: { x: 78, y: 78, width: 1248, height: 959 }, alphaCenter: { x: 680, y: 620 } },
      right: { source: require("../../assets/assets_v4/continent/wealth_lv1_mine_right.png"), canvas: { width: 1402, height: 1122 }, alphaBox: { x: 71, y: 111, width: 1258, height: 907 }, alphaCenter: { x: 723, y: 622 } }
    },
    2: {
      left: { source: require("../../assets/assets_v4/continent/wealth_lv2_gold_left.png"), canvas: { width: 1402, height: 1122 }, alphaBox: { x: 350, y: 262, width: 700, height: 650 }, alphaCenter: { x: 714, y: 578 } },
      right: { source: require("../../assets/assets_v4/continent/wealth_lv2_gold_right.png"), canvas: { width: 1402, height: 1122 }, alphaBox: { x: 352, y: 262, width: 700, height: 650 }, alphaCenter: { x: 687, y: 578 } }
    },
    3: {
      left: { source: require("../../assets/assets_v4/continent/wealth_lv3_oilmoney_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 66, y: 78, width: 1130, height: 1086 }, alphaCenter: { x: 614, y: 719 } },
      right: { source: require("../../assets/assets_v4/continent/wealth_lv3_oilmoney_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 119, y: 119, width: 1092, height: 1026 }, alphaCenter: { x: 608, y: 709 } }
    },
    4: {
      left: { source: require("../../assets/assets_v4/continent/wealth_lv4_goldenpig_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 140, y: 189, width: 1015, height: 909 }, alphaCenter: { x: 618, y: 640 } },
      right: { source: require("../../assets/assets_v4/continent/wealth_lv4_goldenpig_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 98, y: 218, width: 1005, height: 819 }, alphaCenter: { x: 623, y: 610 } }
    }
  },
  health: {
    1: {
      left: { source: require("../../assets/assets_v4/continent/health_lv1_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 65, y: 53, width: 1102, height: 1126 }, alphaCenter: { x: 620, y: 721 } },
      right: { source: require("../../assets/assets_v4/continent/health_lv1_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 88, y: 53, width: 1103, height: 1126 }, alphaCenter: { x: 634, y: 720 } }
    },
    2: {
      left: { source: require("../../assets/assets_v4/continent/health_lv2_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 90, y: 63, width: 1104, height: 1096 }, alphaCenter: { x: 637, y: 667 } },
      right: { source: require("../../assets/assets_v4/continent/health_lv2_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 90, y: 63, width: 1104, height: 1096 }, alphaCenter: { x: 637, y: 667 } }
    },
    3: {
      left: { source: require("../../assets/assets_v4/continent/health_lv3_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 151, y: 100, width: 947, height: 1084 }, alphaCenter: { x: 612, y: 639 } },
      right: { source: require("../../assets/assets_v4/continent/health_lv3_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 107, y: 124, width: 979, height: 1003 }, alphaCenter: { x: 626, y: 577 } }
    },
    4: {
      left: { source: require("../../assets/assets_v4/continent/health_lv4_left.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 173, y: 212, width: 925, height: 773 }, alphaCenter: { x: 576, y: 631 } },
      right: { source: require("../../assets/assets_v4/continent/health_lv4_right.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 156, y: 212, width: 925, height: 773 }, alphaCenter: { x: 677, y: 631 } }
    }
  },
  etc: {
    1: { center: { source: require("../../assets/assets_v4/continent/etc_lv1.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 198, y: 55, width: 866, height: 1102 }, alphaCenter: { x: 614, y: 749 } } },
    2: { center: { source: require("../../assets/assets_v4/continent/etc_lv2.png"), canvas: { width: 1536, height: 1024 }, alphaBox: { x: 191, y: 197, width: 1124, height: 666 }, alphaCenter: { x: 739, y: 541 } } },
    3: { center: { source: require("../../assets/assets_v4/continent/etc_lv3.png"), canvas: { width: 1536, height: 1024 }, alphaBox: { x: 110, y: 291, width: 1346, height: 558 }, alphaCenter: { x: 767, y: 620 } } },
    4: { center: { source: require("../../assets/assets_v4/continent/etc_lv4.png"), canvas: { width: 1254, height: 1254 }, alphaBox: { x: 124, y: 269, width: 1023, height: 731 }, alphaCenter: { x: 573, y: 659 } } }
  }
};

const v4Slots: Record<V4SlotKey, V4SlotSpec> = {
  land_01: {
    key: "land_01",
    box: { x: 44, y: 705, width: 554, height: 479 },
    levelCenters: { 1: { x: 235, y: 805 }, 2: { x: 350, y: 920 }, 3: { x: 235, y: 1040 }, 4: { x: 440, y: 1035 } },
    lv1Side: "left",
    assetSide: "left",
    areaRatio: { 1: 0.33, 2: 0.19, 3: 0.18, 4: 0.18 }
  },
  land_02: {
    key: "land_02",
    box: { x: 62, y: 249, width: 425, height: 506 },
    levelCenters: { 1: { x: 190, y: 380 }, 2: { x: 325, y: 520 }, 3: { x: 205, y: 620 }, 4: { x: 345, y: 690 } },
    lv1Side: "left",
    assetSide: "left",
    areaRatio: { 1: 0.33, 2: 0.17, 3: 0.16, 4: 0.15 }
  },
  land_03: {
    key: "land_03",
    box: { x: 601, y: 340, width: 363, height: 285 },
    levelCenters: { 1: { x: 850, y: 415 }, 2: { x: 735, y: 485 }, 3: { x: 845, y: 530 }, 4: { x: 720, y: 565 } },
    lv1Side: "right",
    assetSide: "right",
    areaRatio: { 1: 0.33, 2: 0.15, 3: 0.14, 4: 0.14 }
  },
  land_04: {
    key: "land_04",
    box: { x: 404, y: 145, width: 461, height: 248 },
    levelCenters: { 1: { x: 620, y: 245 }, 2: { x: 500, y: 305 }, 3: { x: 720, y: 310 }, 4: { x: 610, y: 345 } },
    lv1Side: "center",
    assetSide: "right",
    areaRatio: { 1: 0.33, 2: 0.16, 3: 0.14, 4: 0.13 }
  },
  land_05: {
    key: "land_05",
    box: { x: 633, y: 857, width: 379, height: 287 },
    levelCenters: { 1: { x: 900, y: 930 }, 2: { x: 760, y: 1000 }, 3: { x: 900, y: 1040 }, 4: { x: 790, y: 1110 } },
    lv1Side: "right",
    assetSide: "right",
    areaRatio: { 1: 0.33, 2: 0.15, 3: 0.14, 4: 0.14 }
  },
  land_06: {
    key: "land_06",
    box: { x: 816, y: 603, width: 227, height: 170 },
    levelCenters: { 1: { x: 970, y: 650 }, 2: { x: 900, y: 690 }, 3: { x: 975, y: 710 }, 4: { x: 910, y: 745 } },
    lv1Side: "right",
    assetSide: "right",
    areaRatio: { 1: 0.33, 2: 0.12, 3: 0.11, 4: 0.11 }
  },
  etc_lake: {
    key: "etc_lake",
    box: { x: 352, y: 252, width: 632, height: 703 },
    levelCenters: { 1: { x: 625, y: 640 }, 2: { x: 585, y: 730 }, 3: { x: 685, y: 815 }, 4: { x: 725, y: 880 } },
    lv1Side: "center",
    assetSide: "center",
    areaRatio: { 1: 0.1083, 2: 0.0467856, 3: 0.03779136, 4: 0.0241864704 }
  }
};

const v4RankSlots: V4SlotKey[] = ["land_01", "land_02", "land_03", "land_04", "land_05", "land_06"];

const workV4Placements: Partial<Record<V4SlotKey, V4PlacementSpec>> = {
    land_01: {
      levelCenters: { 1: { x: 235, y: 805 }, 2: { x: 428, y: 811 }, 3: { x: 295, y: 925 }, 4: { x: 445, y: 1032 } },
      sides: { 1: "left", 2: "left", 3: "left", 4: "right" },
      areaRatio: { 1: 0.33, 2: 0.124659, 3: 0.18, 4: 0.0648 }
    },
    land_02: {
      levelCenters: { 1: { x: 300, y: 390 }, 2: { x: 385, y: 445 }, 3: { x: 205, y: 535 }, 4: { x: 345, y: 595 } },
      sides: { 1: "left", 2: "left", 3: "left", 4: "right" },
      areaRatio: { 1: 0.33, 2: 0.17, 3: 0.16, 4: 0.098415 }
    },
    land_03: {
      levelCenters: { 1: { x: 805, y: 360 }, 2: { x: 860, y: 460 }, 3: { x: 710, y: 465 }, 4: { x: 750, y: 540 } },
      sides: { 1: "right", 2: "right", 3: "right", 4: "right" },
      areaRatio: { 1: 0.33, 2: 0.1815, 3: 0.14, 4: 0.1134 }
    },
    land_04: {
      levelCenters: { 1: { x: 625, y: 260 }, 2: { x: 535, y: 295 }, 3: { x: 730, y: 295 }, 4: { x: 620, y: 325 } },
      sides: { 1: "right", 2: "right", 3: "right", 4: "right" },
      areaRatio: { 1: 0.33, 2: 0.1444, 3: 0.1023435, 4: 0.09503325 }
    },
    land_05: {
      levelCenters: { 1: { x: 850, y: 900 }, 2: { x: 840, y: 970 }, 3: { x: 735, y: 970 }, 4: { x: 730, y: 1035 } },
      sides: { 1: "right", 2: "right", 3: "right", 4: "right" },
      areaRatio: { 1: 0.33, 2: 0.15, 3: 0.091854, 4: 0.072576 }
    },
    land_06: {
      levelCenters: { 1: { x: 940, y: 620 }, 2: { x: 880, y: 650 }, 3: { x: 955, y: 670 }, 4: { x: 890, y: 705 } },
      sides: { 1: "right", 2: "right", 3: "right", 4: "right" },
      areaRatio: { 1: 0.33, 2: 0.12, 3: 0.11, 4: 0.11 }
    }
};

const healthV4Placements = Object.fromEntries(
  Object.entries(workV4Placements).map(([slotKey, placement]) => [
    slotKey,
    placement ? {
      ...placement,
      areaRatio: { ...placement.areaRatio, 4: placement.areaRatio[4] * 0.7225 }
    } : placement
  ])
) as Partial<Record<V4SlotKey, V4PlacementSpec>>;

const relationshipV4Placements = Object.fromEntries(
  Object.entries(workV4Placements).map(([slotKey, placement]) => [
    slotKey,
    placement ? {
      ...placement,
      levelCenters: slotKey === "land_05"
        ? { ...placement.levelCenters, 1: { ...placement.levelCenters[1], x: placement.levelCenters[1].x + 60 } }
        : slotKey === "land_03"
          ? { ...placement.levelCenters, 3: { x: placement.levelCenters[3].x + 10, y: placement.levelCenters[3].y - 20 } }
          : placement.levelCenters,
      areaRatio: {
        ...placement.areaRatio,
        1: placement.areaRatio[1] * (slotKey === "land_05" ? 0.6561 : 1),
        2: placement.areaRatio[2] * 0.64 * (slotKey === "land_05" ? 0.6561 : 1),
        3: placement.areaRatio[3] * 0.64 * (slotKey === "land_03" ? 1.1025 : 1) * (slotKey === "land_05" ? 0.6561 : 1),
        4: placement.areaRatio[4] * 0.5625 * (slotKey === "land_05" ? 0.6561 : 1)
      }
    } : placement
  ])
) as Partial<Record<V4SlotKey, V4PlacementSpec>>;

const selfDisciplineSizeScales: Partial<Record<V4SlotKey, Partial<Record<V4Level, number>>>> = {
  land_01: { 1: 0.81, 3: 0.64, 4: 0.64 },
  land_02: { 1: 0.81, 2: 0.81, 3: 0.64, 4: 0.5184 },
  land_03: { 4: 0.81 },
  land_04: { 4: 0.64 },
  land_05: { 4: 0.6561 },
  land_06: { 1: 1.21, 4: 0.5184 }
};

const selfDisciplineOffsets: Partial<Record<V4SlotKey, Partial<Record<V4Level, { x: number; y: number }>>>> = {
  land_02: { 1: { x: -25, y: -30 } },
  land_03: { 1: { x: 0, y: -20 }, 3: { x: 0, y: -20 } },
  land_05: { 1: { x: 20, y: -40 } },
  land_06: { 1: { x: 10, y: -12 } }
};

const selfDisciplineV4Placements = Object.fromEntries(
  Object.entries(workV4Placements).map(([slotKey, placement]) => {
    if (!placement) return [slotKey, placement];
    const typedSlotKey = slotKey as V4SlotKey;
    const scales = selfDisciplineSizeScales[typedSlotKey] || {};
    const offsets = selfDisciplineOffsets[typedSlotKey] || {};
    const levels: V4Level[] = [1, 2, 3, 4];
    return [slotKey, {
      ...placement,
      levelCenters: Object.fromEntries(levels.map((level) => {
        const center = placement.levelCenters[level];
        const offset = offsets[level] || { x: 0, y: 0 };
        return [level, { x: center.x + offset.x, y: center.y + offset.y }];
      })) as Record<V4Level, { x: number; y: number }>,
      areaRatio: Object.fromEntries(levels.map((level) => [
        level,
        placement.areaRatio[level] * (scales[level] || 1)
      ])) as Record<V4Level, number>
    }];
  })
) as Partial<Record<V4SlotKey, V4PlacementSpec>>;

const wealthV4Placements = Object.fromEntries(
  Object.entries(workV4Placements).map(([slotKey, placement]) => [
    slotKey,
    placement ? {
      ...placement,
      levelCenters: {
        ...placement.levelCenters,
        1: { ...placement.levelCenters[1], x: placement.levelCenters[1].x + 20 }
      },
      areaRatio: {
        ...placement.areaRatio,
        2: placement.areaRatio[2] * 0.81,
        4: placement.areaRatio[4] * 0.81
      }
    } : placement
  ])
) as Partial<Record<V4SlotKey, V4PlacementSpec>>;

const tasteLv2Placements: Partial<Record<V4SlotKey, { center: { x: number; y: number }; areaRatio: number }>> = {
  land_01: { center: { x: 409, y: 866 }, areaRatio: 0.248897 },
  land_02: { center: { x: 385, y: 445 }, areaRatio: 0.17 },
  land_03: { center: { x: 868, y: 451 }, areaRatio: 0.2317762381 },
  land_04: { center: { x: 656, y: 288 }, areaRatio: 0.19155061 },
  land_05: { center: { x: 914, y: 942 }, areaRatio: 0.19155061 },
  land_06: { center: { x: 978, y: 645 }, areaRatio: 0.19155061 }
};

const tasteV4Placements = Object.fromEntries(
  Object.entries(workV4Placements).map(([slotKey, placement]) => {
    if (!placement) return [slotKey, placement];
    const lv2 = tasteLv2Placements[slotKey as V4SlotKey];
    if (!lv2) return [slotKey, placement];
    const levelCenters = { ...placement.levelCenters, 2: lv2.center };
    if (slotKey === "land_03") {
      levelCenters[1] = { ...levelCenters[1], x: levelCenters[1].x - 20 };
      levelCenters[4] = { ...levelCenters[4], x: levelCenters[4].x + 20 };
    }
    if (slotKey === "land_04") {
      levelCenters[1] = { ...levelCenters[1], y: levelCenters[1].y - 20 };
      const lv2Center = levelCenters[2];
      levelCenters[2] = { ...levelCenters[3], x: levelCenters[3].x - 210 };
      levelCenters[3] = lv2Center;
    }
    if (slotKey === "land_06") {
      levelCenters[1] = { x: levelCenters[1].x - 20, y: levelCenters[1].y - 20 };
      levelCenters[4] = { ...levelCenters[4], y: levelCenters[4].y - 15 };
    }
    const areaRatio = { ...placement.areaRatio, 2: lv2.areaRatio };
    if (slotKey === "land_01") areaRatio[3] *= 0.9025;
    if (slotKey === "land_04") areaRatio[4] *= 0.81;
    if (slotKey === "land_06") {
      ([1, 2, 3, 4] as V4Level[]).forEach((level) => { areaRatio[level] *= 1.21; });
    }
    return [slotKey, {
      ...placement,
      levelCenters,
      areaRatio
    }];
  })
) as Partial<Record<V4SlotKey, V4PlacementSpec>>;

const workCategoryV4Placements = Object.fromEntries(
  Object.entries(workV4Placements).map(([slotKey, placement]) => [
    slotKey,
    placement ? {
      ...placement,
      areaRatio: { ...placement.areaRatio, 4: placement.areaRatio[4] * 0.9025 }
    } : placement
  ])
) as Partial<Record<V4SlotKey, V4PlacementSpec>>;

type V4LevelAdjustment = { x?: number; y?: number; scale?: number };
type V4PlacementAdjustments = Partial<Record<V4SlotKey, Partial<Record<V4Level, V4LevelAdjustment>>>>;

function adjustV4Placements(
  placements: Partial<Record<V4SlotKey, V4PlacementSpec>>,
  adjustments: V4PlacementAdjustments
) {
  return Object.fromEntries(Object.entries(placements).map(([slotKey, placement]) => {
    if (!placement) return [slotKey, placement];
    const slotAdjustments = adjustments[slotKey as V4SlotKey] || {};
    const levels: V4Level[] = [1, 2, 3, 4];
    return [slotKey, {
      ...placement,
      levelCenters: Object.fromEntries(levels.map((level) => {
        const adjustment = slotAdjustments[level] || {};
        return [level, {
          x: placement.levelCenters[level].x + (adjustment.x || 0),
          y: placement.levelCenters[level].y + (adjustment.y || 0)
        }];
      })) as Record<V4Level, { x: number; y: number }>,
      areaRatio: Object.fromEntries(levels.map((level) => {
        const scale = slotAdjustments[level]?.scale || 1;
        return [level, placement.areaRatio[level] * scale * scale];
      })) as Record<V4Level, number>
    }];
  })) as Partial<Record<V4SlotKey, V4PlacementSpec>>;
}

const finalV4PlacementAdjustments: Record<Exclude<V4Category, "etc">, V4PlacementAdjustments> = {
  work: {
    land_01: { 3: { scale: 0.95 }, 4: { x: -25 } },
    land_03: { 3: { x: 50, scale: 0.9 }, 4: { x: 50 } },
    land_04: { 2: { y: -25, scale: 0.95 } },
    land_05: { 2: { x: 25, scale: 0.95 }, 3: { scale: 0.9 }, 4: { x: 25 } },
    land_06: { 1: { y: -25, scale: 1.1 }, 2: { x: 50 }, 3: { x: 50 }, 4: { x: 50 } }
  },
  taste: {
    land_02: { 4: { x: -50, scale: 0.9 } },
    land_03: { 2: { x: 50, scale: 1.05 }, 3: { x: 25 }, 4: { x: 25 } },
    land_04: { 2: { y: -25, scale: 0.95 } },
    land_05: { 1: { y: -25 }, 2: { x: 30 }, 3: { x: 50 }, 4: { x: 25 } },
    land_06: { 1: { y: -25 }, 3: { x: 50 }, 4: { x: 50, y: 25 } }
  },
  relationship: {
    land_01: { 2: { scale: 0.95 }, 4: { x: -25, scale: 1.1 } },
    land_02: { 1: { x: -50 }, 2: { x: -50 }, 3: { x: -50 }, 4: { x: -50 } },
    land_03: { 2: { y: -25, scale: 1.05 }, 3: { x: 25 }, 4: { x: 25 } },
    land_05: { 2: { y: -25, scale: 1.05 }, 3: { x: 50 }, 4: { x: 50 } },
    land_06: { 1: { x: 10 }, 2: { x: 50 }, 3: { x: 50 }, 4: { x: 50 } }
  },
  "self-discipline": {
    land_01: { 1: { x: -50, y: -50 }, 2: { x: -50, scale: 0.95 }, 4: { x: -25, y: -25 } },
    land_02: { 2: { scale: 0.9 }, 4: { x: -50, scale: 0.9 } },
    land_03: { 1: { y: -25 }, 3: { x: 25 }, 4: { x: 50 } },
    land_04: { 2: { scale: 0.95 }, 4: { scale: 0.95 } },
    land_05: { 2: { scale: 0.95 }, 3: { x: 20 }, 4: { x: 50 } },
    land_06: { 1: { y: -35 }, 2: { x: 25 }, 3: { x: 50 }, 4: { x: 50, y: 25 } }
  },
  wealth: {
    land_01: { 2: { y: 50, scale: 0.9 }, 4: { x: -25 } },
    land_02: { 2: { scale: 0.85 }, 4: { x: -70 } },
    land_03: { 2: { y: -50, scale: 0.95 }, 3: { x: 25, y: -25 }, 4: { x: 25 } },
    land_04: { 2: { scale: 0.95 } },
    land_05: { 2: { x: 25, scale: 0.95 }, 3: { x: 25, scale: 1.05 }, 4: { x: 50 } },
    land_06: { 2: { x: 100 }, 4: { x: 50, y: 50 } }
  },
  health: {
    land_01: { 1: { y: -25 } },
    land_02: { 3: { y: -25, scale: 0.9 }, 4: { x: -50, scale: 0.9 } },
    land_03: { 2: { y: -25 }, 3: { x: 25 }, 4: { x: 25 } },
    land_04: { 2: { y: -25 }, 4: { scale: 0.95 } },
    land_05: { 1: { x: 25 }, 2: { x: 25, y: -25 }, 3: { x: 25 }, 4: { x: 25 } },
    land_06: { 1: { x: 25 }, 2: { x: 25 }, 3: { x: 25 }, 4: { x: 50, y: 25 } }
  }
};

const v4CategoryPlacements: Partial<Record<UniverseCategory, Partial<Record<V4SlotKey, V4PlacementSpec>>>> = {
  work: adjustV4Placements(workCategoryV4Placements, finalV4PlacementAdjustments.work),
  taste: adjustV4Placements(tasteV4Placements, finalV4PlacementAdjustments.taste),
  relationship: adjustV4Placements(relationshipV4Placements, finalV4PlacementAdjustments.relationship),
  "self-discipline": adjustV4Placements(selfDisciplineV4Placements, finalV4PlacementAdjustments["self-discipline"]),
  wealth: adjustV4Placements(wealthV4Placements, finalV4PlacementAdjustments.wealth),
  health: adjustV4Placements(healthV4Placements, finalV4PlacementAdjustments.health)
};

function continentAssetSource(rank: UniverseContinentRank, category: UniverseCategory, level: UniverseContinentLevel) {
  if (level === "bare") return v3ContinentBareAssets[rank];
  return v3ContinentAssets[rank][category][level];
}

function continentLayerFrame(rank: UniverseContinentRank, visualSize: number) {
  const target = v3ContinentFrames[rank];
  return {
    left: target.x * visualSize,
    top: target.y * visualSize,
    width: target.width * visualSize,
    height: target.height * visualSize
  };
}

function v4AssetFor(category: V4Category, level: V4Level, side: V4AssetSide) {
  const levelAssets = v4Assets[category][level];
  return levelAssets[side] || levelAssets.center || levelAssets.right || levelAssets.left;
}

function v4PlacementFor(category: V4Category, slot: V4SlotSpec): V4PlacementSpec {
  const categoryPlacement = category === "etc" ? undefined : v4CategoryPlacements[category]?.[slot.key];
  return categoryPlacement || {
    levelCenters: slot.levelCenters,
    sides: { 1: slot.lv1Side, 2: slot.assetSide, 3: slot.assetSide, 4: slot.assetSide },
    areaRatio: slot.areaRatio
  };
}

function v4LayerScale(slot: V4SlotSpec, placement: V4PlacementSpec, asset: V4AssetSpec, level: V4Level) {
  const slotArea = slot.box.width * slot.box.height;
  const assetArea = asset.alphaBox.width * asset.alphaBox.height;
  const areaFitScale = Math.sqrt((slotArea * placement.areaRatio[level]) / assetArea);
  const dimensionCap = Math.min(slot.box.width / asset.alphaBox.width, slot.box.height / asset.alphaBox.height) * 0.92;
  return Math.min(areaFitScale, dimensionCap);
}

function v4LayerFrame(slot: V4SlotSpec, placement: V4PlacementSpec, asset: V4AssetSpec, level: V4Level, visualWidth: number, visualHeight: number) {
  const sourceCenter = placement.levelCenters[level];
  const sourceScale = v4LayerScale(slot, placement, asset, level);
  const sourceLeft = sourceCenter.x - asset.alphaCenter.x * sourceScale;
  const sourceTop = sourceCenter.y - asset.alphaCenter.y * sourceScale;
  return {
    left: (sourceLeft / V4_PLANET_WIDTH) * visualWidth,
    top: (sourceTop / V4_PLANET_HEIGHT) * visualHeight,
    width: (asset.canvas.width * sourceScale / V4_PLANET_WIDTH) * visualWidth,
    height: (asset.canvas.height * sourceScale / V4_PLANET_HEIGHT) * visualHeight
  };
}

function v4SlotFrame(slot: V4SlotSpec, visualWidth: number, visualHeight: number) {
  return {
    left: (slot.box.x / V4_PLANET_WIDTH) * visualWidth,
    top: (slot.box.y / V4_PLANET_HEIGHT) * visualHeight,
    width: (slot.box.width / V4_PLANET_WIDTH) * visualWidth,
    height: (slot.box.height / V4_PLANET_HEIGHT) * visualHeight
  };
}

function continentEnergyRank(continents: ContinentSlice[], continent: ContinentSlice) {
  const ranked = [...continents]
    .filter((item) => item.count > 0)
    .sort((a, b) => averageEnergy(b.entries) - averageEnergy(a.entries) || b.count - a.count);
  return ranked.findIndex((item) => item.key === continent.key) + 1;
}

function continentComment(continent: ContinentSlice, rank: number, energyRank: number) {
  const shareText = rank === 1
    ? "당신의 기록 중 가장 큰 비중을 차지하는 카테고리입니다."
    : rank === 2
      ? "당신의 기록 중 2번째로 큰 비중을 차지하는 카테고리입니다."
      : "당신의 기록 중 3번째로 큰 비중을 차지하는 카테고리입니다.";
  const energy = averageEnergy(continent.entries);
  let energyText = "하지만 에너지 사용이 가장 큰 것은 아닙니다.";
  if (energyRank === 1) {
    energyText = "에너지 사용 역시 가장 큰 비중을 차지하고 있습니다.";
  } else if (energy >= 70) {
    energyText = "평균 사용 에너지가 70% 이상인 것으로 봐서, 이 카테고리에 많은 에너지를 쏟고 있군요. 당신이 원하는 방향인가요?";
  } else if (energy >= 30) {
    energyText = "기록의 비중은 높지만, 평균 사용 에너지는 보통 수준입니다.";
  }
  return `${shareText} ${energyText}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

const backgroundStars = Array.from({ length: 132 }).map((_, index) => ({
  left: 3 + ((index * 37 + (index % 7) * 11) % 94),
  top: 4 + ((index * 53 + (index % 9) * 13) % 88),
  opacity: 0.12 + ((index % 6) * 0.065),
  scale: 0.34 + (index % 5) * 0.105
}));

const constellationStars = [
  // Big Dipper
  { left: 9, top: 20, scale: 1.1 }, { left: 15, top: 17, scale: 0.9 }, { left: 21, top: 18, scale: 0.86 },
  { left: 27, top: 15, scale: 1.05 }, { left: 33, top: 12, scale: 0.78 }, { left: 39, top: 12.5, scale: 0.76 },
  { left: 45, top: 15, scale: 0.82 },
  // Cassiopeia
  { left: 70, top: 13, scale: 0.86 }, { left: 75, top: 17, scale: 0.74 }, { left: 80, top: 12, scale: 0.9 },
  { left: 85, top: 17, scale: 0.74 }, { left: 91, top: 14, scale: 0.86 },
  // Orion
  { left: 72, top: 63, scale: 0.96 }, { left: 83, top: 62, scale: 0.98 }, { left: 75, top: 72, scale: 0.8 },
  { left: 79, top: 72.6, scale: 0.76 }, { left: 83, top: 73, scale: 0.8 }, { left: 73, top: 82, scale: 0.88 },
  { left: 86, top: 82, scale: 0.92 }
];

const scenarioCategoryToEntryCategory: Record<V4Category, EntryCategory> = {
  work: "work",
  taste: "taste",
  relationship: "relationship",
  "self-discipline": "selfDiscipline",
  wealth: "wealth",
  health: "health",
  etc: "other"
};

const universeScenarios: UniverseScenario[] = [
  { title: "업무 집중", counts: { work: 18, health: 7, "self-discipline": 5, etc: 3, relationship: 2 } },
  { title: "취향 폭발", counts: { taste: 16, etc: 10, relationship: 8, work: 5, health: 1 } },
  { title: "관계의 달", counts: { relationship: 15, "self-discipline": 9, taste: 5, wealth: 2, etc: 1 } },
  { title: "성찰 성장", counts: { "self-discipline": 18, health: 12, work: 8, taste: 5, etc: 4, relationship: 2 } },
  { title: "돈 관리", counts: { wealth: 15, work: 12, etc: 7, health: 5, "self-discipline": 2 } },
  { title: "건강 회복", counts: { health: 18, "self-discipline": 8, taste: 5, etc: 2, relationship: 2 } },
  { title: "균형형", counts: { work: 8, taste: 8, relationship: 8, "self-discipline": 8, wealth: 8, health: 8, etc: 8 } },
  { title: "두 대륙", counts: { relationship: 12, taste: 5, etc: 3 } },
  { title: "첫 기록", counts: { work: 1 } },
  { title: "여섯 조각", counts: { work: 15, taste: 12, etc: 10, relationship: 8, "self-discipline": 5, wealth: 2, health: 1 } },
  { title: "기록 포화", counts: { work: 30, taste: 30, relationship: 30, "self-discipline": 30, wealth: 30, health: 30, etc: 27 } },
  { title: "일과 회복 집중", counts: { work: 42, health: 36, "self-discipline": 30, taste: 24, relationship: 18, wealth: 15, etc: 12 } },
  { title: "관계와 취향 확장", counts: { relationship: 39, taste: 36, work: 27, health: 24, "self-discipline": 21, wealth: 18, etc: 15 } },
  { title: "자산과 성장 가속", counts: { wealth: 42, "self-discipline": 39, work: 33, health: 27, taste: 21, relationship: 18, etc: 12 } },
  { title: "고밀도 균형", counts: { work: 27, taste: 27, relationship: 27, "self-discipline": 27, wealth: 27, health: 27, etc: 27 } }
];

const scenarioCategoryLabels: Record<V4Category, string> = {
  work: "일",
  taste: "취향",
  relationship: "관계",
  "self-discipline": "성찰",
  wealth: "돈",
  health: "건강",
  etc: "기타"
};

function buildScenarioEntries(scenarioIndex: number, monthKey: string): Entry[] {
  const scenario = universeScenarios[scenarioIndex];
  if (!scenario) return [];
  const [year, month] = monthKey.split("-").map(Number);
  const moods: Mood[] = scenarioIndex >= 10
    ? ["hopeful", "tired", "reflective"]
    : ["hopeful", "grateful", "calm", "proud", "reflective", "curious", "tired", "accepting"];
  const entries: Entry[] = [];
  Object.entries(scenario.counts).forEach(([category, count]) => {
    Array.from({ length: count || 0 }).forEach((_, index) => {
      const day = (entries.length % 24) + 1;
      entries.push({
        id: `scenario-${scenarioIndex}-${category}-${index}`,
        text: `${scenario.title} 시나리오의 ${scenarioCategoryLabels[category as V4Category]} 기록`,
        mood: moods[(entries.length + index) % moods.length],
        energy: 35 + ((entries.length * 9 + index * 7) % 56),
        createdAt: new Date(year, month - 1, day, 10 + (index % 10), 0, 0).toISOString(),
        category: scenarioCategoryToEntryCategory[category as V4Category]
      });
    });
  });
  return entries;
}

export function UniverseScreen({ entries }: Props) {
  const [rotationIndex, setRotationIndex] = useState(0);
  const [selectedContinentKey, setSelectedContinentKey] = useState<UniverseCategory | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => latestMonthKey(entries));
  const [scenarioIndex, setScenarioIndex] = useState<number | null>(10);
  const [savingPlanet, setSavingPlanet] = useState(false);
  const { width } = useWindowDimensions();
  const saveTargetRef = useRef<View | null>(null);
  const monthKeys = useMemo(() => availableMonthKeys(entries), [entries]);
  const scenarioEntries = useMemo(
    () => scenarioIndex === null ? [] : buildScenarioEntries(scenarioIndex, selectedMonthKey),
    [scenarioIndex, selectedMonthKey]
  );
  const monthEntries = useMemo(
    () => scenarioIndex === null ? entriesInMonth(entries, selectedMonthKey) : scenarioEntries,
    [entries, scenarioEntries, scenarioIndex, selectedMonthKey]
  );
  const data = useMemo(() => buildUniverse(monthEntries), [monthEntries]);
  const continents = useMemo(() => topContinents(data), [data]);
  const selectedContinent = continents.find((continent) => continent.key === selectedContinentKey) || null;
  const planetSize = Math.min(width - 24, 390);

  useEffect(() => {
    setSelectedMonthKey((current) => monthKeys.includes(current) ? current : latestMonthKey(entries));
  }, [entries, monthKeys]);

  const rotatePlanet = (direction: number) => {
    setRotationIndex((current) => {
      if (continents.length <= 6) return 0;
      return (current + direction + continents.length) % continents.length;
    });
  };
  const changeMonth = (direction: number) => {
    setSelectedMonthKey((current) => shiftMonth(current, direction));
    setSelectedContinentKey(null);
    setRotationIndex(0);
  };
  const changeScenario = (direction: number) => {
    setScenarioIndex((current) => {
      const base = current ?? 0;
      return (base + direction + universeScenarios.length) % universeScenarios.length;
    });
    setSelectedContinentKey(null);
    setRotationIndex(0);
  };
  const savePlanetImage = async () => {
    const target = saveTargetRef.current;
    if (!target || savingPlanet) return;
    setSavingPlanet(true);
    try {
      const MediaLibrary = require("expo-media-library") as typeof import("expo-media-library");
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("사진 저장 권한이 필요해.");
        return;
      }
      const { captureRef } = require("react-native-view-shot") as typeof import("react-native-view-shot");
      const uri = await captureRef(target, {
        format: "png",
        quality: 1,
        result: "tmpfile"
      });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("이미지 저장 완료", `${monthLabelFromKey(selectedMonthKey)} 행성을 저장했어.`);
    } catch (error) {
      console.warn("Planet image save failed", error);
      Alert.alert("이미지 저장 실패", "잠시 후 다시 시도해줘.");
    } finally {
      setSavingPlanet(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.universeToolbar}>
        <Pressable style={styles.monthButton} onPress={() => changeMonth(-1)}>
          <Text style={styles.monthButtonText}>‹</Text>
        </Pressable>
        <View style={styles.monthTitleWrap}>
          <Text style={styles.monthTitle}>{monthLabelFromKey(selectedMonthKey)}</Text>
          <Text style={styles.monthSubtitle}>{scenarioIndex === null ? `기록 ${monthEntries.length}개` : universeScenarios[scenarioIndex].title}</Text>
        </View>
        <Pressable style={styles.monthButton} onPress={() => changeMonth(1)}>
          <Text style={styles.monthButtonText}>›</Text>
        </Pressable>
        <Pressable style={[styles.savePlanetButton, savingPlanet && styles.disabledButton]} onPress={savePlanetImage} disabled={savingPlanet}>
          <Text style={styles.savePlanetText}>{savingPlanet ? "저장 중" : "공유하기"}</Text>
        </Pressable>
      </View>
      <View style={styles.planetOnlyWrap}>
        <View collapsable={false} ref={saveTargetRef} style={styles.planetCaptureCard}>
          <Text style={styles.captureMonthLabel}>{monthLabelFromKey(selectedMonthKey)}</Text>
          {scenarioIndex !== null ? (
            <Text style={styles.captureScenarioLabel}>{scenarioIndex + 1}. {universeScenarios[scenarioIndex].title}</Text>
          ) : null}
          <PlanetIllustration
            size={planetSize}
            data={data}
            continents={continents}
            rotationIndex={rotationIndex}
            onRotate={rotatePlanet}
            onOpenContinent={setSelectedContinentKey}
            enableContinentHits
            showChrome={false}
          />
        </View>
        <View style={styles.scenarioNavigator}>
          <Pressable
            style={styles.scenarioArrowButton}
            onPress={() => changeScenario(-1)}
          >
            <Text style={styles.scenarioArrowText}>‹</Text>
          </Pressable>
          <Pressable
            style={styles.scenarioTitleButton}
            onPress={() => {
              setScenarioIndex((current) => current === null ? 0 : null);
              setSelectedContinentKey(null);
              setRotationIndex(0);
            }}
          >
            <Text style={styles.scenarioTitleText}>
              {scenarioIndex === null ? "실제 기록" : `${scenarioIndex + 1} / ${universeScenarios.length}  ${universeScenarios[scenarioIndex].title}`}
            </Text>
            <Text style={styles.scenarioModeText}>{scenarioIndex === null ? "시나리오 보기" : "실제 기록으로 전환"}</Text>
          </Pressable>
          <Pressable style={styles.scenarioArrowButton} onPress={() => changeScenario(1)}>
            <Text style={styles.scenarioArrowText}>›</Text>
          </Pressable>
        </View>
        {scenarioIndex !== null ? (
          <View style={styles.scenarioCountStrip}>
            {(Object.entries(universeScenarios[scenarioIndex].counts) as Array<[V4Category, number]>).map(([category, count]) => (
              <View key={category} style={styles.scenarioCountItem}>
                <Text style={styles.scenarioCountText}>{scenarioCategoryLabels[category]} {count}</Text>
              </View>
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scenarioStrip}>
            {universeScenarios.map((scenario, index) => (
            <Pressable
              key={scenario.title}
              style={styles.scenarioChip}
              onPress={() => {
                setScenarioIndex(index);
                setSelectedContinentKey(null);
                setRotationIndex(0);
              }}
            >
              <Text style={styles.scenarioChipText}>{index + 1}. {scenario.title}</Text>
            </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
      {selectedContinent ? (
        <ContinentInsightOverlay
          continent={selectedContinent}
          continents={continents}
          rank={continents.findIndex((continent) => continent.key === selectedContinent.key) + 1}
          assetRank={(Math.max(0, continents.findIndex((continent) => continent.key === selectedContinent.key)) + 1) as UniverseContinentRank}
          monthKey={selectedMonthKey}
          onClose={() => setSelectedContinentKey(null)}
        />
      ) : null}
    </View>
  );
}

export function SpaceBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.nebula, styles.nebulaMint]} />
      <View style={[styles.nebula, styles.nebulaPurple]} />
      <View style={[styles.nebula, styles.nebulaPink]} />
      {backgroundStars.map((star, index) => (
        <View
          key={`background-star-${index}`}
          style={[
            styles.star,
            {
              left: `${star.left}%`,
              top: `${star.top}%`,
              opacity: star.opacity,
              transform: [{ scale: star.scale }]
            }
          ]}
        />
      ))}
      {constellationStars.map((star, index) => (
        <View
          key={`constellation-star-${index}`}
          style={[
            styles.constellationStar,
            {
              left: `${star.left}%`,
              top: `${star.top}%`,
              transform: [{ scale: star.scale }]
            }
          ]}
        />
      ))}
    </View>
  );
}

function UniverseHome({
  data,
  continents,
  planetSize,
  rotationIndex,
  onRotate,
  onOpenPlanet,
  onOpenContinent
}: {
  data: ReturnType<typeof buildUniverse>;
  continents: ContinentSlice[];
  planetSize: number;
  rotationIndex: number;
  onRotate: (direction: number) => void;
  onOpenPlanet: () => void;
  onOpenContinent: (category: UniverseCategory) => void;
}) {
  return (
    <>
      <Pressable style={styles.currentPlanetCard} onPress={onOpenPlanet}>
        <View style={styles.currentPlanetHeader}>
          <View>
            <Text style={styles.sectionMeta}>현재 행성</Text>
            <Text style={styles.heroTitle}>기록의 행성</Text>
            <Text style={styles.heroSub}>{data.period}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
        <PlanetIllustration
          size={planetSize}
          data={data}
          continents={continents}
          rotationIndex={rotationIndex}
          onRotate={onRotate}
          onOpenContinent={onOpenContinent}
          compact
        />
      </Pressable>

      <View style={styles.statsGrid}>
        <StatCard label="기록 개수" value={data.totalEntries} unit="개" />
        <StatCard label="연속 기록" value={data.streak} unit="일" />
        <StatCard label="감정 종류" value={data.moodKinds} unit="가지" />
        <StatCard label="방문한 영역" value={data.visitedAreas} unit="곳" />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>나의 행성들</Text>
        <Pressable style={styles.addPlanetButton}>
          <Text style={styles.addPlanetText}>＋</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planetList}>
        {[
          ["첫 행성", "2026.05"],
          ["도전의 행성", "2026.06"],
          ["기록의 행성", data.period]
        ].map(([name, period], index) => (
          <View key={name} style={[styles.planetThumb, index === 2 && styles.planetThumbActive]}>
            <MiniPlanet index={index} />
            <Text style={styles.thumbName}>{name}</Text>
            <Text style={styles.thumbPeriod}>{period}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

function PlanetDetail({
  data,
  continents,
  planetSize,
  rotationIndex,
  onRotate,
  onOpenContinent
}: {
  data: ReturnType<typeof buildUniverse>;
  continents: ContinentSlice[];
  planetSize: number;
  rotationIndex: number;
  onRotate: (direction: number) => void;
  onOpenContinent: (category: UniverseCategory) => void;
}) {
  const biomeCounts = topBiomeEntries([...data.categories.values()].flat());

  return (
    <>
      <View style={styles.detailHeader}>
        <View>
          <Text style={styles.pageTitle}>기록의 행성</Text>
          <Text style={styles.pageSub}>{data.period} · 기록 {data.totalEntries}개</Text>
        </View>
        <Pressable style={styles.roundAction} onPress={() => onRotate(1)}>
          <Text style={styles.roundActionText}>↻</Text>
        </Pressable>
      </View>
      <PlanetIllustration
        size={planetSize + 24}
        data={data}
        continents={continents}
        rotationIndex={rotationIndex}
        onRotate={onRotate}
        onOpenContinent={onOpenContinent}
      />
      <GlassCard>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>감정 분포</Text>
          <Text style={styles.cardLink}>전체 보기 ›</Text>
        </View>
        <View style={styles.biomeRow}>
          {biomeCounts.map((biome) => (
            <View key={biome.key} style={styles.biomeItem}>
              <View style={[styles.biomeIcon, { backgroundColor: biome.glow }]}>
                <Text style={[styles.biomeIconText, { color: biome.color }]}>{biome.icon}</Text>
              </View>
              <Text style={styles.biomeLabel}>{biome.label}</Text>
              <Text style={styles.biomeValue}>{percent(biome.count, data.totalEntries)}%</Text>
            </View>
          ))}
        </View>
      </GlassCard>
    </>
  );
}

function ContinentDetail({
  title,
  continent,
  entries
}: {
  title: string;
  continent: (typeof continentMeta)[number];
  entries: Entry[];
}) {
  const biomeCounts = topBiomeEntries(entries);

  return (
    <>
      <View style={styles.detailHeader}>
        <View>
          <Text style={styles.pageTitle}>{title}</Text>
          <Text style={styles.pageSub}>기록 {entries.length}개</Text>
        </View>
      </View>
      <View style={[styles.landscapeCard, { borderColor: continent.color }]}>
        <View style={[styles.landscapePlanet, { backgroundColor: continent.softColor }]}>
          <View style={[styles.landform, styles.landformLarge, { backgroundColor: continent.color }]} />
          <View style={[styles.landform, styles.landformSmall, { backgroundColor: "rgba(255,255,255,0.48)" }]} />
          <View style={[styles.riverLine, { backgroundColor: "#78ddff" }]} />
        </View>
        <Text style={styles.landscapeTitle}>{continent.name}의 감정 지형</Text>
        <Text style={styles.landscapeDesc}>이 대륙에서 반복된 감정이 바이옴으로 번져 있어.</Text>
      </View>

      <View style={styles.filterChips}>
        {moodBiomes.map((biome, index) => (
          <View key={biome.key} style={[styles.filterChip, index === 0 && { backgroundColor: "rgba(255,255,255,0.92)" }]}>
            <Text style={[styles.filterChipText, index === 0 && { color: "#18205a" }]}>{biome.label}</Text>
          </View>
        ))}
      </View>

      <GlassCard>
        <Text style={styles.cardTitle}>이 대륙의 감정 분포</Text>
        <View style={styles.barList}>
          {biomeCounts.slice(0, 5).map((biome) => (
            <View key={biome.key} style={styles.barRow}>
              <Text style={styles.barLabel}>{biome.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max(8, percent(biome.count, Math.max(entries.length, 1)))}%`, backgroundColor: biome.color }]} />
              </View>
              <Text style={styles.barPercent}>{percent(biome.count, entries.length)}%</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <Text style={styles.sectionTitle}>기록 보기</Text>
      {(entries.length ? entries : []).slice(0, 4).map((entry) => (
        <View key={entry.id} style={styles.recordCard}>
          <View style={styles.recordTop}>
            <Text style={styles.recordDate}>{formatDate(entry.createdAt)}</Text>
            <Text style={styles.recordMood}>{moodBiomes.find((biome) => biome.key === (moodBiomeMap[entry.mood] || "other"))?.label}</Text>
          </View>
          <Text style={styles.recordText}>{entry.text}</Text>
        </View>
      ))}
      {!entries.length ? <Text style={styles.emptyText}>아직 이 대륙에 쌓인 기록이 없어.</Text> : null}
    </>
  );
}

function ContinentInsightOverlay({
  continent,
  continents,
  rank,
  assetRank,
  monthKey,
  onClose
}: {
  continent: ContinentSlice;
  continents: ContinentSlice[];
  rank: number;
  assetRank: UniverseContinentRank;
  monthKey: string;
  onClose: () => void;
}) {
  const monthEntries = entriesInMonth(continent.entries, monthKey);
  const level = continentDevelopmentLevel(monthEntries);
  const average = averageEnergy(continent.entries);
  const moodCounts = moodGroupCounts(continent.entries);
  const energyRank = continentEnergyRank(continents, continent);
  const comment = continentComment(continent, rank, energyRank);
  const source = continentAssetSource(assetRank, continent.key, level);
  const groups: Array<{ key: MoodGroup; label: string; color: string }> = [
    { key: "positive", label: "긍정", color: "#dfe8ff" },
    { key: "neutral", label: "중간", color: "#91a7d8" },
    { key: "negative", label: "부정", color: "#33456f" }
  ];

  return (
    <View style={styles.continentOverlay}>
      <Pressable style={styles.continentDim} onPress={onClose} />
      <View style={styles.continentSheet}>
        <View style={styles.continentSheetHeader}>
          <Text style={styles.continentSheetKicker}>대륙 상세</Text>
          <Pressable style={styles.continentCloseButton} onPress={onClose}>
            <Text style={styles.continentCloseText}>×</Text>
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.continentSheetScroll}>
          <View style={styles.detailContinentFrame}>
            <Image
              source={source}
              style={styles.detailContinentImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.detailTitleRow}>
            <View>
              <Text style={styles.detailLevelText}>{level === "bare" ? "Bare" : `Lv.${level}`}</Text>
              <Text style={styles.detailCategoryText}>{continent.name} · {continent.label}</Text>
            </View>
            <View style={styles.detailCountPill}>
              <Text style={styles.detailCountValue}>{continent.count}</Text>
              <Text style={styles.detailCountLabel}>기록</Text>
            </View>
          </View>

          <View style={styles.detailMetricCard}>
            <Text style={styles.detailMetricLabel}>평균 사용 에너지</Text>
            <Text style={styles.detailMetricValue}>{average}%</Text>
            <View style={styles.energySpectrum}>
              <View style={[styles.energySpectrumSegment, { backgroundColor: "rgba(188, 205, 255, 0.52)" }]} />
              <View style={[styles.energySpectrumSegment, { backgroundColor: "rgba(126, 151, 222, 0.72)" }]} />
              <View style={[styles.energySpectrumSegment, { backgroundColor: "rgba(53, 72, 125, 0.92)" }]} />
              <View style={[styles.energyMarker, { left: `${Math.max(0, Math.min(100, average))}%` }]} />
            </View>
            <View style={styles.energySpectrumLabels}>
              <Text style={styles.energySpectrumLabel}>0</Text>
              <Text style={styles.energySpectrumLabel}>50</Text>
              <Text style={styles.energySpectrumLabel}>100</Text>
            </View>
          </View>

          <View style={styles.detailMetricCard}>
            <Text style={styles.detailMetricLabel}>감정 비중</Text>
            <View style={styles.moodShareList}>
              {groups.map((group) => {
                const value = percent(moodCounts[group.key], Math.max(1, continent.entries.length));
                return (
                  <View key={group.key} style={styles.moodShareRow}>
                    <Text style={styles.moodShareLabel}>{group.label}</Text>
                    <View style={styles.moodShareTrack}>
                      <View style={[styles.moodShareFill, { width: `${value}%`, backgroundColor: group.color }]} />
                    </View>
                    <Text style={styles.moodShareValue}>{value}%</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.commentCard}>
            <Text style={styles.commentTitle}>코멘트</Text>
            <Text style={styles.commentText}>{comment}</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function UniverseGuide() {
  return (
    <View style={styles.guideWrap}>
      <GuideCard
        index="01"
        title="하나의 우주 안에 기록이 쌓이면 행성이 됩니다"
        body="전체 기록 아카이브는 우주가 되고, 일정 기간의 기록 묶음은 하나의 행성으로 보여줘."
      />
      <GuideCard
        index="02"
        title="카테고리는 대륙이 됩니다"
        body="일, 사랑, 인간관계, 건강 같은 기록 카테고리는 행성 위에 서로 다른 대륙으로 자라나."
      />
      <GuideCard
        index="03"
        title="감정은 행성의 풍경을 바꿉니다"
        body="평온, 감사, 성취, 설렘, 불안 같은 감정 태그는 대륙 안의 바이옴과 지형 색으로 표현돼."
      />
      <View style={styles.journeyCard}>
        <Text style={styles.journeyTitle}>기록이 적을 때</Text>
        <View style={styles.growthRow}>
          <MiniPlanet index={0} />
          <Text style={styles.growthArrow}>→</Text>
          <MiniPlanet index={1} />
          <Text style={styles.growthArrow}>→</Text>
          <MiniPlanet index={2} />
        </View>
        <Text style={styles.journeyDesc}>작은 행성이 기록 개수와 감정 종류에 따라 점점 풍부해져.</Text>
      </View>
    </View>
  );
}

const landSlots = [
  { width: "48%", height: "31%", left: "27%", top: "11%", rotate: "-13deg", label: "northLabel", keeper: { left: "53%", top: "29%" }, shape: "landOrganicNorth" },
  { width: "42%", height: "34%", left: "7%", top: "42%", rotate: "19deg", label: "westLabel", keeper: { left: "24%", top: "58%" }, shape: "landOrganicWest" },
  { width: "41%", height: "35%", right: "7%", top: "41%", rotate: "-17deg", label: "eastLabel", keeper: { left: "69%", top: "57%" }, shape: "landOrganicEast" },
  { width: "36%", height: "27%", left: "32%", bottom: "8%", rotate: "8deg", label: "southLabel", keeper: { left: "50%", top: "73%" }, shape: "landOrganicSouth" }
] as const;

const continentHitZones = ["hitZoneUpLeft", "hitZoneUpRight", "hitZoneDownRight", "hitZoneDownLeft"] as const;
const v3ContinentHitZones = ["hitZoneRankOne", "hitZoneRankTwo", "hitZoneRankThree", "hitZoneRankFour", "hitZoneRankFive", "hitZoneRankSix"] as const;

const detailContinentFocusStyles: Record<(typeof continentLayerOrder)[number], "detailFocusUpLeft" | "detailFocusUpRight" | "detailFocusDownRight" | "detailFocusDownLeft"> = {
  "up-left": "detailFocusUpLeft",
  "up-right": "detailFocusUpRight",
  "down-right": "detailFocusDownRight",
  "down-left": "detailFocusDownLeft"
};

const biomeSlots = [
  { left: "30%", top: "32%" },
  { left: "56%", top: "45%" },
  { left: "42%", top: "62%" }
] as const;

function ContinentBiomes({ slice, slotIndex }: { slice: ContinentSlice; slotIndex: number }) {
  const biomes = topBiomeEntries(slice.entries).filter((biome) => biome.count > 0).slice(0, 3);
  return (
    <>
      {biomes.map((biome, index) => {
        const energyAverage = slice.entries
          .filter((entry) => (moodBiomeMap[entry.mood] || "other") === biome.key)
          .reduce((sum, entry) => sum + Math.max(0, Math.min(100, entry.energy)), 0) / Math.max(1, biome.count);
        const scale = 0.72 + Math.min(0.72, energyAverage / 140);
        const slot = biomeSlots[(index + slotIndex) % biomeSlots.length];
        const positive = biome.key === "calm" || biome.key === "grateful" || biome.key === "proud" || biome.key === "excited";
        const anxious = biome.key === "anxious";
        return (
          <View
            key={biome.key}
            style={[
              styles.biomeObject,
              {
                left: slot.left,
                top: slot.top,
                transform: [{ scale }],
                backgroundColor: anxious ? "rgba(190, 201, 219, 0.7)" : biome.color,
                shadowColor: biome.color
              },
              positive && styles.positiveBiome,
              anxious && styles.fogBiome,
              biome.key === "other" && styles.neutralBiome
            ]}
          >
            <Text style={[styles.biomeObjectText, { color: anxious ? "#edf3ff" : "#fff" }]}>
              {anxious ? "☁" : positive ? "✦" : "⌂"}
            </Text>
          </View>
        );
      })}
    </>
  );
}

function ContinentKeeper({ color }: { color: string }) {
  return (
    <View style={styles.keeper}>
      <View style={[styles.keeperHead, { backgroundColor: color }]} />
      <View style={[styles.keeperBody, { backgroundColor: color }]} />
    </View>
  );
}

function clampZoom(value: number) {
  return Math.max(1, Math.min(2, value));
}

type TouchPoint = {
  pageX: number;
  pageY: number;
  locationX?: number;
  locationY?: number;
};

function touchDistance(touches: readonly TouchPoint[]) {
  if (touches.length < 2) return 0;
  const [first, second] = touches;
  return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
}

function touchMidpoint(touches: readonly TouchPoint[]) {
  if (touches.length < 2) return { x: 0, y: 0 };
  const [first, second] = touches;
  return {
    x: ((first.locationX ?? first.pageX) + (second.locationX ?? second.pageX)) / 2,
    y: ((first.locationY ?? first.pageY) + (second.locationY ?? second.pageY)) / 2
  };
}

function v4DecoFrame(asset: V4DecoSpec, visualWidth: number, visualHeight: number) {
  const width = (asset.width / V4_PLANET_WIDTH) * visualWidth;
  const height = width / asset.aspectRatio;
  return {
    left: (asset.center.x / V4_PLANET_WIDTH) * visualWidth - width / 2,
    top: (asset.center.y / V4_PLANET_HEIGHT) * visualHeight - height / 2,
    width,
    height
  };
}

function v4MoodDecoFrame(asset: V4MoodDecoSpec, visualWidth: number, visualHeight: number) {
  const scale = (asset.width / V4_PLANET_WIDTH) * visualWidth / asset.canvas.width;
  return {
    left: (asset.center.x / V4_PLANET_WIDTH) * visualWidth - asset.alphaCenter.x * scale,
    top: (asset.center.y / V4_PLANET_HEIGHT) * visualHeight - asset.alphaCenter.y * scale,
    width: asset.canvas.width * scale,
    height: asset.canvas.height * scale
  };
}

function PlanetIllustration({
  size,
  data,
  continents,
  rotationIndex,
  onRotate,
  onOpenContinent,
  compact,
  enableContinentHits,
  showChrome = true
}: {
  size: number;
  data: ReturnType<typeof buildUniverse>;
  continents: ContinentSlice[];
  rotationIndex: number;
  onRotate: (direction: number) => void;
  onOpenContinent: (category: UniverseCategory) => void;
  compact?: boolean;
  enableContinentHits?: boolean;
  showChrome?: boolean;
}) {
  const visible = visibleContinents(continents, rotationIndex);
  const visualWidth = size;
  const visualHeight = size * (V4_PLANET_HEIGHT / V4_PLANET_WIDTH);
  const stageHeight = visualHeight + (compact ? 30 : 76);
  const emotionLayer = emotionLayerForEntries(visible.flatMap((continent) => continent.entries));
  const v4Deco = activeV4Deco(data);
  const v4MoodDeco = activeV4MoodDeco(visible, data);
  const v4LandLayers = visible.slice(0, 6).flatMap((continent, index) => {
    const slot = v4Slots[v4RankSlots[index]];
    const placement = v4PlacementFor(continent.key, slot);
    return activeV4Levels(continent.count).map((level) => ({
      key: `${continent.key}-${slot.key}-lv${level}`,
      category: continent.key as V4Category,
      level,
      slot,
      placement,
      side: placement.sides[level],
      continent
    }));
  });
  const v4EtcLayers = activeV4Levels(data.etcEntries.length).map((level) => {
    const slot = v4Slots.etc_lake;
    const placement = v4PlacementFor("etc", slot);
    return {
      key: `etc-lake-lv${level}`,
      category: "etc" as V4Category,
      level,
      slot,
      placement,
      side: placement.sides[level]
    };
  });
  const [zoom, setZoom] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 0, y: 0 });
  const stageLayout = useRef({ width: size, height: stageHeight });
  const zoomRef = useRef(1);
  const zoomOriginRef = useRef({ x: 0, y: 0 });
  const pinchStartDistance = useRef(0);
  const pinchStartZoom = useRef(1);
  const planetTransform = [
    { translateX: zoomOrigin.x * (1 - zoom) },
    { translateY: zoomOrigin.y * (1 - zoom) },
    { scale: zoom }
  ];
  const originFromTouches = (touches: readonly TouchPoint[]) => {
    const midpoint = touchMidpoint(touches);
    const layout = stageLayout.current;
    return {
      x: midpoint.x - layout.width / 2,
      y: midpoint.y - layout.height / 2
    };
  };
  const setPlanetZoom = (nextZoom: number, nextOrigin = zoomOriginRef.current) => {
    const clamped = clampZoom(nextZoom);
    zoomRef.current = clamped;
    zoomOriginRef.current = nextOrigin;
    setZoom(clamped);
    setZoomOrigin(nextOrigin);
  };
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: (event) => event.nativeEvent.touches.length >= 2,
    onMoveShouldSetPanResponder: (event, gesture) => {
      if (event.nativeEvent.touches.length >= 2) return true;
      return Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
    },
    onPanResponderGrant: (event) => {
      if (event.nativeEvent.touches.length >= 2) {
        pinchStartDistance.current = touchDistance(event.nativeEvent.touches);
        pinchStartZoom.current = zoomRef.current;
        const nextOrigin = originFromTouches(event.nativeEvent.touches);
        zoomOriginRef.current = nextOrigin;
        setZoomOrigin(nextOrigin);
      }
    },
    onPanResponderMove: (event) => {
      if (event.nativeEvent.touches.length < 2) return;
      const distance = touchDistance(event.nativeEvent.touches);
      if (!pinchStartDistance.current || !distance) return;
      setPlanetZoom(pinchStartZoom.current * (distance / pinchStartDistance.current), originFromTouches(event.nativeEvent.touches));
    },
    onPanResponderRelease: (event, gesture) => {
      if (event.nativeEvent.touches.length >= 2 || pinchStartDistance.current) {
        pinchStartDistance.current = 0;
        return;
      }
      if (gesture.dx < -24) onRotate(1);
      if (gesture.dx > 24) onRotate(-1);
    },
    onPanResponderTerminate: () => {
      pinchStartDistance.current = 0;
    }
  })).current;

  return (
    <View
      style={[styles.planetStage, { height: stageHeight }]}
      onLayout={(event) => {
        stageLayout.current = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height
        };
      }}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.planetAssetGlow,
          {
            width: visualWidth * 0.95,
            height: visualHeight * 0.82,
            borderRadius: visualWidth,
            transform: planetTransform
          }
        ]}
      />
        <BackgroundTwinkles />
      <Image source={v4BackgroundAsset} style={styles.v4UniverseBackground} resizeMode="contain" />
      <View style={[styles.planetAssetWrap, { width: visualWidth, height: visualHeight, transform: planetTransform }]}> 
        {v4Deco.filter((asset) => asset.layer === "background").map((asset) => (
          <Image key={asset.key} source={asset.source} style={[styles.v4DecoImage, v4DecoFrame(asset, visualWidth, visualHeight), asset.rotation ? { transform: [{ rotate: `${asset.rotation}deg` }] } : null]} resizeMode="contain" />
        ))}
        <Image source={v4BarePlanetAsset} style={styles.planetAssetImage} resizeMode="contain" />
        {v4Deco.filter((asset) => asset.layer === "boundary").map((asset) => (
          <Image key={asset.key} source={asset.source} style={[styles.v4DecoImage, v4DecoFrame(asset, visualWidth, visualHeight), asset.rotation ? { transform: [{ rotate: `${asset.rotation}deg` }] } : null]} resizeMode="contain" />
        ))}
        <View style={styles.continentAxisLayer}>
          {v4LandLayers.sort((a, b) => a.level - b.level).map((layer) => {
            const asset = v4AssetFor(layer.category, layer.level, layer.side);
            if (!asset) return null;
            const frame = v4LayerFrame(layer.slot, layer.placement, asset, layer.level, visualWidth, visualHeight);
            return (
              <Image
                key={layer.key}
                source={asset.source}
                style={[
                  styles.continentLayerImage,
                  frame
                ]}
                resizeMode="contain"
              />
            );
          })}
          {v4Deco.filter((asset) => asset.layer === "foreground").map((asset) => (
            <Image key={asset.key} source={asset.source} style={[styles.v4DecoImage, v4DecoFrame(asset, visualWidth, visualHeight), asset.rotation ? { transform: [{ rotate: `${asset.rotation}deg` }] } : null]} resizeMode="contain" />
          ))}
          {v4MoodDeco.filter((asset) => asset.slot !== "etc_lake").map((asset) => (
            <Image key={asset.key} source={asset.source} style={[styles.v4DecoImage, v4MoodDecoFrame(asset, visualWidth, visualHeight)]} resizeMode="contain" />
          ))}
          {v4EtcLayers.sort((a, b) => a.level - b.level).map((layer) => {
            const asset = v4AssetFor(layer.category, layer.level, layer.side);
            if (!asset) return null;
            return (
              <Image
                key={layer.key}
                source={asset.source}
                style={[styles.continentLayerImage, v4LayerFrame(layer.slot, layer.placement, asset, layer.level, visualWidth, visualHeight)]}
                resizeMode="contain"
              />
            );
          })}
          {v4MoodDeco.filter((asset) => asset.slot === "etc_lake").map((asset) => (
            <Image key={asset.key} source={asset.source} style={[styles.v4DecoImage, v4MoodDecoFrame(asset, visualWidth, visualHeight)]} resizeMode="contain" />
          ))}
          {enableContinentHits ? visible.slice(0, 6).map((continent, index) => (
            <Pressable
              key={`continent-hit-${continent.key}`}
              style={[styles.continentHitZone, v4SlotFrame(v4Slots[v4RankSlots[index]], visualWidth, visualHeight)]}
              onPress={() => onOpenContinent(continent.key)}
            />
          )) : null}
        </View>
        {emotionLayer === "light" || emotionLayer === "mixed" ? (
          <TwinkleLights />
        ) : null}
        {emotionLayer === "mixed" ? (
          <View style={styles.cloudEmotionLayer}>
            <View style={[styles.cloudPuff, styles.cloudPuffOne]} />
            <View style={[styles.cloudPuff, styles.cloudPuffTwo]} />
            <View style={[styles.cloudPuff, styles.cloudPuffThree]} />
          </View>
        ) : null}
        <SteamPuffs style={styles.steamVentTop} />
        <SteamPuffs style={styles.steamVentLower} delay={820} small />
        <SteamPuffs style={styles.steamVentOuterUpperLeft} delay={360} outward />
        <SteamPuffs style={styles.steamVentOuterUpperRight} delay={1180} outwardRight />
      </View>
      <View style={styles.zoomControls}>
        <Pressable style={[styles.zoomButton, zoom <= 1 && styles.zoomButtonDisabled]} onPress={() => setPlanetZoom(zoomRef.current - 0.25)}>
          <Text style={styles.zoomButtonText}>−</Text>
        </Pressable>
        <Text style={styles.zoomValue}>{Math.round(zoom * 100)}%</Text>
        <Pressable style={[styles.zoomButton, zoom >= 2 && styles.zoomButtonDisabled]} onPress={() => setPlanetZoom(zoomRef.current + 0.25)}>
          <Text style={styles.zoomButtonText}>＋</Text>
        </Pressable>
      </View>
      {showChrome ? (
        <View style={styles.rotationControls}>
          <Pressable style={styles.rotateButton} onPress={() => onRotate(-1)}>
            <Text style={styles.rotateButtonText}>‹</Text>
          </Pressable>
          <View style={styles.rotationInfo}>
            <Text style={styles.rotationInfoText}>상위 {continents.length}개 대륙 · 한 번에 최대 6개</Text>
            <View style={styles.rotationDots}>
              {continents.map((continent, index) => (
                <View
                  key={continent.key}
                  style={[
                    styles.rotationDot,
                    { backgroundColor: index === rotationIndex || visible.some((item) => item.key === continent.key) ? continent.color : "rgba(255,255,255,0.22)" }
                  ]}
                />
              ))}
            </View>
          </View>
          <Pressable style={styles.rotateButton} onPress={() => onRotate(1)}>
            <Text style={styles.rotateButtonText}>›</Text>
          </Pressable>
        </View>
      ) : null}
      {showChrome ? (
        <View style={styles.visibleContinentStrip}>
          {visible.map((continent) => (
            <Pressable
              key={`strip-${continent.key}`}
              style={[styles.visibleContinentChip, { backgroundColor: continent.softColor, borderColor: continent.color }]}
              onPress={() => onOpenContinent(continent.key)}
            >
              <Text style={styles.visibleContinentChipText}>{continent.label}</Text>
              <Text style={styles.visibleContinentChipCount}>{continent.count}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {showChrome && !compact ? (
        <>
          {visible.map((continent, index) => (
            <Pressable
              key={continent.key}
              style={[styles.continentLabel, styles[landSlots[index].label], { backgroundColor: continent.softColor, borderColor: continent.color }]}
              onPress={() => onOpenContinent(continent.key)}
            >
              <Text style={styles.continentLabelText}>{continent.name} · {continent.label}</Text>
              <Text style={styles.continentCount}>기록 {continent.count}개</Text>
            </Pressable>
          ))}
        </>
      ) : null}
    </View>
  );
}

function TwinkleLights() {
  const values = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const animations = values.map((value, index) => Animated.loop(
      Animated.sequence([
        Animated.delay(index * 520),
        Animated.timing(value, {
          toValue: 1,
          duration: 1450,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 1450,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    ));
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [values]);

  const positions = [styles.lightOrbOne, styles.lightOrbTwo, styles.lightOrbThree];

  return (
    <View pointerEvents="none" style={styles.lightLayer}>
      {values.map((value, index) => (
        <Animated.View
          key={index}
          style={[
            styles.lightOrb,
            positions[index],
            {
              opacity: value.interpolate({
                inputRange: [0, 1],
                outputRange: [0.42, 1]
              }),
              transform: [
                {
                  scale: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.72, 1.18]
                  })
                }
              ]
            }
          ]}
        />
      ))}
    </View>
  );
}

function BackgroundTwinkles() {
  const values = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;
  const sparkleValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;

  useEffect(() => {
    const animations = values.map((value, index) => Animated.loop(
      Animated.sequence([
        Animated.delay(index * 690 + 260),
        Animated.timing(value, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    ));
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [values]);

  useEffect(() => {
    const animations = sparkleValues.map((value, index) => Animated.loop(
      Animated.sequence([
        Animated.delay(index * 820 + 420),
        Animated.timing(value, {
          toValue: 1,
          duration: 340,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 520,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true
        }),
        Animated.delay(2100 + index * 180)
      ])
    ));
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [sparkleValues]);

  const positions = [
    styles.backgroundTwinkleOne,
    styles.backgroundTwinkleTwo,
    styles.backgroundTwinkleThree,
    styles.backgroundTwinkleFour,
    styles.backgroundTwinkleFive,
    styles.backgroundTwinkleSix,
    styles.backgroundTwinkleSeven
  ];
  const sparklePositions = [
    styles.starburstOne,
    styles.starburstTwo,
    styles.starburstThree,
    styles.starburstFour,
    styles.starburstFive
  ];

  return (
    <View pointerEvents="none" style={styles.backgroundTwinkleLayer}>
      {values.map((value, index) => (
        <Animated.View
          key={index}
          style={[
            styles.backgroundTwinkle,
            positions[index],
            {
              opacity: value.interpolate({
                inputRange: [0, 1],
                outputRange: [0.18, 0.92]
              }),
              transform: [
                {
                  scale: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.62, 1.22]
                  })
                }
              ]
            }
          ]}
        />
      ))}
      {sparkleValues.map((value, index) => (
        <Animated.View
          key={`starburst-${index}`}
          style={[
            styles.starburst,
            sparklePositions[index],
            {
              opacity: value.interpolate({
                inputRange: [0, 0.55, 1],
                outputRange: [0, 1, 0]
              }),
              transform: [
                {
                  scale: value.interpolate({
                    inputRange: [0, 0.55, 1],
                    outputRange: [0.52, 1.22, 0.86]
                  })
                },
                { rotate: index % 2 === 0 ? "0deg" : "22deg" }
              ]
            }
          ]}
        >
          <View style={styles.starburstVertical} />
          <View style={styles.starburstHorizontal} />
          <View style={[styles.starburstVertical, styles.starburstDiagonalOne]} />
          <View style={[styles.starburstHorizontal, styles.starburstDiagonalTwo]} />
        </Animated.View>
      ))}
    </View>
  );
}

function SteamPuffs({
  style,
  delay = 0,
  small,
  outward,
  outwardRight
}: {
  style: object;
  delay?: number;
  small?: boolean;
  outward?: boolean;
  outwardRight?: boolean;
}) {
  const values = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const animations = values.map((value, index) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay + index * 720),
        Animated.timing(value, {
          toValue: 1,
          duration: 2600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true
        })
      ])
    ));
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [delay, values]);

  return (
    <View pointerEvents="none" style={[styles.steamVent, style]}>
      {values.map((value, index) => {
        const drift = index === 1 ? 10 : index === 2 ? -8 : 0;
        return (
          <Animated.View
            key={index}
            style={[
              styles.steamPuff,
              small && styles.steamPuffSmall,
              {
                opacity: value.interpolate({
                  inputRange: [0, 0.16, 0.72, 1],
                  outputRange: [0, 0.48, 0.3, 0]
                }),
                transform: [
                  {
                    translateX: value.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, outward ? drift - 26 : outwardRight ? drift + 26 : drift]
                    })
                  },
                  {
                    translateY: value.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, outward || outwardRight ? -62 : small ? -34 : -48]
                    })
                  },
                  {
                    scale: value.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.45, small ? 1.15 : 1.35]
                    })
                  }
                ]
              }
            ]}
          />
        );
      })}
    </View>
  );
}

function StatCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function MiniPlanet({ index }: { index: number }) {
  return (
    <View style={[styles.miniPlanet, index === 1 && styles.miniPlanetSand, index === 2 && styles.miniPlanetGreen]}>
      <View style={styles.miniGlow} />
      <View style={[styles.miniPatch, index === 0 && { backgroundColor: "#d9d7ff" }]} />
      <View style={[styles.miniPatchTwo, index === 2 && { backgroundColor: "#80e4c9" }]} />
    </View>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.glassCard}>{children}</View>;
}

function GuideCard({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <View style={styles.guideCard}>
      <Text style={styles.guideIndex}>{index}</Text>
      <View style={styles.guideIcon}>
        <Text style={styles.guideIconText}>✦</Text>
      </View>
      <Text style={styles.guideTitle}>{title}</Text>
      <Text style={styles.guideBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  universeToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8
  },
  monthButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)"
  },
  monthButtonText: {
    color: "#eaf2ff",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "900"
  },
  monthTitleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)"
  },
  monthTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900"
  },
  monthSubtitle: {
    marginTop: 2,
    color: "rgba(238,242,255,0.68)",
    fontSize: 11,
    fontWeight: "800"
  },
  savePlanetButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
    height: 42,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(191, 224, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(191, 224, 255, 0.34)"
  },
  savePlanetText: {
    color: "#d8ebff",
    fontSize: 12,
    fontWeight: "900"
  },
  disabledButton: {
    opacity: 0.52
  },
  planetOnlyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  planetCaptureCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    borderRadius: 28
  },
  captureMonthLabel: {
    zIndex: 2,
    marginBottom: -8,
    color: "rgba(238,242,255,0.84)",
    fontSize: 13,
    fontWeight: "900",
    textShadowColor: "rgba(3,8,28,0.88)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  captureScenarioLabel: {
    zIndex: 2,
    marginTop: 10,
    marginBottom: -18,
    color: "rgba(238,242,255,0.68)",
    fontSize: 11,
    fontWeight: "800",
    textShadowColor: "rgba(3,8,28,0.88)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  scenarioNavigator: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 2
  },
  scenarioArrowButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.09)"
  },
  scenarioArrowText: {
    color: "#eef5ff",
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "900"
  },
  scenarioTitleButton: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  scenarioTitleText: {
    color: "#f3f9ff",
    fontSize: 13,
    fontWeight: "900"
  },
  scenarioModeText: {
    marginTop: 2,
    color: "rgba(238,242,255,0.52)",
    fontSize: 10,
    fontWeight: "700"
  },
  scenarioCountStrip: {
    minHeight: 34,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
    paddingTop: 5,
    paddingBottom: 4
  },
  scenarioCountItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  scenarioCountText: {
    color: "rgba(238,242,255,0.74)",
    fontSize: 10,
    fontWeight: "800"
  },
  scenarioStrip: {
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
    paddingHorizontal: 4,
    paddingBottom: 6
  },
  scenarioChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.09)"
  },
  scenarioChipActive: {
    borderColor: "rgba(191, 224, 255, 0.52)",
    backgroundColor: "rgba(191, 224, 255, 0.2)"
  },
  scenarioChipText: {
    color: "rgba(238,242,255,0.64)",
    fontSize: 11,
    fontWeight: "900"
  },
  scenarioChipTextActive: {
    color: "#f3f9ff"
  },
  continentOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    justifyContent: "flex-end"
  },
  continentDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)"
  },
  continentSheet: {
    maxHeight: "78%",
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(13, 20, 56, 0.94)",
    overflow: "hidden"
  },
  continentSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8
  },
  continentSheetKicker: {
    color: "rgba(238,242,255,0.68)",
    fontSize: 12,
    fontWeight: "900"
  },
  continentCloseButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  continentCloseText: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "800"
  },
  continentSheetScroll: {
    paddingHorizontal: 18,
    paddingBottom: 22,
    gap: 12
  },
  detailContinentFrame: {
    alignSelf: "center",
    width: 210,
    height: 150,
    overflow: "hidden"
  },
  detailContinentImage: {
    width: "100%",
    height: "100%"
  },
  detailFocusUpLeft: {
    left: -22,
    top: -20
  },
  detailFocusUpRight: {
    left: -92,
    top: -22
  },
  detailFocusDownRight: {
    left: -86,
    top: -116
  },
  detailFocusDownLeft: {
    left: -16,
    top: -104
  },
  detailTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  detailLevelText: {
    color: "rgba(238,242,255,0.74)",
    fontSize: 13,
    fontWeight: "900"
  },
  detailCategoryText: {
    marginTop: 4,
    color: "#fff",
    fontSize: 22,
    fontWeight: "900"
  },
  detailCountPill: {
    alignItems: "center",
    minWidth: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.13)"
  },
  detailCountValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900"
  },
  detailCountLabel: {
    color: "rgba(238,242,255,0.64)",
    fontSize: 11,
    fontWeight: "900"
  },
  detailMetricCard: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)"
  },
  detailMetricLabel: {
    color: "rgba(238,242,255,0.72)",
    fontSize: 12,
    fontWeight: "900"
  },
  detailMetricValue: {
    marginTop: 6,
    color: "#fff",
    fontSize: 28,
    fontWeight: "900"
  },
  energySpectrum: {
    position: "relative",
    flexDirection: "row",
    height: 12,
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)"
  },
  energySpectrumSegment: {
    flex: 1
  },
  energyMarker: {
    position: "absolute",
    top: -5,
    width: 4,
    height: 22,
    marginLeft: -2,
    borderRadius: 999,
    backgroundColor: "#fff"
  },
  energySpectrumLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6
  },
  energySpectrumLabel: {
    color: "rgba(238,242,255,0.54)",
    fontSize: 10,
    fontWeight: "800"
  },
  moodShareList: {
    marginTop: 12,
    gap: 10
  },
  moodShareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  moodShareLabel: {
    width: 34,
    color: "rgba(238,242,255,0.78)",
    fontSize: 11,
    fontWeight: "900"
  },
  moodShareTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  moodShareFill: {
    height: "100%",
    borderRadius: 999
  },
  moodShareValue: {
    width: 36,
    textAlign: "right",
    color: "rgba(238,242,255,0.78)",
    fontSize: 11,
    fontWeight: "900"
  },
  commentCard: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)"
  },
  commentTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900"
  },
  commentText: {
    marginTop: 8,
    color: "rgba(238,242,255,0.82)",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 12
  },
  kicker: {
    color: "rgba(229, 235, 255, 0.66)",
    fontSize: 12,
    fontWeight: "800"
  },
  title: {
    marginTop: 4,
    color: "#fff",
    fontSize: 24,
    fontWeight: "900"
  },
  gearButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  gearText: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "900"
  },
  segment: {
    flexDirection: "row",
    marginHorizontal: 16,
    padding: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.1)"
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 14
  },
  segmentButtonActive: {
    backgroundColor: "rgba(255,255,255,0.9)"
  },
  segmentText: {
    color: "rgba(239,243,255,0.72)",
    fontSize: 11,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: "#1d2461"
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 26,
    gap: 16
  },
  nebula: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.56
  },
  nebulaMint: {
    width: 250,
    height: 250,
    right: -74,
    top: 120,
    backgroundColor: "rgba(76, 204, 214, 0.11)"
  },
  nebulaPurple: {
    width: 330,
    height: 330,
    left: -150,
    top: 240,
    backgroundColor: "rgba(126, 99, 237, 0.16)"
  },
  nebulaPink: {
    width: 230,
    height: 230,
    right: -86,
    bottom: 130,
    backgroundColor: "rgba(219, 108, 190, 0.09)"
  },
  star: {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#fff"
  },
  constellationStar: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#dbe6ff",
    shadowOpacity: 0.96,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }
  },
  currentPlanetCard: {
    padding: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.11)",
    overflow: "hidden"
  },
  currentPlanetHeader: {
    zIndex: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 4
  },
  sectionMeta: {
    color: "rgba(238,242,255,0.64)",
    fontSize: 12,
    fontWeight: "800"
  },
  heroTitle: {
    marginTop: 4,
    color: "#fff",
    fontSize: 26,
    fontWeight: "900"
  },
  heroSub: {
    marginTop: 4,
    color: "rgba(238,242,255,0.74)",
    fontSize: 13,
    fontWeight: "800"
  },
  chevron: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "300"
  },
  planetStage: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -6,
    gap: 8,
    backgroundColor: "#030817"
  },
  planetGlow: {
    position: "absolute",
    backgroundColor: "rgba(164, 148, 255, 0.18)",
    shadowColor: "#a99cff",
    shadowOpacity: 0.85,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 12 }
  },
  planetAssetGlow: {
    position: "absolute",
    backgroundColor: "rgba(164, 148, 255, 0.14)",
    shadowColor: "#a99cff",
    shadowOpacity: 0.72,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 12 }
  },
  planetAssetWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center"
  },
  planetAssetImage: {
    width: "100%",
    height: "100%"
  },
  v4UniverseBackground: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    alignSelf: "center",
    opacity: 0.9
  },
  continentWaterRipplesImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%"
  },
  continentAxisLayer: {
    ...StyleSheet.absoluteFillObject
  },
  continentLayerImage: {
    position: "absolute"
  },
  v4DecoImage: {
    position: "absolute"
  },
  continentHitZone: {
    position: "absolute",
    zIndex: 20,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.001)"
  },
  hitZoneUpLeft: {
    left: "18%",
    top: "15%",
    width: "34%",
    height: "39%"
  },
  hitZoneUpRight: {
    right: "20%",
    top: "16%",
    width: "32%",
    height: "38%"
  },
  hitZoneDownRight: {
    right: "24%",
    bottom: "20%",
    width: "37%",
    height: "33%"
  },
  hitZoneDownLeft: {
    left: "20%",
    bottom: "20%",
    width: "25%",
    height: "30%"
  },
  hitZoneRankOne: {
    left: "8%",
    top: "13%",
    width: "39%",
    height: "28%"
  },
  hitZoneRankTwo: {
    left: "53%",
    top: "14%",
    width: "38%",
    height: "27%"
  },
  hitZoneRankThree: {
    left: "8%",
    top: "42%",
    width: "36%",
    height: "25%"
  },
  hitZoneRankFour: {
    left: "56%",
    top: "42%",
    width: "35%",
    height: "25%"
  },
  hitZoneRankFive: {
    left: "16%",
    top: "68%",
    width: "32%",
    height: "22%"
  },
  hitZoneRankSix: {
    left: "54%",
    top: "69%",
    width: "31%",
    height: "21%"
  },
  lightLayer: {
    position: "absolute",
    inset: 0
  },
  lightOrb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255, 235, 166, 0.9)",
    shadowColor: "#ffeaa8",
    shadowOpacity: 0.95,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 0 }
  },
  lightOrbOne: {
    left: "30%",
    top: "34%"
  },
  lightOrbTwo: {
    right: "27%",
    top: "51%"
  },
  lightOrbThree: {
    left: "47%",
    bottom: "27%"
  },
  backgroundTwinkleLayer: {
    position: "absolute",
    zIndex: 0,
    width: "100%",
    height: "100%"
  },
  backgroundTwinkle: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255, 235, 166, 0.92)",
    shadowColor: "#ffeaa8",
    shadowOpacity: 0.78,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 0 }
  },
  backgroundTwinkleOne: {
    left: "11%",
    top: "20%"
  },
  backgroundTwinkleTwo: {
    right: "9%",
    top: "35%"
  },
  backgroundTwinkleThree: {
    left: "20%",
    bottom: "13%"
  },
  backgroundTwinkleFour: {
    right: "-2%",
    top: "17%"
  },
  backgroundTwinkleFive: {
    left: "-1%",
    top: "48%"
  },
  backgroundTwinkleSix: {
    right: "4%",
    bottom: "14%"
  },
  backgroundTwinkleSeven: {
    left: "43%",
    top: "3%"
  },
  starburst: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ffffff",
    shadowOpacity: 0.95,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 }
  },
  starburstVertical: {
    position: "absolute",
    width: 2,
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)"
  },
  starburstHorizontal: {
    position: "absolute",
    width: "100%",
    height: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)"
  },
  starburstDiagonalOne: {
    opacity: 0.42,
    transform: [{ rotate: "45deg" }]
  },
  starburstDiagonalTwo: {
    opacity: 0.42,
    transform: [{ rotate: "45deg" }]
  },
  starburstOne: {
    width: 14,
    height: 14,
    left: "7%",
    top: "9%"
  },
  starburstTwo: {
    width: 9,
    height: 9,
    right: "16%",
    top: "8%"
  },
  starburstThree: {
    width: 11,
    height: 11,
    right: "4%",
    top: "57%"
  },
  starburstFour: {
    width: 8,
    height: 8,
    left: "12%",
    bottom: "24%"
  },
  starburstFive: {
    width: 12,
    height: 12,
    right: "25%",
    bottom: "5%"
  },
  cloudEmotionLayer: {
    position: "absolute",
    inset: 0
  },
  cloudPuff: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(180, 193, 217, 0.44)",
    borderWidth: 1,
    borderColor: "rgba(238, 242, 255, 0.2)"
  },
  cloudPuffOne: {
    width: "23%",
    height: "9%",
    left: "18%",
    top: "58%",
    transform: [{ rotate: "12deg" }]
  },
  cloudPuffTwo: {
    width: "19%",
    height: "8%",
    right: "17%",
    top: "33%",
    transform: [{ rotate: "-8deg" }]
  },
  cloudPuffThree: {
    width: "26%",
    height: "10%",
    right: "24%",
    bottom: "22%",
    transform: [{ rotate: "16deg" }]
  },
  steamVent: {
    position: "absolute",
    zIndex: 8,
    width: 56,
    height: 74,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  steamVentTop: {
    right: "26%",
    top: "18%"
  },
  steamVentLower: {
    right: "27%",
    bottom: "22%"
  },
  steamVentOuterUpperLeft: {
    left: "23%",
    top: "20%",
    transform: [{ rotate: "-18deg" }]
  },
  steamVentOuterUpperRight: {
    right: "18%",
    top: "16%",
    transform: [{ rotate: "18deg" }]
  },
  steamPuff: {
    position: "absolute",
    bottom: 4,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(246, 250, 255, 0.74)",
    shadowColor: "#d9efff",
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 }
  },
  steamPuffSmall: {
    width: 16,
    height: 16,
    backgroundColor: "rgba(246, 250, 255, 0.62)"
  },
  planet: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#5ec5ff",
    shadowColor: "#8bc7ff",
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 }
  },
  planetLayer: {
    position: "absolute",
    borderRadius: 999
  },
  oceanLayer: {
    inset: 0,
    backgroundColor: "#4fbfe9"
  },
  oceanChannel: {
    position: "absolute",
    zIndex: 1,
    borderRadius: 999,
    backgroundColor: "rgba(102, 222, 255, 0.54)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)"
  },
  oceanChannelOne: {
    width: "84%",
    height: "11%",
    left: "8%",
    top: "42%",
    transform: [{ rotate: "-18deg" }]
  },
  oceanChannelTwo: {
    width: "12%",
    height: "74%",
    left: "47%",
    top: "13%",
    transform: [{ rotate: "10deg" }]
  },
  oceanChannelThree: {
    width: "62%",
    height: "9%",
    left: "20%",
    top: "66%",
    transform: [{ rotate: "19deg" }]
  },
  cloudLayerOne: {
    width: "82%",
    height: "28%",
    left: "8%",
    top: "5%",
    backgroundColor: "rgba(255,255,255,0.38)",
    transform: [{ rotate: "-9deg" }]
  },
  cloudLayerTwo: {
    width: "65%",
    height: "22%",
    right: "-8%",
    bottom: "10%",
    backgroundColor: "rgba(255,255,255,0.26)",
    transform: [{ rotate: "16deg" }]
  },
  continentShape: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    shadowColor: "#ffffff",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: "hidden",
    zIndex: 2
  },
  landOrganicNorth: {
    borderTopLeftRadius: 58,
    borderTopRightRadius: 88,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 66
  },
  landOrganicWest: {
    borderTopLeftRadius: 82,
    borderTopRightRadius: 38,
    borderBottomLeftRadius: 62,
    borderBottomRightRadius: 46
  },
  landOrganicEast: {
    borderTopLeftRadius: 42,
    borderTopRightRadius: 86,
    borderBottomLeftRadius: 52,
    borderBottomRightRadius: 72
  },
  landOrganicSouth: {
    borderTopLeftRadius: 44,
    borderTopRightRadius: 58,
    borderBottomLeftRadius: 86,
    borderBottomRightRadius: 66
  },
  paperGrain: {
    position: "absolute",
    inset: 0,
    opacity: 0.26,
    backgroundColor: "rgba(255,255,255,0.34)"
  },
  continentInnerGlow: {
    position: "absolute",
    width: "72%",
    height: "44%",
    left: "14%",
    top: "12%",
    borderRadius: 999,
    opacity: 0.38
  },
  continentCutEdge: {
    position: "absolute",
    left: 4,
    right: 4,
    top: 4,
    bottom: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)"
  },
  northLand: {
    width: "46%",
    height: "34%",
    left: "29%",
    top: "11%",
    backgroundColor: "#bda8ff",
    transform: [{ rotate: "-14deg" }]
  },
  westLand: {
    width: "40%",
    height: "33%",
    left: "8%",
    top: "43%",
    backgroundColor: "#78e2cf",
    transform: [{ rotate: "20deg" }]
  },
  eastLand: {
    width: "41%",
    height: "36%",
    right: "7%",
    top: "42%",
    backgroundColor: "#ffd38d",
    transform: [{ rotate: "-18deg" }]
  },
  southLand: {
    width: "38%",
    height: "27%",
    left: "30%",
    bottom: "8%",
    backgroundColor: "#ff9bc8",
    transform: [{ rotate: "8deg" }]
  },
  crystalMountain: {
    position: "absolute",
    left: "42%",
    top: "21%",
    width: 58,
    height: 70,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.65)",
    transform: [{ rotate: "45deg" }]
  },
  crystalMountainSmall: {
    position: "absolute",
    left: "55%",
    top: "26%",
    width: 34,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(210,185,255,0.75)",
    transform: [{ rotate: "45deg" }]
  },
  ring: {
    position: "absolute",
    width: "120%",
    height: "36%",
    left: "-10%",
    top: "36%",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.26)",
    transform: [{ rotate: "-17deg" }]
  },
  biomeObject: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    shadowOpacity: 0.62,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }
  },
  positiveBiome: {
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6
  },
  fogBiome: {
    width: 26,
    height: 14,
    borderRadius: 999,
    opacity: 0.86
  },
  neutralBiome: {
    width: 24,
    height: 14,
    borderRadius: 5
  },
  biomeObjectText: {
    fontSize: 9,
    fontWeight: "900"
  },
  keeperWrap: {
    position: "absolute",
    zIndex: 3
  },
  keeper: {
    alignItems: "center"
  },
  keeperHead: {
    width: 11,
    height: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)"
  },
  keeperBody: {
    width: 15,
    height: 18,
    marginTop: -1,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)"
  },
  zoomControls: {
    position: "absolute",
    right: 10,
    bottom: 12,
    zIndex: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(7, 13, 42, 0.58)"
  },
  zoomButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  zoomButtonDisabled: {
    opacity: 0.38
  },
  zoomButtonText: {
    color: "#fff",
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "900"
  },
  zoomValue: {
    minWidth: 44,
    color: "rgba(238,242,255,0.86)",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center"
  },
  rotationControls: {
    zIndex: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(13, 20, 56, 0.38)"
  },
  rotateButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)"
  },
  rotateButtonText: {
    color: "#fff",
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900"
  },
  rotationInfo: {
    alignItems: "center",
    gap: 5
  },
  rotationInfoText: {
    color: "rgba(238,242,255,0.72)",
    fontSize: 10,
    fontWeight: "900"
  },
  rotationDots: {
    flexDirection: "row",
    gap: 4
  },
  rotationDot: {
    width: 6,
    height: 6,
    borderRadius: 999
  },
  visibleContinentStrip: {
    zIndex: 7,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 7,
    marginTop: -2,
    paddingHorizontal: 12
  },
  visibleContinentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1
  },
  visibleContinentChipText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900"
  },
  visibleContinentChipCount: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 10,
    fontWeight: "900"
  },
  recordFragment: {
    position: "absolute",
    zIndex: 4,
    width: 10,
    height: 7,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)"
  },
  biomeDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 }
  },
  continentLabel: {
    position: "absolute",
    zIndex: 5,
    minWidth: 112,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }
  },
  northLabel: {
    top: 22,
    left: "38%"
  },
  westLabel: {
    left: 10,
    top: "47%"
  },
  eastLabel: {
    right: 10,
    top: "49%"
  },
  southLabel: {
    bottom: 14,
    left: "35%"
  },
  continentLabelText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900"
  },
  continentCount: {
    marginTop: 3,
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    fontWeight: "800"
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  statCard: {
    width: "48.4%",
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.82)"
  },
  statLabel: {
    color: "#596082",
    fontSize: 12,
    fontWeight: "900"
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginTop: 10
  },
  statValue: {
    color: "#1b225b",
    fontSize: 26,
    fontWeight: "900"
  },
  statUnit: {
    paddingBottom: 4,
    color: "#596082",
    fontSize: 12,
    fontWeight: "900"
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900"
  },
  addPlanetButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  addPlanetText: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "700"
  },
  planetList: {
    gap: 12,
    paddingRight: 16
  },
  planetThumb: {
    width: 104,
    padding: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.13)"
  },
  planetThumbActive: {
    borderColor: "rgba(255, 145, 207, 0.78)",
    backgroundColor: "rgba(255,255,255,0.22)"
  },
  miniPlanet: {
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#b7c5ff"
  },
  miniPlanetSand: {
    backgroundColor: "#e2c596"
  },
  miniPlanetGreen: {
    backgroundColor: "#65cdf7"
  },
  miniGlow: {
    position: "absolute",
    width: 54,
    height: 18,
    left: 1,
    top: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.42)"
  },
  miniPatch: {
    position: "absolute",
    width: 35,
    height: 24,
    left: 6,
    bottom: 8,
    borderRadius: 999,
    backgroundColor: "#9be0c9"
  },
  miniPatchTwo: {
    position: "absolute",
    width: 32,
    height: 28,
    right: 4,
    top: 17,
    borderRadius: 999,
    backgroundColor: "#c2a5ff"
  },
  thumbName: {
    marginTop: 10,
    color: "#fff",
    fontSize: 12,
    fontWeight: "900"
  },
  thumbPeriod: {
    marginTop: 3,
    color: "rgba(255,255,255,0.62)",
    fontSize: 10,
    fontWeight: "800"
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  pageTitle: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "900"
  },
  pageSub: {
    marginTop: 4,
    color: "rgba(238,242,255,0.68)",
    fontSize: 13,
    fontWeight: "800"
  },
  roundAction: {
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)"
  },
  roundActionText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800"
  },
  glassCard: {
    padding: 16,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.16)"
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900"
  },
  cardLink: {
    color: "rgba(238,242,255,0.64)",
    fontSize: 12,
    fontWeight: "900"
  },
  biomeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  biomeItem: {
    flex: 1,
    alignItems: "center"
  },
  biomeIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)"
  },
  biomeIconText: {
    fontSize: 20,
    fontWeight: "900"
  },
  biomeLabel: {
    marginTop: 8,
    color: "#fff",
    fontSize: 11,
    fontWeight: "900"
  },
  biomeValue: {
    marginTop: 3,
    color: "rgba(238,242,255,0.68)",
    fontSize: 11,
    fontWeight: "800"
  },
  landscapeCard: {
    alignItems: "center",
    padding: 16,
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.14)"
  },
  landscapePlanet: {
    width: 210,
    height: 150,
    borderRadius: 34,
    overflow: "hidden"
  },
  landform: {
    position: "absolute",
    borderRadius: 999
  },
  landformLarge: {
    width: 138,
    height: 92,
    left: 35,
    top: 28
  },
  landformSmall: {
    width: 90,
    height: 34,
    left: 72,
    top: 58,
    transform: [{ rotate: "-12deg" }]
  },
  riverLine: {
    position: "absolute",
    width: 160,
    height: 10,
    left: 25,
    top: 70,
    borderRadius: 999,
    transform: [{ rotate: "-18deg" }]
  },
  landscapeTitle: {
    marginTop: 14,
    color: "#fff",
    fontSize: 17,
    fontWeight: "900"
  },
  landscapeDesc: {
    marginTop: 6,
    color: "rgba(238,242,255,0.68)",
    fontSize: 12,
    fontWeight: "800"
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.13)"
  },
  filterChipText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "900"
  },
  barList: {
    gap: 13,
    marginTop: 14
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  barLabel: {
    width: 40,
    color: "#fff",
    fontSize: 12,
    fontWeight: "900"
  },
  barTrack: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    overflow: "hidden"
  },
  barFill: {
    height: "100%",
    borderRadius: 999
  },
  barPercent: {
    width: 36,
    color: "rgba(238,242,255,0.7)",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right"
  },
  recordCard: {
    padding: 14,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.9)"
  },
  recordTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  recordDate: {
    color: "#69708f",
    fontSize: 12,
    fontWeight: "900"
  },
  recordMood: {
    color: "#6d63ca",
    fontSize: 12,
    fontWeight: "900"
  },
  recordText: {
    marginTop: 8,
    color: "#202553",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  emptyText: {
    color: "rgba(238,242,255,0.68)",
    fontSize: 13,
    fontWeight: "800"
  },
  guideWrap: {
    gap: 14
  },
  guideCard: {
    padding: 18,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.9)"
  },
  guideIndex: {
    color: "#8877f5",
    fontSize: 12,
    fontWeight: "900"
  },
  guideIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: "#eeeaff"
  },
  guideIconText: {
    color: "#8877f5",
    fontSize: 24,
    fontWeight: "900"
  },
  guideTitle: {
    marginTop: 14,
    color: "#1b225b",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  guideBody: {
    marginTop: 8,
    color: "#596082",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800"
  },
  journeyCard: {
    padding: 18,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)"
  },
  journeyTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900"
  },
  growthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18
  },
  growthArrow: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 24,
    fontWeight: "900"
  },
  journeyDesc: {
    marginTop: 16,
    color: "rgba(238,242,255,0.7)",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800"
  }
});
