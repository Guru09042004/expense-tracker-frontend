const API = "http://localhost:8080/api/expenses";

const form = document.getElementById("expenseForm");
const list = document.getElementById("list");
const empty = document.getElementById("empty");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formTitle = document.getElementById("formTitle");
const monthFilter = document.getElementById("monthFilter");

const ICONS = { Food: "🍔", Travel: "✈️", Shopping: "🛍️", Bills: "🧾",
                Health: "💊", Entertainment: "🎬", Salary: "💼", Other: "📦" };
const COLORS = { Food: "#f97316", Travel: "#3b82f6", Shopping: "#ec4899", Bills: "#8b5cf6",
                 Health: "#10b981", Entertainment: "#f59e0b", Salary: "#14b8a6", Other: "#6b7280" };

let allData = [];
let pieChart = null, barChart = null;

// Local date (UTC ki wajah se India me date galat na aaye)
const pad = n => String(n).padStart(2, "0");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const rupee = n => "₹" + Number(n).toLocaleString("en-IN");

document.getElementById("date").value = today();
monthFilter.value = today().slice(0, 7);   // default: current month

/* ---------- Data load ---------- */
async function loadExpenses() {
  try {
    const res = await fetch(API);
    allData = await res.json();
    allData.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    refresh();
  } catch (err) {
    alert("Backend se connect nahi ho paya. Spring Boot chal raha hai?");
    console.error(err);
  }
}

function refresh() {
  const m = monthFilter.value;                       // "2026-10" ya ""
  const filtered = m ? allData.filter(e => e.date.startsWith(m)) : allData;
  render(filtered);
  drawPie(filtered);
  drawBar(allData);
  if (window.renderBudgets) renderBudgets();
  if (window.renderInsights) renderInsights();
}

/* ---------- Table + summary ---------- */
function render(data) {
  list.innerHTML = "";
  let income = 0, expense = 0;

  data.forEach(e => {
    const amt = Number(e.amount);
    const isIncome = e.type === "INCOME";
    if (isIncome) income += amt; else expense += amt;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Date"></td>
      <td data-label="Title"></td>
      <td data-label="Category"><span class="badge cat"></span></td>
      <td data-label="Type"><span class="badge ${isIncome ? "t-income" : "t-expense"}">${isIncome ? "Income" : "Expense"}</span></td>
      <td data-label="Amount" class="${isIncome ? "amt-income" : "amt-expense"}">${isIncome ? "+" : "-"}${rupee(amt)}</td>
      <td data-label="Action">
        <button class="edit-btn">✏️ Edit</button>
        <button class="del-btn">🗑️ Delete</button>
      </td>`;
    tr.children[0].textContent = e.date;
    tr.children[1].textContent = e.title;
    tr.querySelector(".cat").textContent = `${ICONS[e.category] || "📦"} ${e.category}`;
    tr.querySelector(".edit-btn").onclick = () => startEdit(e);
    tr.querySelector(".del-btn").onclick = () => removeExpense(e.id);
    list.appendChild(tr);
  });

  empty.classList.toggle("hidden", data.length > 0);
  document.getElementById("totalIncome").textContent = rupee(income);
  document.getElementById("totalExpense").textContent = rupee(expense);
  document.getElementById("balance").textContent = rupee(income - expense);
}

/* ---------- Pie chart: category-wise expense ---------- */
function drawPie(data) {
  const totals = {};
  data.filter(e => e.type === "EXPENSE").forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + Number(e.amount);
  });
  const labels = Object.keys(totals);
  const values = Object.values(totals);

  if (pieChart) pieChart.destroy();
  document.getElementById("pieEmpty").classList.toggle("hidden", labels.length > 0);
  document.getElementById("pieChart").style.display = labels.length ? "block" : "none";
  if (!labels.length) return;

  pieChart = new Chart(document.getElementById("pieChart"), {
    type: "doughnut",
    data: {
      labels: labels.map(l => `${ICONS[l] || "📦"} ${l}`),
      datasets: [{ data: values, backgroundColor: labels.map(l => COLORS[l] || "#6b7280"),
                   borderWidth: 3, borderColor: "#fff" }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "55%",
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${rupee(c.parsed)}` } }
      }
    }
  });
}

/* ---------- Bar chart: last 6 months income vs expense ---------- */
function drawBar(data) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      label: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }),
      income: 0, expense: 0
    });
  }
  data.forEach(e => {
    const m = months.find(x => e.date.startsWith(x.key));
    if (!m) return;
    if (e.type === "INCOME") m.income += Number(e.amount); else m.expense += Number(e.amount);
  });

  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: months.map(m => m.label),
      datasets: [
        { label: "Income", data: months.map(m => m.income), backgroundColor: "#10b981", borderRadius: 8 },
        { label: "Expense", data: months.map(m => m.expense), backgroundColor: "#ef4444", borderRadius: 8 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { callback: v => "₹" + v } } },
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${rupee(c.parsed.y)}` } }
      }
    }
  });
}

/* ---------- Filter ---------- */
monthFilter.addEventListener("change", refresh);
document.getElementById("allBtn").onclick = () => { monthFilter.value = ""; refresh(); };

/* ---------- Add / Update ---------- */
form.addEventListener("submit", async ev => {
  ev.preventDefault();
  const id = document.getElementById("editId").value;
  const body = {
    title: document.getElementById("title").value.trim(),
    amount: document.getElementById("amount").value,
    category: document.getElementById("category").value,
    type: document.getElementById("type").value,
    date: document.getElementById("date").value
  };

  await fetch(id ? `${API}/${id}` : API, {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  // Agar naya entry kisi aur mahine ka hai, to filter wahi mahina kar do
  if (monthFilter.value && !body.date.startsWith(monthFilter.value)) {
    monthFilter.value = body.date.slice(0, 7);
  }
  resetForm();
  loadExpenses();
});

function startEdit(e) {
  document.getElementById("editId").value = e.id;
  document.getElementById("title").value = e.title;
  document.getElementById("amount").value = e.amount;
  document.getElementById("category").value = e.category;
  document.getElementById("type").value = e.type;
  document.getElementById("date").value = e.date;
  submitBtn.textContent = "Update";
  formTitle.textContent = "✏️ Entry Edit Karo";
  cancelBtn.classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function removeExpense(id) {
  if (!confirm("Delete karna hai?")) return;
  await fetch(`${API}/${id}`, { method: "DELETE" });
  loadExpenses();
}

function resetForm() {
  form.reset();
  document.getElementById("editId").value = "";
  document.getElementById("date").value = today();
  submitBtn.textContent = "Add";
  formTitle.textContent = "➕ Nayi Entry";
  cancelBtn.classList.add("hidden");
}

cancelBtn.onclick = resetForm;
loadExpenses();
