const letters = ["A", "B", "C", "D", "E"];
const sampleNames = ["Ana Beatriz", "Bruno Lima", "Carla Souza", "Diego Alves", "Elisa Martins", "Felipe Rocha"];

const state = {
  answerKey: [],
  files: [],
  results: [],
  reviews: [],
  students: [],
  cameraStream: null,
  capturedScans: 0
};

const els = {
  answerGrid: document.querySelector("#answerGrid"),
  answerCountLabel: document.querySelector("#answerCountLabel"),
  questionCount: document.querySelector("#questionCount"),
  maxGrade: document.querySelector("#maxGrade"),
  rosterFile: document.querySelector("#rosterFile"),
  rosterStatus: document.querySelector("#rosterStatus"),
  studentList: document.querySelector("#studentList"),
  scanFiles: document.querySelector("#scanFiles"),
  cameraPreview: document.querySelector("#cameraPreview"),
  captureCanvas: document.querySelector("#captureCanvas"),
  cameraPlaceholder: document.querySelector("#cameraPlaceholder"),
  cameraHelp: document.querySelector("#cameraHelp"),
  fileList: document.querySelector("#fileList"),
  uploadStatus: document.querySelector("#uploadStatus"),
  resultsBody: document.querySelector("#resultsBody"),
  emptyResults: document.querySelector("#emptyResults"),
  resultsWrap: document.querySelector("#resultsWrap"),
  reviewList: document.querySelector("#reviewList"),
  reviewStatus: document.querySelector("#reviewStatus"),
  questionBars: document.querySelector("#questionBars"),
  metricScans: document.querySelector("#metricScans"),
  metricAverage: document.querySelector("#metricAverage"),
  metricCritical: document.querySelector("#metricCritical"),
  metricReview: document.querySelector("#metricReview")
};

function initAnswerKey() {
  const count = Number(els.questionCount.value);
  state.answerKey = Array.from({ length: count }, (_, index) => state.answerKey[index] || letters[index % letters.length]);
  renderAnswerGrid();
  renderQuestionBars();
}

