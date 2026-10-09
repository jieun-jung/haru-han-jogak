const STORAGE_KEY = "haru-han-jogak.entries.v1";
const TYPES = {
  line: { label: "한 줄 기록", icon: "✎", subtitle: "오늘 기억하고 싶은 순간을 한 줄로" },
  prompt: { label: "오늘의 질문", icon: "？", subtitle: "질문 하나에 천천히 답해보기" },
  mood: { label: "기분 기록", icon: "☼", subtitle: "오늘의 기분과 그 이유를 남기기" },
};
const MOODS = [
  { emoji: "😊", label: "좋아요" }, { emoji: "🙂", label: "괜찮아요" },
  { emoji: "😌", label: "평온해요" }, { emoji: "😔", label: "조금 지쳐요" }, { emoji: "🥰", label: "설레요" },
];
const PROMPTS = ["오늘 나를 웃게 한 작은 일은 무엇인가요?", "오늘 고마웠던 순간을 하나 떠올려볼까요?", "오늘 가장 마음이 편안했던 순간은 언제였나요?", "오늘의 나에게 한마디를 건넨다면?", "오늘 새롭게 발견한 것은 무엇인가요?"];
const todayKey = localDateKey(new Date());
let entries = readEntries();
let activeView = "today";
let selectedType = "line";
let selectedMood = "";
let selectedDate = todayKey;
let calendarDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let toastTimer;

function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function readEntries() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch { return {}; }
}
function saveEntries() { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
function formatDate(key, options = { year: "numeric", month: "long", day: "numeric", weekday: "long" }) {
  return new Intl.DateTimeFormat("ko-KR", options).format(new Date(`${key}T12:00:00`));
}
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function setView(view) {
  activeView = view;
  document.querySelectorAll(".view").forEach(node => node.classList.toggle("active", node.id === `${view}-view`));
  document.querySelectorAll(".nav-item").forEach(node => node.classList.toggle("active", node.dataset.view === view));
  if (view === "calendar") renderCalendar();
  if (view === "journal") renderJournal();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function entryText(entry) { return entry.type === "mood" ? entry.text : entry.text; }
function renderToday() {
  document.getElementById("today-date").textContent = formatDate(todayKey).toUpperCase();
  const target = document.getElementById("today-content");
  const entry = entries[todayKey];
  if (entry) {
    const type = TYPES[entry.type] || TYPES.line;
    target.innerHTML = `<article class="existing-entry"><div class="entry-meta"><span class="type-pill">${type.icon} &nbsp;${type.label}</span><span class="entry-date">오늘 기록했어요</span></div><div class="entry-body">${entry.type === "mood" ? `<span class="entry-mood">${escapeHTML(entry.mood || "🙂")}</span>` : ""}${escapeHTML(entryText(entry))}</div><div class="entry-footer"><button class="small-button" data-edit="${todayKey}">수정하기</button><button class="small-button" data-delete="${todayKey}">삭제</button></div></article>`;
  } else {
    target.innerHTML = `<div class="entry-panel"><div class="panel-heading"><h2>어떤 조각을 담아볼까요?</h2><span>하루에 하나</span></div><div class="choice-grid">${Object.entries(TYPES).map(([key, type]) => `<button class="choice-card" data-type="${key}"><span class="choice-icon">${type.icon}</span><strong>${type.label}</strong><small>${type.subtitle}</small><span class="choice-arrow">↗</span></button>`).join("")}</div></div>`;
  }
}
function openEntry(type, dateKey = todayKey) {
  selectedType = type;
  selectedDate = dateKey;
  selectedMood = entries[dateKey]?.type === "mood" ? entries[dateKey].mood : "";
  const existing = entries[dateKey];
  const typeInfo = TYPES[type];
  document.getElementById("form-date").textContent = formatDate(dateKey);
  document.getElementById("form-title").textContent = existing ? "오늘의 조각 다듬기" : `${typeInfo.label} 남기기`;
  const fields = document.getElementById("form-fields");
  if (type === "prompt") {
    const prompt = existing?.prompt || PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    fields.dataset.prompt = prompt;
    fields.innerHTML = `<div class="prompt-card"><span>TODAY'S QUESTION</span>${escapeHTML(prompt)}</div><label class="field-label" for="entry-text">나의 답변</label><textarea class="entry-textarea" id="entry-text" maxlength="500" placeholder="떠오르는 대로 편하게 적어보세요.">${escapeHTML(existing?.text || "")}</textarea><div class="form-hint">최대 500자</div>`;
  } else if (type === "mood") {
    fields.dataset.prompt = "";
    fields.innerHTML = `<label class="field-label">오늘의 기분을 골라주세요</label><div class="mood-options">${MOODS.map(mood => `<button type="button" class="mood-option${selectedMood === mood.emoji ? " selected" : ""}" data-mood="${mood.emoji}" aria-label="${mood.label}" title="${mood.label}">${mood.emoji}</button>`).join("")}</div><label class="field-label" for="entry-text">이유나 기억하고 싶은 순간 <span style="font-weight:400;color:#aaa">(선택)</span></label><textarea class="entry-textarea" id="entry-text" maxlength="500" placeholder="왜 이런 기분이 들었는지 적어봐요.">${escapeHTML(existing?.text || "")}</textarea>`;
  } else {
    fields.dataset.prompt = "";
    fields.innerHTML = `<label class="field-label" for="entry-text">오늘 기억하고 싶은 순간</label><textarea class="entry-textarea" id="entry-text" maxlength="500" placeholder="예: 창문으로 들어온 햇살이 참 좋았다.">${escapeHTML(existing?.text || "")}</textarea><div class="form-hint">최대 500자</div>`;
  }
  document.getElementById("entry-dialog").showModal();
  setTimeout(() => document.getElementById("entry-text")?.focus(), 80);
}
function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  document.getElementById("calendar-month").textContent = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(calendarDate);
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(`<button class="day-cell" disabled aria-hidden="true"></button>`);
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const key = localDateKey(new Date(year, month, day));
    const hasEntry = Boolean(entries[key]);
    if (hasEntry) count++;
    const todayClass = key === todayKey ? " today" : "";
    const selectedClass = key === selectedDate ? " selected" : "";
    cells.push(`<button class="day-cell${todayClass}${selectedClass}" data-day="${key}" aria-label="${formatDate(key)}${hasEntry ? ", 기록 있음" : ""}"><span class="day-number">${day}</span>${hasEntry ? `<i class="day-dot"></i>` : ""}</button>`);
  }
  document.getElementById("calendar-days").innerHTML = cells.join("");
  document.getElementById("month-count").textContent = `이번 달 ${count}개의 조각`;
  renderSelectedDay();
}
function renderSelectedDay() {
  const entry = entries[selectedDate];
  const card = document.getElementById("selected-day-card");
  if (!entry) {
    card.innerHTML = `<div class="day-empty">${formatDate(selectedDate)}에는 아직 기록이 없어요.</div>`;
    return;
  }
  const type = TYPES[entry.type] || TYPES.line;
  card.innerHTML = `<div class="day-preview"><div class="day-preview-heading"><span>${formatDate(selectedDate)} · ${type.icon} ${type.label}</span>${selectedDate === todayKey ? `<button class="small-button" data-edit="${selectedDate}">수정</button>` : ""}</div><p>${entry.type === "mood" ? `${escapeHTML(entry.mood || "🙂")} &nbsp;` : ""}${escapeHTML(entryText(entry))}</p></div>`;
}
function renderJournal() {
  const filter = document.getElementById("journal-filter").value;
  const all = Object.entries(entries).sort(([a], [b]) => b.localeCompare(a)).filter(([, entry]) => filter === "all" || entry.type === filter);
  document.getElementById("journal-count").textContent = `총 ${all.length}개의 조각`;
  const target = document.getElementById("journal-list");
  if (!all.length) {
    target.innerHTML = `<div class="empty-state"><div class="empty-illustration">✿</div><h3>${filter === "all" ? "아직 모인 조각이 없어요" : "이 종류의 기록이 없어요"}</h3><p>오늘의 순간부터 하나씩 모아볼까요?</p></div>`;
    return;
  }
  target.innerHTML = `<div class="journal-list">${all.map(([key, entry]) => {
    const date = new Date(`${key}T12:00:00`);
    const type = TYPES[entry.type] || TYPES.line;
    return `<article class="journal-item" data-open-day="${key}"><div class="journal-date-block"><b>${date.getDate()}</b><small>${new Intl.DateTimeFormat("ko-KR", { month: "short" }).format(date)}</small></div><div class="journal-text"><div class="journal-text-head"><strong>${type.icon} ${type.label}</strong><span>${formatDate(key, { weekday: "long" })}</span></div><p>${entry.type === "mood" ? `${escapeHTML(entry.mood || "🙂")} &nbsp;` : ""}${escapeHTML(entryText(entry))}</p></div></article>`;
  }).join("")}</div>`;
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}
function refresh() { renderToday(); if (activeView === "calendar") renderCalendar(); if (activeView === "journal") renderJournal(); }

