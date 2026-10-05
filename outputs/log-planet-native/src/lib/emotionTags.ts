import { Platform } from "react-native";
import { Entry, Mood } from "../types/domain";
import { EmotionGroup, EmotionTagId, RepresentativeEmotionTags } from "../types/emotions";

export type EmotionTag = {
  id: EmotionTagId;
  label: string;
  group: EmotionGroup;
  legacyMood: Mood;
};

const positiveTags: EmotionTag[] = [
  ["positive:happy", "행복한", "happy"],
  ["positive:enjoyable", "즐거운", "fun"],
  ["positive:hopeful", "희망적인", "hopeful"],
  ["positive:peaceful", "평화로운", "peaceful"],
  ["positive:surprising", "놀라운", "moved"],
  ["positive:energetic", "활기찬", "excited"],
  ["positive:merry", "흥겨운", "fun"],
  ["positive:elevated", "고양된", "excited"],
  ["positive:ecstatic", "황홀한", "delight"],
  ["positive:fluttering", "설레는", "excited"],
  ["positive:cheerful", "명랑한", "joy"],
  ["positive:motivated", "의욕적인", "proud"],
  ["positive:inspired", "영감을 주는", "moved"],
  ["positive:lively", "생기있는", "recovered"],
  ["positive:thrilled", "신난", "excited"],
  ["positive:optimistic", "낙관적인", "hopeful"],
  ["positive:passionate", "열정적인", "proud"],
  ["positive:glad", "기쁜", "joy"],
  ["positive:proud", "자랑스러운", "proud"],
  ["positive:exhilarating", "짜릿한", "delight"],
  ["positive:good", "좋은", "joy"],
  ["positive:comfortable", "편안한", "calm"],
  ["positive:relaxed", "느긋한", "peaceful"],
  ["positive:contented", "흡족한", "proud"],
  ["positive:lovely", "사랑스러운", "moved"],
  ["positive:fulfilled", "충만한", "grateful"],
  ["positive:calm", "차분한", "calm"],
  ["positive:reassured", "안심되는", "calm"],
  ["positive:satisfied", "만족스러운", "proud"],
  ["positive:thankful", "고마운", "grateful"],
  ["positive:grateful", "감사한", "grateful"],
  ["positive:moved", "감동한", "moved"],
  ["positive:serene", "평온한", "peaceful"],
  ["positive:balanced", "균형 잡힌", "peaceful"],
  ["positive:relieved", "홀가분한", "recovered"],
  ["positive:self-content", "자족하는", "proud"],
  ["positive:quiet", "고요한", "calm"],
  ["positive:cozy", "포근한", "peaceful"],
  ["positive:self-esteem", "자존감 올라가는", "selfEsteem"],
  ["positive:recovered", "회복된", "recovered"],
  ["positive:touched", "뭉클한", "moved"],
  ["positive:fun", "재밌는", "fun"],
  ["positive:accomplished", "뿌듯한", "proud"]
].map(([id, label, legacyMood]) => ({ id: id as EmotionTagId, label, group: "positive", legacyMood: legacyMood as Mood }));

const neutralTags: EmotionTag[] = [
  ["neutral:curious", "궁금한", "curious"],
  ["neutral:accepting", "받아들이는", "accepting"],
  ["neutral:instructive", "교훈적인", "instructive"],
  ["neutral:difficult", "어려운", "difficult"],
  ["neutral:complex", "복잡한", "complex"],
  ["neutral:indifferent", "무덤덤한", "indifferent"],
  ["neutral:envious", "부러운", "envious"],
  ["neutral:reflective", "반성하는", "reflective"],
  ["neutral:so-so", "그저 그런", "soSo"],
  ["neutral:blank", "멍한", "blank"],
  ["neutral:focused", "집중된", "curious"],
  ["neutral:contemplative", "사색적인", "reflective"]
].map(([id, label, legacyMood]) => ({ id: id as EmotionTagId, label, group: "neutral", legacyMood: legacyMood as Mood }));

