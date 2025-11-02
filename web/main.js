/**
 * 💬 Codr Web Chat Logic + Deploy Trigger
 * Simple in-browser prototype for chatting your workflow idea
 * and deploying to Cloudflare via the “Deploy to Cloudflare” CTA.
 */

const chatbox = document.getElementById("chatbox");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const deployBtn = document.getElementById("deployBtn");

// Helper to add messages
function addMessage(text, sender = "bot") {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.textContent = text;
  chatbox.appendChild(msg);
  chatbox.scrollTop = chatbox.scrollHeight;
}

// Handle user input
sendBtn.addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, "user");
  input.value = "";

  // Send to Codr backend (replace with your own Worker endpoint if remote)
  const res = await fetch("/api/hello");
  const data = await res.json();
  addMessage(data.message || "Got it! Now tell me the next step...");
});

// “Deploy to Cloudflare” CTA
deployBtn.addEventListener("click", () => {
  // 🔗 Prepopulated deploy URL that opens Cloudflare Pages Worker setup
  const repoUrl = encodeURIComponent(window.location.origin);
  const cfUrl = `https://dash.cloudflare.com/?to=/:account/workers/new?repo=${repoUrl}`;
  window.open(cfUrl, "_blank");
});

// Allow Enter to send
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});