function renderAnswerGrid() {
  els.answerGrid.innerHTML = "";
  els.answerCountLabel.textContent = `${state.answerKey.length} questoes`;
  state.answerKey.forEach((answer, index) => {
    const row = document.createElement("div");
    row.className = "answer-row";
    row.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span>`;
    letters.forEach((letter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `answer-option ${answer === letter ? "selected" : ""}`;
      button.textContent = letter;
      button.addEventListener("click", () => {
        state.answerKey[index] = letter;
        renderAnswerGrid();
      });
      row.append(button);
    });
    els.answerGrid.append(row);
  });
}

async function importRoster(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const ext = file.name.split(".").pop().toLowerCase();
    const rows = ext === "xlsx" ? await readXlsxRows(file) : parseCsv(await file.text());
    state.students = normalizeStudents(rows);
    renderStudents();
    renderFiles();
    generateAnswerSheets();
    document.querySelector("#cartoes").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    els.studentList.innerHTML = `<div class="empty-state compact"><strong>Nao consegui ler a planilha</strong><span>Confira se ela tem colunas de nome e codigo, ou tente exportar como CSV.</span></div>`;
    els.rosterStatus.textContent = "Erro na leitura";
  }
}

function normalizeStudents(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  const nameIndex = findHeaderIndex(headers, ["nome", "aluno", "estudante", "name"]);
  const codeIndex = findHeaderIndex(headers, ["codigo", "cod", "matricula", "id", "numero"]);
  return rows.slice(1).map((row, index) => ({
    name: cleanCell(row[nameIndex]) || cleanCell(row[0]) || `Aluno ${index + 1}`,
    code: cleanCode(row[codeIndex]) || cleanCode(row[1]) || String(index + 1).padStart(3, "0")
  })).filter((student) => student.name || student.code);
}

function renderStudents() {
  els.studentList.innerHTML = "";
  els.rosterStatus.textContent = state.students.length ? `${state.students.length} aluno(s)` : "Lista vazia";
  if (!state.students.length) {
    els.studentList.innerHTML = `<div class="empty-state compact"><strong>Nenhum aluno importado</strong><span>Sem lista, o prototipo usa nomes de exemplo.</span></div>`;
    return;
  }
  state.students.forEach((student) => {
    const item = document.createElement("div");
    item.className = "student-item";
    item.innerHTML = `<div><strong>${escapeHtml(student.name)}</strong><small>Codigo do aluno</small></div><span class="student-code">${escapeHtml(student.code)}</span>`;
    els.studentList.append(item);
  });
}

function generateAnswerSheets() {
  const students = state.students.length ? state.students : sampleNames.slice(0, 4).map((name, index) => ({ name, code: `2026${String(index + 1).padStart(3, "0")}` }));
  const examName = document.querySelector("#examName").value || "Prova";
  const className = document.querySelector("#className").value || "Turma";
  const cardsPreview = document.querySelector("#cardsPreview");
  cardsPreview.innerHTML = "";
  students.forEach((student) => {
    const sheet = document.createElement("article");
    sheet.className = "answer-sheet";
    sheet.innerHTML = `
      <span class="corner-mark top-left"></span><span class="corner-mark top-right"></span><span class="corner-mark bottom-left"></span><span class="corner-mark bottom-right"></span>
      <header class="sheet-header">
        <div>
          <div class="sheet-brand"><img src="logo-sesi.png" alt="SESI Escola de Referencia"><span>Cartao-resposta</span></div>
          <div class="sheet-fields">
            <div><strong>Prova</strong>${escapeHtml(examName)}</div><div><strong>Turma</strong>${escapeHtml(className)}</div>
            <div><strong>Aluno</strong>${escapeHtml(student.name)}</div><div><strong>Codigo</strong>${escapeHtml(student.code)}</div>
          </div>
        </div>
        <div class="visual-code"><div class="barcode">${renderBarcode(student.code)}</div><small>CP-${escapeHtml(cleanCode(student.code))}</small></div>
      </header>
      <p class="sheet-instructions">Preencha completamente apenas uma alternativa por questao. Mantenha os quatro marcadores visiveis.</p>
      <div class="sheet-bubbles">${renderBubbleRows()}</div>`;
    cardsPreview.append(sheet);
  });
}

function renderBubbleRows() {
  return state.answerKey.map((_, index) => `<div class="bubble-row"><strong>${String(index + 1).padStart(2, "0")}</strong>${letters.map((letter) => `<span class="bubble">${letter}</span>`).join("")}</div>`).join("");
}

function renderBarcode(value) {
  return stringToBits(`CP-${cleanCode(value)}`).map((bit, index) => `<span style="width:${bit === "1" ? 4 : 2}px;opacity:${bit === "1" ? 1 : 0.18}" title="bit ${index}"></span>`).join("");
}

function stringToBits(value) {
  return String(value).split("").map((char) => char.charCodeAt(0).toString(2).padStart(8, "0")).join("").slice(0, 80);
}

function printAnswerSheets() {
  if (!document.querySelector(".answer-sheet")) generateAnswerSheets();
  window.print();
}

function renderFiles() {
  els.fileList.innerHTML = "";
  els.metricScans.textContent = state.files.length;
  els.uploadStatus.textContent = state.files.length ? `${state.files.length} arquivo(s)` : "Aguardando arquivos";
  state.files.forEach((file, index) => {
    const student = findStudentForFile(file, index);
    const source = file.source === "camera" ? "capturado pela camera" : `aluno ${index + 1}`;
    const item = document.createElement("div");
    item.className = "file-item";
    item.innerHTML = `<div><strong>${escapeHtml(file.name)}</strong><small>${formatBytes(file.size)} - ${student ? `${escapeHtml(student.name)} (${escapeHtml(student.code)})` : source}</small></div><span class="status-pill">Pronto</span>`;
    els.fileList.append(item);
  });
}

function runCorrection() {
  const files = state.files.length ? state.files : createDemoFiles();
  state.files = files;
  state.results = files.map((file, index) => {
    const student = findStudentForFile(file, index);
    const answers = simulateAnswers(index);
    const hits = answers.filter((answer, q) => answer === state.answerKey[q]).length;
    const errors = state.answerKey.length - hits;
    return { student: student ? student.name : sampleNames[index % sampleNames.length], code: student ? student.code : "", fileName: file.name, answers, hits, errors, grade: (hits / state.answerKey.length) * Number(els.maxGrade.value), confidence: 72 + ((index * 13) % 27) };
  });
  state.reviews = buildReviews(state.results);
  renderFiles();
  renderResults();
  renderReviews();
  renderQuestionBars();
  updateMetrics();
}

function renderResults() {
  els.resultsBody.innerHTML = "";
  els.emptyResults.classList.add("hidden");
  els.resultsWrap.classList.remove("hidden");
  state.results.forEach((result) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td><strong>${escapeHtml(result.student)}</strong><br><small>${escapeHtml(result.fileName)}</small></td><td>${escapeHtml(result.code || "--")}</td><td>${result.hits}</td><td>${result.errors}</td><td class="grade">${result.grade.toFixed(1)}</td><td><span class="confidence ${result.confidence < 82 ? "low" : ""}">${result.confidence}%</span></td>`;
    els.resultsBody.append(row);
  });
}