document.getElementById("today-date").textContent = formatDate(todayKey).toUpperCase();
renderToday();
document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
document.addEventListener("click", event => {
  const typeButton = event.target.closest("[data-type]");
  if (typeButton) openEntry(typeButton.dataset.type);
  const editButton = event.target.closest("[data-edit]");
  if (editButton) openEntry(entries[editButton.dataset.edit]?.type || "line", editButton.dataset.edit);
  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton && confirm("오늘 기록을 삭제할까요?")) {
    delete entries[deleteButton.dataset.delete]; saveEntries(); refresh(); showToast("기록을 삭제했어요.");
  }
  const moodButton = event.target.closest("[data-mood]");
  if (moodButton) {
    selectedMood = moodButton.dataset.mood;
    document.querySelectorAll(".mood-option").forEach(button => button.classList.toggle("selected", button === moodButton));
  }
  const dayButton = event.target.closest("[data-day]");
  if (dayButton) { selectedDate = dayButton.dataset.day; renderCalendar(); }
  const journalItem = event.target.closest("[data-open-day]");
  if (journalItem) {
    selectedDate = journalItem.dataset.openDay;
    calendarDate = new Date(`${selectedDate}T12:00:00`);
    setView("calendar");
  }
});
document.getElementById("entry-form").addEventListener("submit", event => {
  event.preventDefault();
  const text = document.getElementById("entry-text").value.trim();
  if (!text && selectedType !== "mood") { document.getElementById("entry-text").focus(); return; }
  if (selectedType === "mood" && !selectedMood) { showToast("오늘의 기분을 먼저 골라주세요."); return; }
  entries[selectedDate] = { type: selectedType, text, mood: selectedType === "mood" ? selectedMood : "", prompt: selectedType === "prompt" ? document.getElementById("form-fields").dataset.prompt : "", updatedAt: new Date().toISOString() };
  saveEntries();
  document.getElementById("entry-dialog").close();
  refresh();
  showToast("오늘의 조각을 저장했어요.");
});
document.getElementById("close-dialog").addEventListener("click", () => document.getElementById("entry-dialog").close());
document.getElementById("cancel-entry").addEventListener("click", () => document.getElementById("entry-dialog").close());
document.getElementById("prev-month").addEventListener("click", () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
document.getElementById("next-month").addEventListener("click", () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });
document.getElementById("journal-filter").addEventListener("change", renderJournal);