const negativeTags: EmotionTag[] = [
  ["negative:irritated", "짜증난", "irritated"],
  ["negative:tired", "피곤한", "tired"],
  ["negative:anxious", "불안한", "anxious"],
  ["negative:worried", "걱정되는", "worried"],
  ["negative:stressed", "스트레스받는", "sensitive"],
  ["negative:restless", "초조한", "anxious"],
  ["negative:shocked", "충격받은", "sensitive"],
  ["negative:enraged", "격노한", "angry"],
  ["negative:frustrated", "좌절한", "depressed"],
  ["negative:tense", "긴장한", "anxious"],
  ["negative:stunned", "망연한", "sad"],
  ["negative:scared", "겁먹은", "anxious"],
  ["negative:bothered", "귀찮은", "tired"],
  ["negative:disgusted", "혐오스러운", "angry"],
  ["negative:troubled", "심란한", "worried"],
  ["negative:uncomfortable", "불편한", "sensitive"],
  ["negative:offended", "언짢은", "irritated"],
  ["negative:repulsed", "역겨운", "angry"],
  ["negative:gloomy", "침울한", "depressed"],
  ["negative:disappointed", "실망한", "sad"],
  ["negative:sinking", "가라앉는", "sad"],
  ["negative:powerless", "무기력한", "tired"],
  ["negative:pessimistic", "비관적인", "depressed"],
  ["negative:depressed", "우울한", "depressed"],
  ["negative:discouraged", "낙담한", "sad"],
  ["negative:sad", "슬픈", "sad"],
  ["negative:bored", "지루한", "tired"],
  ["negative:alienated", "소외된", "sad"],
  ["negative:miserable", "비참한", "depressed"],
  ["negative:lonely", "외로운", "sad"],
  ["negative:disheartened", "낙심한", "sad"],
  ["negative:sullen", "시무룩한", "sad"],
  ["negative:exhausted", "기진맥진한", "tired"],
  ["negative:despairing", "절망하는", "depressed"],
  ["negative:hopeless", "희망이 없는", "depressed"],
  ["negative:lonesome", "쓸쓸한", "sad"],
  ["negative:worn-out", "지친", "tired"],
  ["negative:fed-up", "질려버린", "tired"],
  ["negative:sharp", "날카로운", "angry"],
  ["negative:pride-hurt", "자존심상한", "prideHurt"],
  ["negative:sensitive", "예민한", "sensitive"],
  ["negative:jealous", "질투나는", "jealous"],
  ["negative:regretful", "후회되는", "regret"],
  ["negative:absurd", "황당한", "sensitive"]
].map(([id, label, legacyMood]) => ({ id: id as EmotionTagId, label, group: "negative", legacyMood: legacyMood as Mood }));

export const emotionGroups: EmotionGroup[] = ["positive", "neutral", "negative"];
export const emotionGroupLabels: Record<EmotionGroup, string> = {
  positive: "긍정 감정",
  neutral: "중간 감정",
  negative: "부정 감정"
};
export const emotionTags: EmotionTag[] = [...positiveTags, ...neutralTags, ...negativeTags];

