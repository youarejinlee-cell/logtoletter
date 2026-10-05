import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type EntryRow = {
  id: string;
  text: string;
  mood: string;
  energy: number;
  created_at: string;
};

type LetterRow = {
  id: string;
  delivered_at: string;
  prompt_version: string | null;
};

type LetterDraft = {
  title: string;
  keyword: string;
  body: string;
  themes: string[];
  recommendations: string[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const promptVersion = "ai-weekly-v7";
const fallbackPromptVersion = "native-rule-v1";
const minAIEntryCount = 5;
const minAITextLength = 100;

const moodMeta: Record<string, { label: string; category: "positive" | "neutral" | "negative" }> = {
  calm: { label: "차분함", category: "positive" },
  joy: { label: "좋음", category: "positive" },
  moved: { label: "뭉클함", category: "positive" },
  recovered: { label: "회복됨", category: "positive" },
  proud: { label: "뿌듯함", category: "positive" },
  grateful: { label: "고마움", category: "positive" },
  peaceful: { label: "평화로움", category: "positive" },
  lucky: { label: "행운", category: "positive" },
  happy: { label: "행복함", category: "positive" },
  delight: { label: "기쁨", category: "positive" },
  excited: { label: "설렘", category: "positive" },
  fun: { label: "재밌음", category: "positive" },
  hopeful: { label: "희망적임", category: "positive" },
  selfEsteem: { label: "자존감상승", category: "positive" },
  complex: { label: "복잡함", category: "neutral" },
  indifferent: { label: "무덤덤함", category: "neutral" },
  curious: { label: "궁금함", category: "neutral" },
  accepting: { label: "받아들임", category: "neutral" },
  reflective: { label: "반성함", category: "neutral" },
  envious: { label: "부러움", category: "neutral" },
  instructive: { label: "교훈적임", category: "neutral" },
  difficult: { label: "어려움", category: "neutral" },
  blank: { label: "멍함", category: "neutral" },
  anxious: { label: "불안함", category: "negative" },
  worried: { label: "걱정됨", category: "negative" },
  tired: { label: "피곤함", category: "negative" },
  sad: { label: "가라앉음", category: "negative" },
  depressed: { label: "우울함", category: "negative" },
  angry: { label: "날카로움", category: "negative" },
  irritated: { label: "짜증남", category: "negative" },
  jealous: { label: "질투", category: "negative" },
  prideHurt: { label: "자존심상함", category: "negative" },
  sensitive: { label: "예민함", category: "negative" },
  regret: { label: "후회됨", category: "negative" }
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function dateKey(value: string | Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatKoreanDate(value: string | Date) {
  const [year, month, day] = dateKey(value).split("-");
  return `${Number(year)}년 ${Number(month)}월 ${Number(day)}일`;
}

function parseDateKey(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Invalid date: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function addDays(value: string, days: number) {
  const date = parseDateKey(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isDateBetween(value: string, start: string, end: string) {
  return value >= start && value <= end;
}

function htmlFromBody(body: string) {
  return body
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[char] || char))}</p>`)
    .join("");
}

function getKeyword(entries: EntryRow[]) {
  const text = entries.map((entry) => entry.text).join(" ");
  if (/일|업무|회의|마감|회사|프로젝트/.test(text)) return "잘해내고 싶은 마음";
  if (/연애|좋아|답장|데이트|상대|관계/.test(text)) return "관계 안에서 바라는 것";
  if (/친구|사람|가족|대화/.test(text)) return "사람들 사이 내가 원하는 것";
  if (/몸|피곤|잠|아픔|컨디션/.test(text)) return "몸이 알려준 신호";
  if (/나|자존감|스스로|칭찬/.test(text)) return "나를 대하는 방식";
  return "생각 속 반복된 키워드";
}

function totalTextLength(entries: EntryRow[]) {
  return entries.reduce((sum, entry) => sum + entry.text.trim().length, 0);
}

function shouldUseOpenAI(entries: EntryRow[]) {
  return entries.length >= minAIEntryCount || totalTextLength(entries) >= minAITextLength;
}

function fallbackLetter(entries: EntryRow[], periodStart: string, periodEnd: string): LetterDraft {
  if (!entries.length) {
    return {
      title: "아직 모이지 않은 이야기",
      keyword: "기록되지 않은 한 주",
      body: "이번 주는 편지로 묶을 만큼 기록이 모이지 않았어.\n\n아무 일도 없었다는 뜻은 아닐 거야. 다만 이번 편지는 해석을 보태기보다 비어 있는 부분을 그대로 두는 편이 맞아 보여.\n\n전에 받은 편지를 다시 보면, 다음 기록을 어디서 시작하면 좋을지 조금 더 쉽게 정할 수 있어.",
      themes: [],
      recommendations: ["다음 기록이 시작되는 장면만 짧게 남겨보기"]
    };
  }

  const sorted = [...entries].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const keyword = getKeyword(sorted);

  if (!shouldUseOpenAI(entries)) {
    return {
      title: "기록을 더 모아보는 주",
      keyword,
      body: "이번 주는 AI가 따로 해석하기엔 기록이 아직 조금 적었어.\n\n그래도 남겨둔 기록이 있다는 것만으로도 돌아볼 재료는 생겼어. 이번에는 새 통찰을 만들기보다, 이전에 받은 편지를 한 번 다시 읽어보는 쪽이 더 잘 맞아.\n\n다음 편지까지 기록이 조금 더 모이면, 그때는 장면들 사이의 공통점도 더 잘 보일 거야.",
      themes: [keyword],
      recommendations: ["전에 받은 편지 다시 읽어보기"]
    };
  }

  return {
    title: "같은 방향을 본 주",
    keyword,
    body: "이번 주 기록에서 먼저 보인 건 걱정과 확인이 같이 움직였다는 점이었어.\n\n해야 할 일을 생각할 때 에너지가 낮아지는 장면도 있었지만, 막상 작게 시작한 순간에는 다시 올라오는 기록이 있었어. 문제 자체보다 시작하기 전의 마음이 더 크게 느껴졌을 가능성이 있어.\n\n이번 주를 힘들었던 주로만 기억할 수도 있겠지만, 기록만 놓고 보면 버틴 일보다 해낸 일이 더 많이 남아 있어.\n\n돌아오는 주에는 할 일을 크게 붙잡기 전에 가장 작은 첫 동작 하나를 먼저 정해봐도 좋겠어.",
    themes: [keyword],
    recommendations: ["기록이 남는 순간이 일 전인지 후인지 살펴보기"]
  };
}

function buildSystemPrompt() {
  return [
    "역할: 너는 사용자의 일주일 기록을 읽고 짧은 편지를 보내는 '지적이면서도 감정을 배려해줄 줄 아는 적당한 거리감의 언니/누나'다. 이 편지의 목적은 사용자를 위로하거나 분석하는 것이 아니다. 사용자가 자신의 일주일을 한 발 떨어져서 객관적으로 다시 보게 만드는 것이다.",
    "앱 컨셉: 사용자는 매일 짧은 기록을 남긴다. 일주일 뒤 기록들이 모여 한 통의 편지로 도착한다. 이 편지는 주간 리포트도 상담 결과도 아니다. 사용자가 스스로를 조금 더 이해하고 지난 기록을 돌아보도록 돕는 관찰 메모에 가깝다.",
    "가장 중요한 원칙: 사용자는 기록 내용을 다시 읽고 싶은 것이 아니다. 기록들 사이의 연결점을 발견하고 싶어 한다. 따라서 기록을 요약하지 말고 관찰하라.",
    "입력 설명: energy는 사용자가 '사용한 에너지(%)'를 0~100%로 고른 값이다. 0%는 거의 에너지를 쓰지 않은 상태, 50%는 중간, 100%는 많이 쓴 상태로 해석한다.",
    "해야 할 것: 기록 전체를 읽고 가장 눈에 띄는 흐름 1~2개만 선택한다. 감정과 에너지의 비율을 계산해 사용자가 알아차릴 수 있게 말한다. 예: '이번 주는 절반 이상의 기록이 긍정적인 감정이었어.'",
    "해야 할 것: 생각 내용과 선택한 감정/에너지 사이의 차이를 본다. 문장은 낮은 에너지처럼 보이지만 높은 점수를 골랐다면 버틴 힘이나 전환한 흔적을 짚는다. 부정적인 문장으로 시작했지만 생각을 전환하려 애쓴 흔적이 있으면 언급한다.",
    "해야 할 것: 사건보다 사용자의 반응과 태도에 주목한다. 사건의 성격과 반응이 엇갈리면 그 원인이 되는 마음을 생각해보도록 유도한다. 에너지가 좋았던 때나 긍정 감정이 있었던 때를 간단히 언급하고, 가능하다면 그런 일의 빈도를 높여보자고 가볍게 제안한다.",
    "해야 할 것: 여러 기록을 연결해 하나의 관찰을 만든다. 업무, 인간관계, 연인과의 관계, 가족관계, 꿈과 이상, 취향 같은 분류 중 자주 등장하는 것을 알아차렸는지 묻는다. 긍정 기록의 비중이 높으면 그 사실을 알고 있었는지 확인하는 질문을 남긴다.",
    "해야 할 것: 부정적인 기록이나 낮은 점수는 누구에게나 있을 수 있는 일로 다룬다. 개선하고 싶은 부분이 있다면 돌아오는 주에 한 가지 초점을 정해보자는 정도로만 말한다. 단정하지 말고 조심스럽지만 태도나 환경 세팅의 변화를 유쾌하게 제안한다.",
    "해야 할 것: 오전, 오후, 저녁 시간대로 나눠 사용자가 자주 느끼는 감정이나 습관이 보이면 알고 있었는지 묻는다. 시간대 관찰은 기록 수가 충분하고 실제 차이가 보일 때만 사용한다.",
    "문장 규칙: 읽기 쉬운 문장을 사용한다. 한 문장에는 하나의 생각만 담는다. 문단은 짧게 쓴다. 사용자가 이미 알고 있는 사실보다 한 단계 위의 시각을 제공한다. 사용자가 남긴 기록에서 감성을 30% 정도 덜어낸 수준으로 답한다.",
    "하지 말 것: 날짜별 요약, 기록 나열, '패턴', '키워드' 같은 분석 용어, 상담사 말투, 과도한 위로, 과도한 공감, 심리 진단, 시적인 표현 남용, 추상적인 문장 남용, 문학적 표현 남용, 감정의 의인화, 사용자가 사용하지 않은 추상적/문학적 용어 사용을 금지한다. 흥미, 재미, 의미를 느낀다는 식으로 쓰지 않는다.",
    "금지 표현: '숨 고르기', '마음의 결', '고요히', '묘하게', '바람처럼', '이면', '흐름 속에서', '~인지도 모르겠어', '~같은 느낌이야', '문득 그런 생각이 들었어', '스며든다', '진실', '흥미롭다', '흥미로운'을 body에 쓰지 않는다. 이처럼 의미도 없고 이용자를 생각하게 하지도 않는 표현은 사용하지 않는다.",
    "편지 구조: 시작은 기록 전체를 읽고 가장 먼저 눈에 들어온 점을 말한다. 관찰은 최대 2개까지만 다룬다. 낯설게 보기에서는 사용자가 미처 연결하지 못했을 수 있는 점을 가능성으로 제안한다. 마무리는 짧은 질문이나 생각거리 하나로 끝낸다. 가벼운 응원 문구는 사용자가 긍정 감정을 40% 이상 느꼈을 때만 한 문장 이내로 허용한다.",
    "문체: 친한 사람이 보내는 편지. 담백하고 차분한 톤. 문학 작품처럼 쓰지 말 것. 리포트처럼 쓰지 말 것. 읽는 데 1분 이내. 쉽게 읽히지만 한 문장은 남게 쓴다.",
    "길이: body는 한국어 400~700자.",
    "기록이 적은 경우: 이 프롬프트는 기록이 5개 이상이거나 총 100자 이상일 때만 호출된다. 그래도 기록 근거가 부족하면 해석을 최소화하고 관찰 가능한 사실만 말한다. 억지 통찰을 만들지 않는다.",
    "Output: 반드시 요청된 JSON Schema만 출력한다. body 필드에는 제목, 소제목, 분석 결과, 불릿포인트 없이 편지 본문만 넣는다. title, keyword, themes, recommendations는 UI용 메타데이터이며 body 안에 반복하지 않는다."
  ].join("\\n");
}

function parseOpenAIText(result: Record<string, unknown>) {
  if (typeof result.output_text === "string") return result.output_text;
  const output = Array.isArray(result.output) ? result.output : [];
  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") return text;
    }
  }
  throw new Error("OpenAI 응답에서 편지 본문을 찾지 못했어.");
}

async function generateLetterWithOpenAI(entries: EntryRow[], periodStart: string, periodEnd: string, deliveredAt: string): Promise<LetterDraft> {
  if (!entries.length) return fallbackLetter(entries, periodStart, periodEnd);
  if (!shouldUseOpenAI(entries)) return fallbackLetter(entries, periodStart, periodEnd);

  const openAIKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAIKey) throw new Error("OPENAI_API_KEY secret이 필요해.");
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";
  const compactEntries = entries
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, 80)
    .map((entry) => {
      const mood = moodMeta[entry.mood] || { label: entry.mood, category: "neutral" as const };
      return {
        date: dateKey(entry.created_at),
        time: entry.created_at.slice(11, 16),
        mood: mood.label,
        moodCategory: mood.category,
        energy: entry.energy,
        text: entry.text
      };
    });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAIKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: buildSystemPrompt()
        },
        {
          role: "user",
          content: JSON.stringify({
            period: {
              start: periodStart,
              end: periodEnd,
              deliveredAt,
              display: `${formatKoreanDate(periodStart)} ~ ${formatKoreanDate(periodEnd)}`
            },
            entryCount: compactEntries.length,
            entries: compactEntries,
            writingRules: {
              title: "UI용 짧은 제목. 편지 전체를 한 문장으로 요약하되 body에는 제목을 쓰지 않는다. 18자 안팎.",
              keyword: "UI 목록용 짧은 문구. body에는 '키워드'라는 말을 쓰지 않는다. 12자 안팎.",
              body: "편지 본문만 쓴다. 400~700자. 날짜별 요약, 기록 나열, 불릿, 분석 용어, 상담식 조언을 금지한다. 짧은 문단으로 나눈다.",
              themes: "UI의 '자주 나타난 카테고리' 영역에 넣을 항목이다. 업무, 인간관계, 연인과의 관계, 가족관계, 꿈과 이상, 취향, 몸과 건강, 휴식처럼 구체적인 분류를 1~2개 우선 쓴다.",
              recommendations: "UI의 '이번 주 제안' 영역에 넣을 항목이다. AI 응답 중 가볍게 제안할 만한 작은 생각거리나 행동을 1~2개 쓴다. 없다면 빈 배열도 가능하다."
            }
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "weekly_letter",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["title", "keyword", "body", "themes", "recommendations"],
            properties: {
              title: { type: "string" },
              keyword: { type: "string" },
              body: { type: "string" },
              themes: {
                type: "array",
                maxItems: 5,
                items: { type: "string" }
              },
              recommendations: {
                type: "array",
                maxItems: 3,
                items: { type: "string" }
              }
            }
          }
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API 오류: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const parsed = JSON.parse(parseOpenAIText(result)) as LetterDraft;
  return {
    title: parsed.title?.trim() || fallbackLetter(entries, periodStart, periodEnd).title,
    keyword: parsed.keyword?.trim() || getKeyword(entries),
    body: parsed.body?.trim() || fallbackLetter(entries, periodStart, periodEnd).body,
    themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 5) : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 5) : []
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Supabase Edge Function secrets are missing." }, 500);
    }

  const authorization = request.headers.get("Authorization") || "";
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } }
  });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const body = await request.json().catch(() => ({}));
  const today = typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
    ? body.today
    : dateKey(new Date());

  const userId = userData.user.id;
  const { data: entries, error: entriesError } = await serviceClient
    .from("entries")
    .select("id,text,mood,energy,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (entriesError) return jsonResponse({ error: entriesError.message }, 500);
  if (!entries?.length) return jsonResponse({ generated: 0, updated: 0, skipped: 0, letters: [] });

  const firstInputDate = dateKey(entries[0].created_at);
  const sendDates: string[] = [];
  for (let sendDate = addDays(firstInputDate, 7); sendDate <= today; sendDate = addDays(sendDate, 7)) {
    sendDates.push(sendDate);
  }
  if (!sendDates.length) return jsonResponse({ generated: 0, updated: 0, skipped: 0, letters: [] });

  const ids = sendDates.map((sendDate) => `letter-${sendDate}`);
  const { data: existingLetters, error: lettersError } = await serviceClient
    .from("letters")
    .select("id,delivered_at,prompt_version")
    .eq("user_id", userId)
    .in("id", ids);
  if (lettersError) return jsonResponse({ error: lettersError.message }, 500);

  const existingById = new Map<string, LetterRow>((existingLetters || []).map((letter) => [letter.id, letter as LetterRow]));
  const changed: string[] = [];
  let generated = 0;
  let updated = 0;
  let skipped = 0;
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";

  for (const sendDate of sendDates) {
    const id = `letter-${sendDate}`;
    const existing = existingById.get(id);
    if (existing?.prompt_version === promptVersion) {
      skipped += 1;
      continue;
    }

    const periodStart = addDays(sendDate, -7);
    const periodEnd = addDays(sendDate, -1);
    const periodEntries = (entries as EntryRow[]).filter((entry) => isDateBetween(dateKey(entry.created_at), periodStart, periodEnd));
    const usedAI = shouldUseOpenAI(periodEntries);
    const draft = await generateLetterWithOpenAI(periodEntries, periodStart, periodEnd, sendDate);

    const { data: period, error: periodError } = await serviceClient
      .from("letter_periods")
      .upsert({
        user_id: userId,
        input_start_date: periodStart,
        input_end_date: periodEnd,
        send_date: sendDate,
        status: "delivered"
      }, { onConflict: "user_id,send_date" })
      .select("id")
      .single();
    if (periodError) throw periodError;

    const { error: upsertError } = await serviceClient
      .from("letters")
      .upsert({
        id,
        user_id: userId,
        period_id: period.id,
        period_start: periodStart,
        period_end: periodEnd,
        delivered_at: sendDate,
        title: draft.title,
        body: draft.body,
        html: htmlFromBody(draft.body),
        summary_json: {
          keyword: draft.keyword,
          entry_count: periodEntries.length
        },
        themes: draft.themes,
        recommendations: draft.recommendations,
        model: periodEntries.length ? model : null,
        prompt_version: usedAI ? promptVersion : fallbackPromptVersion,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,id" });
    if (upsertError) throw upsertError;

    changed.push(id);
    if (existing) updated += 1;
    else generated += 1;
  }

    return jsonResponse({ generated, updated, skipped, letters: changed });
  } catch (error) {
    console.error("generate-letter failed", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "generate-letter failed"
    }, 500);
  }
});
