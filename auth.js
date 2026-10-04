function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  location.replace("login.html");
}

// Har fetch me token apne aap lag jayega, aur token expire/galat ho to logout
const _fetch = window.fetch.bind(window);
window.fetch = (url, opts = {}) => {
  const token = localStorage.getItem("token");
  if (!token) { logout(); return new Promise(() => {}); }
  opts.headers = { ...(opts.headers || {}), Authorization: "Bearer " + token };
  return _fetch(url, opts).then(res => {
    if (res.status === 401) { logout(); return new Promise(() => {}); }
    return res;
  });
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("userName").textContent = "👤 " + (localStorage.getItem("userName") || "");
  document.getElementById("logoutBtn").onclick = logout;
});
