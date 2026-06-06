import { Entry, Letter } from "../types/domain";

function dateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function getKeyword(entries: Entry[]) {
  const text = entries.map((entry) => entry.text).join(" ");
  if (/일|업무|회의|마감|회사/.test(text)) return "잘해내고 싶은 마음";
  if (/연애|좋아|답장|데이트|상대/.test(text)) return "관계 안에서 바라는 것";
  if (/친구|사람|관계|가족|대화/.test(text)) return "사람들 사이 내가 원하는 것";
  if (/몸|피곤|잠|아픔|컨디션/.test(text)) return "몸이 알려준 신호";
  if (/나|자존감|스스로|칭찬/.test(text)) return "나를 대하는 방식";
  return "그때의 마음";
}

function getTone(entries: Entry[]) {
  const average = entries.reduce((sum, entry) => sum + entry.energy, 0) / entries.length;
  if (average >= 4) return "에너지가 높게 기록됐어";
  if (average <= 2.5) return "에너지가 낮게 기록됐어";
  return "에너지가 오르내렸어";
}

function getEnergyRange(entries: Entry[]) {
  const high = [...entries].sort((a, b) => b.energy - a.energy)[0];
  const low = [...entries].sort((a, b) => a.energy - b.energy)[0];
  return {
    high: `${dateKey(high.createdAt)} · 에너지 ${high.energy}`,
    low: `${dateKey(low.createdAt)} · 에너지 ${low.energy}`
  };
}

export function buildWeeklyLetter(entries: Entry[], periodStart: Date, deliveredAt: Date, id = deliveredAt.toISOString()): Letter {
  const periodLabel = `${dateKey(periodStart)} ~ ${dateKey(new Date(deliveredAt.getTime() - 24 * 60 * 60 * 1000))}`;

  if (!entries.length) {
    return {
      id,
      title: "지난주에는 남겨진 기록이 없었어",
      body: "이번 편지에 담을 기록은 없었어.\n\n기록이 없는 주도 하나의 정보야. 다음 주에는 하루 중 한 번만이라도 생각이 강하게 움직인 순간을 남겨봐. 무엇을 반복해서 신경 쓰는지 보는 것이 이 앱의 첫 번째 목적이야.",
      periodLabel,
      deliveredAt: deliveredAt.toISOString(),
      keyword: "기록되지 않은 한 주"
    };
  }

  if (entries.length < 3) {
    const tone = getTone(entries);
    const scenes = entries
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((entry) => `${dateKey(entry.createdAt)} ${entry.text}`)
      .join("\n");
    return {
      id,
      title: `적은 기록 속에서도 ${getKeyword(entries)}이 보였어`,
      body: `기록은 많지 않았고, 에너지는 ${tone}.\n\n남겨진 장면은 이랬어.\n${scenes}\n\n아직 의미를 크게 단정하기엔 이르지만, 이 기록들은 네가 어떤 순간을 그냥 지나치지 않았는지 보여줘. 다음 주에는 비슷한 생각이 다시 나타나는지, 아니면 완전히 다른 주제가 올라오는지 살펴봐.`,
      periodLabel,
      deliveredAt: deliveredAt.toISOString(),
      keyword: getKeyword(entries)
    };
  }

  const range = getEnergyRange(entries);
  const keyword = getKeyword(entries);
  return {
    id,
    title: `${keyword}이 반복해서 드러난 한 주였어`,
    body: `이번 주 기록에서는 ${keyword}이 비교적 선명하게 보였어.\n\n에너지가 가장 높게 기록된 때는 ${range.high}, 가장 낮게 기록된 때는 ${range.low}였어. 좋고 나쁨을 판단하기보다, 어떤 생각과 상황이 에너지를 움직였는지 보는 게 중요해.\n\n다음 주에는 기록할 때 한 가지를 같이 봐봐. 지금 내가 원하는 것은 무엇인지, 그리고 그 욕구를 충족시키기 위해 실제로 한 행동은 무엇인지. 이 질문은 감정을 위로하기보다 감정이 가리키는 방향을 확인하는 데 도움이 될 거야.`,
    periodLabel,
    deliveredAt: deliveredAt.toISOString(),
    keyword
  };
}
