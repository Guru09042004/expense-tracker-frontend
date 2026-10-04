/* =========================================================
   1. AUTO-CATEGORY
   ========================================================= */
const KEYWORDS = {
  Food: ["zomato","swiggy","restaurant","cafe","pizza","dominos","burger","mcdonalds","kfc","starbucks",
         "chai","coffee","samosa","biryani","thali","khana","lunch","dinner","breakfast","snacks","maggi",
         "grocery","blinkit","zepto","bigbasket","instamart","sabzi","dudh","milk","kirana","fruits","bakery","icecream"],
  Travel: ["uber","ola","rapido","petrol","diesel","fuel","metro","bus","train","irctc","flight","indigo",
           "airindia","redbus","cab","taxi","auto","toll","parking","fastag","ticket","makemytrip"],
  Shopping: ["amazon","flipkart","myntra","ajio","meesho","nykaa","mall","shirt","jeans","shoes","dress",
             "clothes","kapde","watch","bag","shopping","decathlon"],
  Bills: ["electricity","bijli","wifi","broadband","jio","airtel","vi","recharge","rent","kiraya","water",
          "gas","cylinder","bill","emi","insurance","loan","fees","tuition","maintenance"],
  Health: ["medicine","dawai","davai","pharmacy","medical","doctor","hospital","apollo","clinic","gym",
           "dentist","lab","test","checkup","vitamins"],
  Entertainment: ["netflix","hotstar","prime","spotify","youtube","movie","cinema","bookmyshow","pvr","inox",
                  "game","gaming","steam","concert","party","outing"],
  Salary: ["salary","stipend","bonus","payout","freelance","interest","dividend","cashback","refund"]
};
const INCOME_CATS = ["Salary"];

const titleInput = document.getElementById("title");
const catSelect = document.getElementById("category");
const typeSelect = document.getElementById("type");
let catTouched = false, typeTouched = false;

catSelect.addEventListener("change", () => { catTouched = true; });
typeSelect.addEventListener("change", () => { typeTouched = true; });
form.addEventListener("reset", () => { catTouched = false; typeTouched = false; });

function guessCategory(title) {
  const t = title.trim().toLowerCase();
  if (t.length < 2) return null;

  // 1) Pehle isi naam ki purani entry dekho (user ki apni aadat)
  const past = allData.find(e => e.title.trim().toLowerCase() === t);
  if (past) return { category: past.category, type: past.type };

  // 2) Keywords se
  const tokens = t.split(/[^a-z0-9]+/).filter(Boolean);
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    const hit = tokens.some(tok => words.some(w => tok === w || (w.length >= 5 && tok.startsWith(w))));
    if (hit) return { category: cat, type: INCOME_CATS.includes(cat) ? "INCOME" : "EXPENSE" };
  }
  return null;
}

titleInput.addEventListener("input", () => {
  if (catTouched || document.getElementById("editId").value) return;   // user ne khud chuna ho ya edit mode ho
  const g = guessCategory(titleInput.value);
  if (!g) return;
  catSelect.value = g.category;
  if (!typeTouched) typeSelect.value = g.type;
  catSelect.classList.remove("flash");
  void catSelect.offsetWidth;                 // animation dobara chalane ke liye
  catSelect.classList.add("flash");
});

/* =========================================================
   2. INSIGHTS
   ========================================================= */