function renderReviews() {
  els.reviewList.innerHTML = "";
  els.reviewStatus.textContent = `${state.reviews.length} pendencia(s)`;
  els.metricReview.textContent = state.reviews.length;
  if (!state.reviews.length) {
    els.reviewList.innerHTML = `<div class="empty-state compact"><strong>Sem duvidas por enquanto</strong><span>Marcacoes com baixa confianca aparecem aqui.</span></div>`;
    return;
  }
  state.reviews.forEach((review, index) => {
    const item = document.createElement("div");
    item.className = "review-item";
    item.innerHTML = `<div><strong>${escapeHtml(review.student)} - questao ${review.question}</strong><small>Detectado ${review.detected}; gabarito ${review.suggested}</small></div><div class="review-actions"></div>`;
    letters.forEach((letter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = letter;
      button.addEventListener("click", () => { state.reviews.splice(index, 1); renderReviews(); updateMetrics(); });
      item.querySelector(".review-actions").append(button);
    });
    els.reviewList.append(item);
  });
}

function renderQuestionBars() {
  els.questionBars.innerHTML = "";
  const total = Math.max(state.results.length, 1);
  state.answerKey.forEach((_, index) => {
    const misses = state.results.length ? state.results.filter((result) => result.answers[index] !== state.answerKey[index]).length : 0;
    const percent = Math.round((misses / total) * 100);
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `<strong>Q${index + 1}</strong><div class="bar-track"><div class="bar-fill" style="width: ${percent}%"></div></div><span>${percent}%</span>`;
    els.questionBars.append(row);
  });
}

function updateMetrics() {
  if (!state.results.length) { els.metricAverage.textContent = "--"; els.metricCritical.textContent = "--"; return; }
  const avg = state.results.reduce((sum, result) => sum + result.grade, 0) / state.results.length;
  const critical = state.answerKey.filter((_, index) => state.results.filter((result) => result.answers[index] !== state.answerKey[index]).length / state.results.length >= 0.4).length;
  els.metricAverage.textContent = avg.toFixed(1);
  els.metricCritical.textContent = critical;
}

