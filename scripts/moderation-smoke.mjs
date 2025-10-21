import { moderation } from "../utils/ai.js";

async function run(text) {
  const res = await moderation.moderateContent({ text, imageKeys: [] });
  return res;
}

(async () => {
  const samples = [
    "hiếp dâm là tội ác",
    "đánh nhau trong game cho vui thôi",
    "mình buồn quá, muốn chết",
    "nội dung gợi dục 18+ khoe thân",
    "kỳ thị chủng tộc là điều xấu",
    "hôm nay ăn cơm với gà luộc" // safe
  ];
  for (const s of samples) {
    const out = await run(s);
    console.log("----\nTEXT:", s);
    console.log("RESULT:", out);
  }
})();
