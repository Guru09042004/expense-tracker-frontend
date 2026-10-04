const BUDGET_API = "http://localhost:8080/api/budgets";
const bForm = document.getElementById("budgetForm");
let budgets = [];

async function loadBudgets() {
  try {
    const res = await fetch(BUDGET_API);
    budgets = await res.json();
    renderBudgets();
  } catch (err) {
    console.error("Budget load nahi hua", err);
  }
}

function level(pct) { return pct >= 100 ? "danger" : pct >= 80 ? "warn" : "ok"; }

function renderBudgets() {
  const month = monthFilter.value || today().slice(0, 7);
  document.getElementById("budgetMonth").textContent = "📅 " + month;

  // Is mahine ka kharcha (total + category-wise)
  const spent = {};
  let total = 0;
  allData.filter(e => e.type === "EXPENSE" && e.date.startsWith(month)).forEach(e => {
    const a = Number(e.amount);
    total += a;
    spent[e.category] = (spent[e.category] || 0) + a;
  });

  // Items: pehle Total, phir categories
  const items = budgets
    .map(b => ({
      key: b.category,
      label: b.category === "ALL" ? "🎯 Total Budget" : `${ICONS[b.category] || "📦"} ${b.category}`,
      budget: Number(b.amount),
      spent: b.category === "ALL" ? total : (spent[b.category] || 0)
    }))
    .sort((a, b) => (a.key === "ALL" ? -1 : b.key === "ALL" ? 1 : a.key.localeCompare(b.key)));

  const bars = document.getElementById("budgetBars");
  const alerts = document.getElementById("alerts");
  bars.innerHTML = "";
  alerts.innerHTML = "";
  document.getElementById("budgetEmpty").classList.toggle("hidden", items.length > 0);

  items.forEach(it => {
    const pct = Math.round((it.spent / it.budget) * 100);
    const lvl = level(pct);

    // Progress bar
    const row = document.createElement("div");
    row.className = "b-row";
    row.innerHTML = `
      <div class="b-head">
        <strong class="b-label"></strong>
        <span class="b-nums"></span>
        <button type="button" class="b-del" title="Budget hatao">✕</button>
      </div>
      <div class="b-track"><div class="b-fill ${lvl}"></div></div>
      <div class="b-pct ${lvl}"></div>`;
    row.querySelector(".b-label").textContent = it.label;
    row.querySelector(".b-nums").textContent = `${rupee(it.spent)} / ${rupee(it.budget)}`;
    row.querySelector(".b-fill").style.width = Math.min(pct, 100) + "%";
    row.querySelector(".b-pct").textContent = pct >= 100 ? `${pct}% (limit paar)` : `${pct}% use hua`;
    row.querySelector(".b-del").onclick = () => setBudget(it.key, 0);
    row.querySelector(".b-label").onclick = () => {          // click karo to form me bhar jaye
      document.getElementById("bCategory").value = it.key;
      document.getElementById("bAmount").value = it.budget;
    };
    bars.appendChild(row);

    // Alert banner
    if (lvl !== "ok") {
      const name = it.label.replace("🎯 ", "");
      const div = document.createElement("div");
      div.className = "alert " + lvl;
      div.textContent = lvl === "danger"
        ? `🚨 ${name}: budget paar ho gaya! ${rupee(it.spent)} / ${rupee(it.budget)} (${rupee(it.spent - it.budget)} zyada)`
        : `⚠️ ${name}: budget ka ${pct}% use ho gaya, ${rupee(it.budget - it.spent)} bacha hai`;
      alerts.appendChild(div);
    }
  });
}

async function setBudget(category, amount) {
  const res = await fetch(BUDGET_API, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, amount })
  });
  if (!res.ok) { alert("Budget save nahi hua"); return; }
  loadBudgets();
}

bForm.addEventListener("submit", async ev => {
  ev.preventDefault();
  await setBudget(document.getElementById("bCategory").value,
                  document.getElementById("bAmount").value);
  document.getElementById("bAmount").value = "";
});

// Category badalne par purana budget form me dikhao
document.getElementById("bCategory").addEventListener("change", e => {
  const b = budgets.find(x => x.category === e.target.value);
  document.getElementById("bAmount").value = b ? Number(b.amount) : "";
});

loadBudgets();
