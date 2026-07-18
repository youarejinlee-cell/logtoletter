import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const targetUserId = process.argv[process.argv.indexOf("--user-id") + 1];
const shouldExecute = process.argv.includes("--execute");

if (!targetUserId || !/^[0-9a-f-]{36}$/i.test(targetUserId)) {
  throw new Error("--user-id에 심사용 Supabase 사용자 UUID를 입력해야 합니다.");
}

const plans = [
  {
    month: "2026-05",
    days: 31,
    counts: { selfDiscipline: 16, work: 14, other: 10 }
  },
  {
    month: "2026-06",
    days: 30,
    counts: { relationship: 13, work: 11, taste: 9, other: 8, selfDiscipline: 7, health: 5 }
  },
  {
    month: "2026-07",
    days: 17,
    counts: { work: 7, taste: 4, health: 3, selfDiscipline: 2, other: 1 }
  }
];

const starts = {
  work: [
    "미뤄둔 문서를 차분히 마무리했다.",
    "회의에서 준비한 의견을 또렷하게 전했다.",
    "집중이 잘 되는 시간에 중요한 일을 먼저 끝냈다.",
    "동료와 막힌 부분을 나누고 해결책을 찾았다.",
    "작은 업무 하나를 예상보다 빠르게 정리했다.",
    "오늘 할 일의 우선순위를 다시 세웠다.",
    "새로운 방식을 시도했더니 일이 한결 수월해졌다.",
    "오래 고민한 기획의 첫 단계를 시작했다.",
    "피드백을 반영해 결과물을 더 단단하게 다듬었다.",
    "복잡했던 문제를 순서대로 풀어냈다.",
    "바쁜 와중에도 잠깐 멈춰 진행 상황을 점검했다.",
    "예상치 못한 요청에도 침착하게 대응했다."
  ],
  relationship: [
    "오랜만에 친구와 천천히 안부를 나눴다.",
    "가족의 이야기를 끊지 않고 끝까지 들었다.",
    "고마웠던 마음을 미루지 않고 표현했다.",
    "서운했던 부분을 조심스럽게 이야기했다.",
    "함께 웃을 수 있는 사소한 순간이 있었다.",
    "먼저 연락해 보고 싶었던 사람에게 메시지를 보냈다.",
    "상대의 입장에서 한 번 더 생각해 봤다.",
    "도움을 받은 만큼 나도 손을 내밀었다.",
    "익숙한 사람의 새로운 면을 발견했다.",
    "혼자 단정 짓지 않고 마음을 직접 물어봤다.",
    "짧은 대화였지만 서로의 하루를 이해할 수 있었다.",
    "약속한 시간을 지키기 위해 조금 서둘렀다.",
    "함께 있는 동안 휴대폰을 내려두고 집중했다."
  ],
  selfDiscipline: [
    "오늘 반복된 생각을 적으며 내 마음을 들여다봤다.",
    "잘하고 싶은 마음이 왜 조급함으로 바뀌는지 생각했다.",
    "실수한 장면을 떠올리며 다음 선택을 정리했다.",
    "남의 기준보다 내가 원하는 방향을 먼저 물어봤다.",
    "불편한 감정을 피하지 않고 이름 붙여 봤다.",
    "아침에 세운 작은 약속을 끝까지 지켰다.",
    "완벽하게 하려는 마음을 조금 내려놓았다.",
    "오늘 잘한 일을 사소하더라도 하나 적었다.",
    "반복되는 걱정과 실제로 할 수 있는 일을 구분했다.",
    "지친 이유를 탓하지 않고 필요한 휴식을 생각했다.",
    "내가 중요하게 여기는 가치가 무엇인지 다시 적었다.",
    "감정이 가라앉은 뒤 상황을 다른 각도에서 바라봤다.",
    "미루던 결정을 작은 단계로 나눠 보기로 했다.",
    "비교하는 마음이 올라오는 순간을 알아차렸다.",
    "오늘의 선택이 내일의 나에게 어떤 의미인지 생각했다.",
    "마음이 복잡할수록 천천히 호흡하며 중심을 찾았다."
  ],
  taste: [
    "좋아하는 음악을 들으며 천천히 산책했다.",
    "궁금했던 전시를 보고 오래 기억할 장면을 찾았다.",
    "새로운 카페에서 마음에 드는 자리를 발견했다.",
    "읽던 책의 한 문장이 오늘 마음에 오래 남았다.",
    "손으로 무언가 만드는 시간에 푹 빠졌다.",
    "평소와 다른 색을 골라 작은 변화를 줬다.",
    "보고 싶었던 영화를 끝까지 집중해서 봤다.",
    "좋아하는 향을 피우고 방을 정리했다.",
    "새로운 취미를 가볍게 시작해 봤다."
  ],
  health: [
    "몸이 무거워 짧게라도 바깥을 걸었다.",
    "늦은 시간의 간식을 줄이고 따뜻한 물을 마셨다.",
    "굳은 어깨를 풀기 위해 스트레칭을 했다.",
    "피곤함을 인정하고 평소보다 일찍 쉬었다.",
    "천천히 식사하며 몸의 신호에 집중했다.",
    "오랜만에 가볍게 땀을 내고 개운함을 느꼈다."
  ],
  other: [
    "창밖의 빛이 예뻐서 잠시 멈춰 바라봤다.",
    "우연히 발견한 문장이 하루의 분위기를 바꿨다.",
    "갑자기 떠오른 생각을 잊기 전에 기록했다.",
    "계획에 없던 일이 생겼지만 서두르지 않았다.",
    "오래 찾던 물건을 예상 밖의 곳에서 발견했다.",
    "비 오는 소리를 들으며 잠깐 아무것도 하지 않았다.",
    "익숙한 길에서 전에 보지 못한 풍경을 봤다.",
    "정리하다 나온 오래된 메모를 다시 읽었다.",
    "오늘 하루를 한 단어로 표현해 봤다.",
    "문득 떠오른 아이디어를 짧게 적어 두었다."
  ]
};

