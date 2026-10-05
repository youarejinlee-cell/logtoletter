export type EmotionGroup = "positive" | "neutral" | "negative";
export type EmotionTagId = `${EmotionGroup}:${string}`;
export type RepresentativeEmotionTags = Record<EmotionGroup, EmotionTagId[]>;