function renderInsights() {
  const month = monthFilter.value || today().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const pd = new Date(y, m - 2, 1);
  const prevKey = `${pd.getFullYear()}-${pad(pd.getMonth() + 1)}`;

  const cur = allData.filter(e => e.date.startsWith(month));
  const prev = allData.filter(e => e.date.startsWith(prevKey));
  const sum = (l, type) => l.filter(e => e.type === type).reduce((s, e) => s + Number(e.amount), 0);
  const byCat = l => {
    const o = {};
    l.filter(e => e.type === "EXPENSE").forEach(e => { o[e.category] = (o[e.category] || 0) + Number(e.amount); });
    return o;
  };

  const curExp = sum(cur, "EXPENSE"), prevExp = sum(prev, "EXPENSE"), curInc = sum(cur, "INCOME");
  const curCat = byCat(cur), prevCat = byCat(prev);
  const items = [];   // { tone: good | bad | info, text }

  document.getElementById("insightMonth").textContent = "📅 " + month;

  if (curExp > 0) {
    // Pichle mahine se comparison
    if (prevExp > 0) {
      const pct = Math.round(((curExp - prevExp) / prevExp) * 100);
      if (pct > 0) items.push({ tone: "bad", text: `📈 Kharcha pichle mahine se ${pct}% zyada hai (${rupee(curExp)} vs ${rupee(prevExp)})` });
      else if (pct < 0) items.push({ tone: "good", text: `📉 Shabash! Kharcha pichle mahine se ${Math.abs(pct)}% kam hai (${rupee(curExp)} vs ${rupee(prevExp)})` });
      else items.push({ tone: "info", text: `⚖️ Kharcha pichle mahine jitna hi hai (${rupee(curExp)})` });
    }

    // Sabse bada kharcha
    const top = Object.entries(curCat).sort((a, b) => b[1] - a[1])[0];
    items.push({ tone: "info", text: `🏆 Sabse zyada kharcha ${ICONS[top[0]] || "📦"} ${top[0]} pe hua: ${rupee(top[1])} (${Math.round(top[1] / curExp * 100)}% of total)` });

    // Kis category me sabse zyada badhotri
    let rise = null;
    for (const [cat, c] of Object.entries(curCat)) {
      const p = prevCat[cat] || 0;
      if (p > 0 && c > p) {
        const pct = Math.round(((c - p) / p) * 100);
        if (pct >= 20 && (!rise || c - p > rise.diff)) rise = { cat, pct, diff: c - p };
      }
    }
    if (rise) items.push({ tone: "bad", text: `🔺 ${ICONS[rise.cat] || "📦"} ${rise.cat} pe pichle mahine se ${rise.pct}% zyada kharcha hua (+${rupee(rise.diff)})` });

    // Roz ka average + month-end prediction
    const isCurrentMonth = month === today().slice(0, 7);
    const daysInMonth = new Date(y, m, 0).getDate();
    const daysPassed = isCurrentMonth ? new Date().getDate() : daysInMonth;
    items.push({ tone: "info", text: `📆 Roz ka average kharcha: ${rupee(Math.round(curExp / daysPassed))}` });

    if (isCurrentMonth && daysPassed < daysInMonth) {
      const proj = Math.round(curExp / daysPassed * daysInMonth);
      const total = (typeof budgets !== "undefined") ? budgets.find(b => b.category === "ALL") : null;
      const over = total && proj > Number(total.amount);
      items.push({
        tone: over ? "bad" : "info",
        text: `🔮 Isi raftaar se mahine ke end tak lagbhag ${rupee(proj)} kharcha hoga` +
              (over ? ` (budget ${rupee(Number(total.amount))} se zyada!)` : "")
      });
    }
  }

  // Savings
  if (curInc > 0) {
    const rate = Math.round(((curInc - curExp) / curInc) * 100);
    if (rate >= 0) items.push({ tone: rate >= 20 ? "good" : "info", text: `💰 Is mahine aapne income ka ${rate}% bachaya (${rupee(curInc - curExp)})` });
    else items.push({ tone: "bad", text: `⚠️ Kharcha income se ${rupee(curExp - curInc)} zyada hai` });
  }

  const box = document.getElementById("insightList");
  box.innerHTML = "";
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Is mahine ka data aate hi yahan insights dikhenge 📊";
    box.appendChild(p);
    return;
  }
  items.forEach(it => {
    const d = document.createElement("div");
    d.className = "insight " + it.tone;
    d.textContent = it.text;
    box.appendChild(d);
  });
}

/* =========================================================
   3. CSV EXPORT
   ========================================================= */
function exportCSV() {
  const month = monthFilter.value;
  const data = month ? allData.filter(e => e.date.startsWith(month)) : allData;
  if (!data.length) { alert("Is period me export karne ke liye koi entry nahi hai."); return; }

  // Excel me "=...", "+..." wale text formula na ban jaye, isliye aage ' laga dete hain
  const q = s => '"' + String(s ?? "").replace(/"/g, '""') + '"';
  const guard = s => /^[=+\-@\t\r]/.test(String(s)) ? "'" + s : s;

  const rows = [["Date", "Title", "Category", "Type", "Amount"].map(q).join(",")];
  data.forEach(e => rows.push([q(e.date), q(guard(e.title)), q(e.category), q(e.type), Number(e.amount)].join(",")));

  const blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses-${month || "all"}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
document.getElementById("csvBtn").onclick = exportCSV;