const emotionTagEmojis: Partial<Record<EmotionTagId, string>> = {
  "positive:happy": "😊", "positive:enjoyable": "😄", "positive:hopeful": "🌤️", "positive:peaceful": "🕊️",
  "positive:surprising": "😮", "positive:energetic": "⚡", "positive:merry": "🥳", "positive:elevated": "🤩",
  "positive:ecstatic": "😍", "positive:fluttering": "💓", "positive:cheerful": "😆", "positive:motivated": "🔥",
  "positive:inspired": "💡", "positive:lively": "🌱", "positive:thrilled": "🤸", "positive:optimistic": "☀️",
  "positive:passionate": "❤️‍🔥", "positive:glad": "😁", "positive:proud": "🏅", "positive:exhilarating": "⚡",
  "positive:good": "🙂", "positive:comfortable": "😌", "positive:relaxed": "🛋️", "positive:contented": "😊",
  "positive:lovely": "🥰", "positive:fulfilled": "💗", "positive:calm": "🧘", "positive:reassured": "😮‍💨",
  "positive:satisfied": "☺️", "positive:thankful": "🙏", "positive:grateful": "💐", "positive:moved": "🥹",
  "positive:serene": "🌿", "positive:balanced": "⚖️", "positive:relieved": "🪽", "positive:self-content": "😌",
  "positive:quiet": "🌙", "positive:cozy": "🧸", "positive:self-esteem": "💪", "positive:recovered": "🌱",
  "positive:touched": "🥹", "positive:fun": "😆", "positive:accomplished": "✨",
  "neutral:curious": "🤔", "neutral:accepting": "🙌", "neutral:instructive": "📘", "neutral:difficult": "🧩",
  "neutral:complex": "🌀", "neutral:indifferent": "😐", "neutral:envious": "👀", "neutral:reflective": "🪞",
  "neutral:so-so": "😶", "neutral:blank": "😶‍🌫️", "neutral:focused": "🎯", "neutral:contemplative": "💭",
  "negative:irritated": "😤", "negative:tired": "😩", "negative:anxious": "😰", "negative:worried": "😟",
  "negative:stressed": "🤯", "negative:restless": "😬", "negative:shocked": "😱", "negative:enraged": "🤬",
  "negative:frustrated": "😣", "negative:tense": "😖", "negative:stunned": "😶", "negative:scared": "😨",
  "negative:bothered": "😑", "negative:disgusted": "🤢", "negative:troubled": "😵‍💫", "negative:uncomfortable": "😕",
  "negative:offended": "🙄", "negative:repulsed": "🤮", "negative:gloomy": "🌧️", "negative:disappointed": "😞",
  "negative:sinking": "😔", "negative:powerless": "🫥", "negative:pessimistic": "🌑", "negative:depressed": "😢",
  "negative:discouraged": "😞", "negative:sad": "😢", "negative:bored": "🥱", "negative:alienated": "🫥",
  "negative:miserable": "😭", "negative:lonely": "🥀", "negative:disheartened": "😔", "negative:sullen": "☹️",
  "negative:exhausted": "🫠", "negative:despairing": "😭", "negative:hopeless": "🕳️", "negative:lonesome": "🌙",
  "negative:worn-out": "😫", "negative:fed-up": "😒", "negative:sharp": "😠", "negative:pride-hurt": "😖",
  "negative:sensitive": "🫨", "negative:jealous": "😒", "negative:regretful": "😓", "negative:absurd": "🤨"
};

export const moodDisplayLabels: Record<Mood, string> = {
  calm: "차분함", joy: "좋음", moved: "뭉클함", recovered: "회복됨", happy: "행복함", delight: "기쁨",
  excited: "설렘", fun: "재밌음", hopeful: "희망적임", grateful: "고마움", proud: "뿌듯함",
  peaceful: "평화로움", lucky: "행운", selfEsteem: "자존감상승", soSo: "그저 그럼", indifferent: "무덤덤함",
  curious: "궁금함", accepting: "받아들임", reflective: "반성함", envious: "부러움", instructive: "교훈적임",
  difficult: "어려움", anxious: "불안함", worried: "걱정됨", tired: "피곤함", sad: "가라앉음",
  depressed: "우울함", angry: "날카로움", irritated: "짜증남", jealous: "질투", prideHurt: "자존심상함",
  sensitive: "예민함", regret: "후회됨", blank: "멍함", complex: "복잡함"
};

const moodEmojis: Record<Mood, string> = {
  calm: "🧘", joy: "🙂", moved: "🥹", recovered: "🌱", happy: "😊", delight: "😁", excited: "💓",
  fun: "😆", hopeful: "🌤️", grateful: "🙏", proud: "✨", peaceful: "🕊️", lucky: "☀️", selfEsteem: "💪",
  soSo: "😶", indifferent: "😐", curious: "🤔", accepting: "🙌", reflective: "🪞", envious: "👀",
  instructive: "📘", difficult: "🧩", anxious: "😰", worried: "😟", tired: "😩", sad: "😔",
  depressed: "😢", angry: "😠", irritated: "😤", jealous: "😒", prideHurt: "😖", sensitive: "🫨",
  regret: "😓", blank: "😶‍🌫️", complex: "🌀"
};

const emotionTagMap = new Map(emotionTags.map((tag) => [tag.id, tag]));