function exportCsv() {
  if (!state.results.length) return;
  const rows = [["Aluno", "Codigo", "Arquivo", "Acertos", "Erros", "Nota", "Confianca"], ...state.results.map((r) => [r.student, r.code, r.fileName, r.hits, r.errors, r.grade.toFixed(1), `${r.confidence}%`])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "resultados-corrigeprovas.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function setScanMode(mode) {
  document.querySelector("#cameraPanel").classList.toggle("hidden", mode !== "camera");
  document.querySelector("#uploadPanel").classList.toggle("hidden", mode !== "upload");
  document.querySelectorAll(".scan-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.scanMode === mode));
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setCameraMessage("Este navegador nao liberou acesso a camera. Use o upload de arquivo."); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    state.cameraStream = stream;
    els.cameraPreview.srcObject = stream;
    els.cameraPlaceholder.classList.add("hidden");
    document.querySelector("#captureScan").disabled = false;
    document.querySelector("#stopCamera").disabled = false;
    document.querySelector("#startCamera").disabled = true;
    setCameraMessage("Quando a folha estiver alinhada na moldura, capture o gabarito.");
  } catch (error) { setCameraMessage("Nao consegui abrir a camera. Confira a permissao do navegador ou use upload."); }
}

function stopCamera() {
  if (state.cameraStream) state.cameraStream.getTracks().forEach((track) => track.stop());
  state.cameraStream = null;
  els.cameraPreview.srcObject = null;
  els.cameraPlaceholder.classList.remove("hidden");
  document.querySelector("#captureScan").disabled = true;
  document.querySelector("#stopCamera").disabled = true;
  document.querySelector("#startCamera").disabled = false;
  setCameraMessage("A permissao da camera sera solicitada pelo navegador.");
}

function captureScan() {
  const width = els.cameraPreview.videoWidth || 1280;
  const height = els.cameraPreview.videoHeight || 720;
  els.captureCanvas.width = width;
  els.captureCanvas.height = height;
  els.captureCanvas.getContext("2d").drawImage(els.cameraPreview, 0, 0, width, height);
  const dataUrl = els.captureCanvas.toDataURL("image/jpeg", 0.88);
  state.capturedScans += 1;
  state.files.push({ name: `captura-camera-${String(state.capturedScans).padStart(2, "0")}.jpg`, size: Math.round((dataUrl.length * 3) / 4), source: "camera", preview: dataUrl });
  renderFiles();
  setCameraMessage("Captura adicionada. Voce pode capturar outro gabarito ou corrigir a turma.");
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if ((char === "," || char === ";") && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") i += 1; row.push(cell); if (row.some((v) => v.trim())) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

async function readXlsxRows(file) {
  const entries = await unzipEntries(await file.arrayBuffer());
  const shared = parseSharedStrings(entries.get("xl/sharedStrings.xml") || "");
  const sheet = entries.get("xl/worksheets/sheet1.xml") || entries.get(firstSheetPath(entries.get("xl/workbook.xml") || "", entries.get("xl/_rels/workbook.xml.rels") || ""));
  if (!sheet) throw new Error("Planilha sem primeira aba legivel.");
  return parseWorksheet(sheet, shared);
}

async function unzipEntries(buffer) {
  const bytes = new Uint8Array(buffer), entries = new Map(), decoder = new TextDecoder("utf-8");
  let offset = findCentralDirectory(bytes);
  while (offset < bytes.length - 4 && readUint32(bytes, offset) === 0x02014b50) {
    const method = readUint16(bytes, offset + 10), size = readUint32(bytes, offset + 20), nameLen = readUint16(bytes, offset + 28), extraLen = readUint16(bytes, offset + 30), commentLen = readUint16(bytes, offset + 32), local = readUint32(bytes, offset + 42);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLen));
    const dataStart = local + 30 + readUint16(bytes, local + 26) + readUint16(bytes, local + 28);
    if (!name.endsWith("/")) entries.set(name, decoder.decode(method === 0 ? bytes.slice(dataStart, dataStart + size) : await inflateRaw(bytes.slice(dataStart, dataStart + size))));
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function inflateRaw(bytes) {
  if (!("DecompressionStream" in window)) throw new Error("Este navegador nao tem suporte a leitura XLSX local.");
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
}

function parseSharedStrings(xml) { return Array.from(xml.matchAll(/<si[\s\S]*?<\/si>/g)).map((m) => Array.from(m[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((t) => decodeXml(t[1])).join("")); }
function firstSheetPath(workbook, rels) { const sheet = workbook.match(/<sheet[^>]*r:id="([^"]+)"/); const rel = sheet && Array.from(rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)).find((r) => r[1] === sheet[1]); return rel ? (rel[2].startsWith("xl/") ? rel[2] : `xl/${rel[2].replace(/^\/+/, "")}`) : "xl/worksheets/sheet1.xml"; }
function parseWorksheet(xml, shared) { return Array.from(xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)).map((r) => { const cells = []; Array.from(r[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)).forEach((c) => { const ref = c[1].match(/r="([A-Z]+)\d+"/); const idx = ref ? columnNameToIndex(ref[1]) : cells.length; const raw = (c[2].match(/<v[^>]*>([\s\S]*?)<\/v>/) || c[2].match(/<t[^>]*>([\s\S]*?)<\/t>/) || ["", ""])[1]; cells[idx] = c[1].includes('t="s"') ? shared[Number(raw)] || "" : decodeXml(raw); }); return cells.map((v) => v || ""); }).filter((row) => row.some(cleanCell)); }
function findCentralDirectory(bytes) { for (let i = bytes.length - 22; i >= 0; i -= 1) if (readUint32(bytes, i) === 0x06054b50) return readUint32(bytes, i + 16); throw new Error("Arquivo XLSX sem diretorio ZIP."); }
function readUint16(bytes, offset) { return bytes[offset] | (bytes[offset + 1] << 8); }
function readUint32(bytes, offset) { return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24); }
function columnNameToIndex(name) { return name.split("").reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1; }
function decodeXml(value) { return String(value || "").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'"); }
function normalizeHeader(value) { return cleanCell(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }
function findHeaderIndex(headers, candidates) { const index = headers.findIndex((header) => candidates.includes(header)); return index >= 0 ? index : 0; }
function cleanCell(value) { return String(value || "").trim(); }
function cleanCode(value) { const text = cleanCell(value); return text.endsWith(".0") ? text.slice(0, -2) : text; }
function escapeHtml(value) { return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function findStudentForFile(file, index) { if (!state.students.length) return null; const name = normalizeHeader(file.name); return state.students.find((student) => name.includes(normalizeHeader(student.code))) || state.students[index] || null; }
function simulateAnswers(studentIndex) { return state.answerKey.map((correct, q) => (studentIndex + q) % 4 === 0 ? letters[(letters.indexOf(correct) + 1) % letters.length] : correct); }
function createDemoFiles() { return sampleNames.map((name, index) => ({ name: `cartao-resposta-${index + 1}-${slug(name)}.pdf`, size: 280000 + index * 13500 })); }
function buildReviews(results) { const reviews = []; results.forEach((r, ri) => r.answers.forEach((a, qi) => { if ((ri * 2 + qi) % 11 === 0) reviews.push({ student: r.student, question: qi + 1, detected: a, suggested: state.answerKey[qi] }); })); return reviews.slice(0, 6); }
function formatBytes(bytes) { return bytes ? `${Math.round(bytes / 1024)} KB` : "0 KB"; }
function slug(value) { return value.toLowerCase().replaceAll(" ", "-"); }
function setCameraMessage(message) { els.cameraHelp.textContent = message; }
function fillExample() { state.answerKey = ["B", "D", "A", "C", "E", "B", "A", "D", "C", "E"]; els.questionCount.value = state.answerKey.length; renderAnswerGrid(); renderQuestionBars(); }

els.questionCount.addEventListener("change", initAnswerKey);
els.rosterFile.addEventListener("change", importRoster);
els.scanFiles.addEventListener("change", (event) => { state.files = [...state.files, ...Array.from(event.target.files)]; renderFiles(); });
document.querySelector("#runCorrection").addEventListener("click", runCorrection);
document.querySelector("#exportCsv").addEventListener("click", exportCsv);
document.querySelector("#fillExample").addEventListener("click", fillExample);
document.querySelector("#generateCards").addEventListener("click", generateAnswerSheets);
document.querySelector("#generateCardsFromRoster").addEventListener("click", () => { generateAnswerSheets(); document.querySelector("#cartoes").scrollIntoView({ behavior: "smooth", block: "start" }); });
document.querySelector("#printCards").addEventListener("click", printAnswerSheets);
document.querySelector("#startCamera").addEventListener("click", startCamera);
document.querySelector("#stopCamera").addEventListener("click", stopCamera);
document.querySelector("#captureScan").addEventListener("click", captureScan);
document.querySelectorAll(".scan-tab").forEach((tab) => tab.addEventListener("click", () => setScanMode(tab.dataset.scanMode)));

initAnswerKey();
