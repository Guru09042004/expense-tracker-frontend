const BASE = "http://localhost:8080/api/auth";

if (localStorage.getItem("token")) location.replace("index.html");

const nameInput = document.getElementById("name");
const msg = document.getElementById("msg");
const authBtn = document.getElementById("authBtn");
let mode = "login";

function setMode(m) {
  mode = m;
  const isSignup = m === "signup";
  nameInput.classList.toggle("hidden", !isSignup);
  nameInput.required = isSignup;
  authBtn.textContent = isSignup ? "Account Banao" : "Login";
  document.getElementById("tabLogin").classList.toggle("active", !isSignup);
  document.getElementById("tabSignup").classList.toggle("active", isSignup);
  msg.textContent = "";
}

document.getElementById("tabLogin").onclick = () => setMode("login");
document.getElementById("tabSignup").onclick = () => setMode("signup");

document.getElementById("authForm").addEventListener("submit", async ev => {
  ev.preventDefault();
  msg.textContent = "";
  authBtn.disabled = true;

  const body = { email: document.getElementById("email").value.trim(),
                 password: document.getElementById("password").value };
  if (mode === "signup") body.name = nameInput.value.trim();

  try {
    const res = await fetch(`${BASE}/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userName", data.name);
      location.replace("index.html");
    } else if (res.status === 400) {
      msg.textContent = "Details sahi nahi hain (email check karo, password min 6 characters)";
    } else {
      msg.textContent = data.message || "Kuch gadbad ho gayi";
    }
  } catch (err) {
    msg.textContent = "Server se connect nahi ho paya. Spring Boot chal raha hai?";
  } finally {
    authBtn.disabled = false;
  }
});