export const defaultRepresentativeEmotionTags: RepresentativeEmotionTags = {
  positive: ["positive:happy", "positive:enjoyable", "positive:hopeful"],
  neutral: ["neutral:curious", "neutral:accepting", "neutral:instructive"],
  negative: ["negative:irritated", "negative:tired", "negative:anxious"]
};

const legacyMoodTagMap: Record<Mood, EmotionTagId> = {
  calm: "positive:calm",
  joy: "positive:good",
  moved: "positive:touched",
  recovered: "positive:recovered",
  happy: "positive:happy",
  delight: "positive:glad",
  excited: "positive:fluttering",
  fun: "positive:fun",
  hopeful: "positive:hopeful",
  grateful: "positive:thankful",
  proud: "positive:accomplished",
  peaceful: "positive:peaceful",
  lucky: "positive:optimistic",
  selfEsteem: "positive:self-esteem",
  anxious: "negative:anxious",
  soSo: "neutral:so-so",
  indifferent: "neutral:indifferent",
  curious: "neutral:curious",
  accepting: "neutral:accepting",
  reflective: "neutral:reflective",
  envious: "neutral:envious",
  instructive: "neutral:instructive",
  difficult: "neutral:difficult",
  worried: "negative:worried",
  tired: "negative:tired",
  sad: "negative:sinking",
  depressed: "negative:depressed",
  angry: "negative:sharp",
  irritated: "negative:irritated",
  jealous: "negative:jealous",
  prideHurt: "negative:pride-hurt",
  sensitive: "negative:sensitive",
  regret: "negative:regretful",
  blank: "neutral:blank",
  complex: "neutral:complex"
};

export function tagsForEmotionGroup(group: EmotionGroup) {
  return emotionTags.filter((tag) => tag.group === group);
}

export function getEmotionTag(id: EmotionTagId | string | null | undefined) {
  return id ? emotionTagMap.get(id as EmotionTagId) || null : null;
}

export function isEmotionTagId(value: unknown): value is EmotionTagId {
  return typeof value === "string" && emotionTagMap.has(value as EmotionTagId);
}

export function emotionTagIdForEntry(entry: Pick<Entry, "mood" | "moodTag">): EmotionTagId {
  return isEmotionTagId(entry.moodTag) ? entry.moodTag : legacyMoodTagMap[entry.mood];
}

export function emotionTagLabel(id: EmotionTagId | string) {
  return getEmotionTag(id)?.label || String(id);
}

export function emotionTagDisplayLabel(id: EmotionTagId | string) {
  const label = emotionTagLabel(id);
  if (Platform.OS !== "ios") return label;
  const emoji = emotionTagEmojis[id as EmotionTagId];
  return emoji ? `${emoji} ${label}` : label;
}

export function moodDisplayLabel(mood: Mood) {
  const label = emotionTagLabel(legacyMoodTagMap[mood]);
  return Platform.OS === "ios" ? `${moodEmojis[mood]} ${label}` : label;
}

export function normalizeRepresentativeEmotionTags(value: unknown): RepresentativeEmotionTags {
  const candidate = value && typeof value === "object" ? value as Partial<Record<EmotionGroup, unknown>> : {};
  return Object.fromEntries(emotionGroups.map((group) => {
    const saved = Array.isArray(candidate[group]) ? candidate[group] : [];
    const valid = saved.filter((id): id is EmotionTagId => isEmotionTagId(id) && getEmotionTag(id)?.group === group);
    const filled = [...new Set([...valid, ...defaultRepresentativeEmotionTags[group]])].slice(0, 3);
    return [group, filled];
  })) as RepresentativeEmotionTags;
}

export function orderedEmotionTags(group: EmotionGroup, representativeIds: EmotionTagId[]) {
  const tags = tagsForEmotionGroup(group);
  const rank = new Map(representativeIds.map((id, index) => [id, index]));
  return [...tags].sort((left, right) => {
    const leftRank = rank.get(left.id);
    const rightRank = rank.get(right.id);
    if (leftRank !== undefined || rightRank !== undefined) {
      return (leftRank ?? Number.MAX_SAFE_INTEGER) - (rightRank ?? Number.MAX_SAFE_INTEGER);
    }
    return 0;
  });
}