const endings = [
  "작게라도 움직인 내가 꽤 마음에 들었다.",
  "생각보다 에너지를 많이 썼지만 후회는 없었다.",
  "서두르지 않으니 놓쳤던 부분이 보였다.",
  "기분이 한결 가벼워져 다음 일도 시작할 수 있었다.",
  "아직 답은 없지만 방향은 조금 선명해졌다.",
  "완벽하지 않아도 충분하다는 생각이 들었다.",
  "잠깐의 선택이 오늘 전체를 부드럽게 만들었다.",
  "내일도 이 감각을 기억하고 싶다.",
  "조금 피곤했지만 의미 있는 시간이었다.",
  "예상과 달랐지만 그 안에서 배운 점이 있었다.",
  "마음을 기록하고 나니 감정이 차분해졌다.",
  "오늘의 나에게 필요한 것이 무엇인지 알 것 같았다."
];

const positiveMoods = ["joy", "happy", "hopeful", "grateful", "proud", "calm", "recovered", "peaceful", "excited", "fun"];
const neutralMoods = ["soSo", "curious", "accepting", "reflective", "instructive", "complex", "indifferent", "blank"];
const negativeMoods = ["tired", "worried", "anxious", "irritated", "sad", "sensitive", "regret", "difficult"];
const energyValues = [20, 50, 70, 40, 90, 30, 60, 80, 10, 100];

function deterministicUuid(key) {
  const hex = createHash("sha256").update(key).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function shuffledCategories(counts, seed) {
  const categories = Object.entries(counts).flatMap(([category, count]) => Array(count).fill(category));
  let state = seed;
  for (let index = categories.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const target = state % (index + 1);
    [categories[index], categories[target]] = [categories[target], categories[index]];
  }
  return categories;
}

function moodFor(month, category, categoryIndex, globalIndex) {
  if (month === "2026-06" && category === "work") {
    if (categoryIndex === 4) return "reflective";
    if (categoryIndex === 9) return "tired";
    return positiveMoods[(categoryIndex * 3) % positiveMoods.length];
  }
  const groups = [positiveMoods, neutralMoods, negativeMoods, positiveMoods, neutralMoods];
  const group = groups[(globalIndex + categoryIndex * 2) % groups.length];
  return group[(globalIndex * 3 + categoryIndex) % group.length];
}

const usedTexts = new Set();

function entriesForPlan(plan, planIndex) {
  const categories = shuffledCategories(plan.counts, 202605 + planIndex * 97);
  const seenByCategory = {};
  return categories.map((category, index) => {
    const categoryIndex = seenByCategory[category] || 0;
    seenByCategory[category] = categoryIndex + 1;
    const day = plan.month === "2026-07" ? index + 1 : Math.floor((index * plan.days) / categories.length) + 1;
    const hour = 8 + ((index * 5 + planIndex) % 14);
    const minute = [5, 18, 27, 41, 53][index % 5];
    const createdAt = `${plan.month}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`;
    const startList = starts[category];
    const start = startList[(categoryIndex + planIndex * 4) % startList.length];
    let endingIndex = (categoryIndex * 5 + index + planIndex) % endings.length;
    let text = `${start} ${endings[endingIndex]}`;
    while (usedTexts.has(text)) {
      endingIndex = (endingIndex + 1) % endings.length;
      text = `${start} ${endings[endingIndex]}`;
    }
    usedTexts.add(text);
    return {
      id: deterministicUuid(`log-planet-review-${plan.month}-${index}-${category}`),
      text,
      mood: moodFor(plan.month, category, categoryIndex, index),
      energy: energyValues[(index * 3 + categoryIndex + planIndex) % energyValues.length],
      category,
      createdAt
    };
  });
}

const entries = plans.flatMap(entriesForPlan);

function escapeSql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const values = entries.map((entry) => `(
  ${escapeSql(entry.id)}::uuid,
  ${escapeSql(targetUserId)}::uuid,
  ${escapeSql(entry.text)},
  ${escapeSql(entry.mood)},
  ${entry.energy},
  ${escapeSql(entry.category)},
  'native',
  ${escapeSql(entry.createdAt)}::timestamptz,
  now()
)`).join(",\n");

const sql = `begin;
delete from public.entries
where user_id = '${targetUserId}'::uuid
  and created_at >= '2026-05-01T00:00:00+09:00'::timestamptz
  and created_at < '2026-08-01T00:00:00+09:00'::timestamptz;

insert into public.entries (id, user_id, text, mood, energy, category, source, created_at, updated_at)
values
${values};
commit;`;

const summary = plans.map((plan) => ({
  month: plan.month,
  total: Object.values(plan.counts).reduce((sum, count) => sum + count, 0),
  counts: plan.counts
}));

if (!shouldExecute) {
  console.log(JSON.stringify({ targetUserId, total: entries.length, summary }, null, 2));
  process.exit(0);
}

const result = spawnSync("npx", ["supabase", "db", "query", "--linked", sql], {
  cwd: new URL("..", import.meta.url),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status || 1);
}

console.log(JSON.stringify({ executed: true, targetUserId, total: entries.length, summary }, null, 2));
