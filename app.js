const letters = ["A", "B", "C", "D", "E"];
const sampleNames = [
  "Ana Beatriz",
  "Bruno Lima",
  "Carla Souza",
  "Diego Alves",
  "Elisa Martins",
  "Felipe Rocha",
  "Giovana Costa",
  "Henrique Nunes"
];

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

    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");
    row.append(number);

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

function renderFiles() {
  els.fileList.innerHTML = "";
  els.metricScans.textContent = state.files.length;
  els.uploadStatus.textContent = state.files.length ? `${state.files.length} arquivo(s)` : "Aguardando arquivos";

  state.files.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "file-item";
    const source = file.source === "camera" ? "capturado pela camera" : `aluno ${index + 1}`;
    const student = findStudentForFile(file, index);
    const association = student ? `${student.name} (${student.code})` : source;
    item.innerHTML = `
      <div>
        <strong>${file.name}</strong>
        <small>${formatBytes(file.size)} - ${association}</small>
      </div>
      <span class="status-pill">Pronto</span>
    `;
    els.fileList.append(item);
  });
}

function runCorrection() {
  const files = state.files.length ? state.files : createDemoFiles();
  state.files = files;

  state.results = files.map((file, index) => {
    const student = findStudentForFile(file, index);
    const answers = simulateAnswers(index);
    const hits = answers.filter((answer, questionIndex) => answer === state.answerKey[questionIndex]).length;
    const errors = state.answerKey.length - hits;
    const grade = (hits / state.answerKey.length) * Number(els.maxGrade.value);
    const confidence = 72 + ((index * 13) % 27);

    return {
      student: student ? student.name : sampleNames[index % sampleNames.length],
      code: student ? student.code : "",
      fileName: file.name,
      answers,
      hits,
      errors,
      grade,
      confidence
    };
  });

  state.reviews = buildReviews(state.results);
  renderFiles();
  renderResults();
  renderReviews();
  renderQuestionBars();
  updateMetrics();
}

async function importRoster(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const extension = file.name.split(".").pop().toLowerCase();
    const rows = extension === "xlsx"
      ? await readXlsxRows(file)
      : parseCsv(await file.text());

    state.students = normalizeStudents(rows);
    renderStudents();
    renderFiles();
  } catch (error) {
    els.studentList.innerHTML = `
      <div class="empty-state compact">
        <strong>Nao consegui ler a planilha</strong>
        <span>Confira se ela tem colunas de nome e codigo, ou tente exportar como CSV.</span>
      </div>
    `;
    els.rosterStatus.textContent = "Erro na leitura";
  }
}

function normalizeStudents(rows) {
  if (!rows.length) return [];

  const headers = rows[0].map((cell) => normalizeHeader(cell));
  const nameIndex = findHeaderIndex(headers, ["nome", "aluno", "estudante", "name"]);
  const codeIndex = findHeaderIndex(headers, ["codigo", "cod", "matricula", "id", "numero"]);

  return rows.slice(1)
    .map((row, index) => ({
      name: cleanCell(row[nameIndex]) || cleanCell(row[0]) || `Aluno ${index + 1}`,
      code: cleanCell(row[codeIndex]) || cleanCell(row[1]) || String(index + 1).padStart(3, "0")
    }))
    .filter((student) => student.name.trim() || student.code.trim());
}

function renderStudents() {
  els.studentList.innerHTML = "";
  els.rosterStatus.textContent = state.students.length ? `${state.students.length} aluno(s)` : "Lista vazia";

  if (!state.students.length) {
    els.studentList.innerHTML = `
      <div class="empty-state compact">
        <strong>Nenhum aluno importado</strong>
        <span>Sem lista, o prototipo usa nomes de exemplo.</span>
      </div>
    `;
    return;
  }

  state.students.forEach((student) => {
    const item = document.createElement("div");
    item.className = "student-item";
    item.innerHTML = `
      <div>
        <strong>${student.name}</strong>
        <small>Codigo do aluno</small>
      </div>
      <span class="student-code">${student.code}</span>
    `;
    els.studentList.append(item);
  });
}

function generateAnswerSheets() {
  const students = state.students.length
    ? state.students
    : sampleNames.slice(0, 4).map((name, index) => ({
      name,
      code: `2026${String(index + 1).padStart(3, "0")}`
    }));

  const examName = document.querySelector("#examName").value || "Prova";
  const className = document.querySelector("#className").value || "Turma";
  const cardsPreview = document.querySelector("#cardsPreview");
  cardsPreview.innerHTML = "";

  students.forEach((student) => {
    const sheet = document.createElement("article");
    sheet.className = "answer-sheet";
    sheet.innerHTML = `
      <span class="corner-mark top-left"></span>
      <span class="corner-mark top-right"></span>
      <span class="corner-mark bottom-left"></span>
      <span class="corner-mark bottom-right"></span>
      <header class="sheet-header">
        <div>
          <div class="sheet-brand">
            <img src="logo-sesi.png" alt="SESI Escola de Referencia">
            <span>Cartao-resposta</span>
          </div>
          <div class="sheet-fields">
            <div><strong>Prova</strong>${escapeHtml(examName)}</div>
            <div><strong>Turma</strong>${escapeHtml(className)}</div>
            <div><strong>Aluno</strong>${escapeHtml(student.name)}</div>
            <div><strong>Codigo</strong>${escapeHtml(student.code)}</div>
          </div>
        </div>
        <div class="visual-code">
          <div class="barcode">${renderBarcode(student.code)}</div>
          <small>CP-${escapeHtml(student.code)}</small>
        </div>
      </header>
      <p class="sheet-instructions">Preencha completamente apenas uma alternativa por questao. Mantenha os quatro marcadores visiveis.</p>
      <div class="sheet-bubbles">${renderBubbleRows()}</div>
    `;
    cardsPreview.append(sheet);
  });
}

function renderBubbleRows() {
  return state.answerKey.map((_, index) => `
    <div class="bubble-row">
      <strong>${String(index + 1).padStart(2, "0")}</strong>
      ${letters.map((letter) => `<span class="bubble">${letter}</span>`).join("")}
    </div>
  `).join("");
}

function renderBarcode(value) {
  const bits = stringToBits(`CP-${value}`);
  return bits.map((bit, index) => {
    const width = bit === "1" ? 4 : 2;
    const opacity = bit === "1" ? 1 : 0.18;
    return `<span style="width:${width}px;opacity:${opacity}" title="bit ${index}"></span>`;
  }).join("");
}

function stringToBits(value) {
  return value.split("")
    .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("")
    .slice(0, 80);
}

function printAnswerSheets() {
  if (!document.querySelector(".answer-sheet")) {
    generateAnswerSheets();
  }

  window.print();
}

function findStudentForFile(file, index) {
  if (!state.students.length) return null;
  const fileName = normalizeHeader(file.name);
  const byCode = state.students.find((student) => {
    const code = normalizeHeader(student.code);
    return code && fileName.includes(code);
  });

  return byCode || state.students[index] || null;
}

function setScanMode(mode) {
  document.querySelectorAll(".scan-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.scanMode === mode);
  });

  document.querySelector("#cameraPanel").classList.toggle("hidden", mode !== "camera");
  document.querySelector("#uploadPanel").classList.toggle("hidden", mode !== "upload");
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setCameraMessage("Este navegador nao liberou acesso a camera. Use o upload de arquivo.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    state.cameraStream = stream;
    els.cameraPreview.srcObject = stream;
    els.cameraPlaceholder.classList.add("hidden");
    document.querySelector("#captureScan").disabled = false;
    document.querySelector("#stopCamera").disabled = false;
    document.querySelector("#startCamera").textContent = "Camera ativa";
    document.querySelector("#startCamera").disabled = true;
    setCameraMessage("Quando a folha estiver alinhada na moldura, capture o gabarito.");
  } catch (error) {
    setCameraMessage("Nao consegui abrir a camera. Confira a permissao do navegador ou use upload.");
  }
}

function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
  }

  state.cameraStream = null;
  els.cameraPreview.srcObject = null;
  els.cameraPlaceholder.classList.remove("hidden");
  document.querySelector("#captureScan").disabled = true;
  document.querySelector("#stopCamera").disabled = true;
  document.querySelector("#startCamera").textContent = "Abrir camera";
  document.querySelector("#startCamera").disabled = false;
  setCameraMessage("A permissao da camera sera solicitada pelo navegador.");
}

function captureScan() {
  const video = els.cameraPreview;
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;

  els.captureCanvas.width = width;
  els.captureCanvas.height = height;
  const context = els.captureCanvas.getContext("2d");
  context.drawImage(video, 0, 0, width, height);

  state.capturedScans += 1;
  const dataUrl = els.captureCanvas.toDataURL("image/jpeg", 0.88);
  const size = Math.round((dataUrl.length * 3) / 4);

  state.files.push({
    name: `captura-camera-${String(state.capturedScans).padStart(2, "0")}.jpg`,
    size,
    source: "camera",
    preview: dataUrl
  });

  renderFiles();
  setCameraMessage("Captura adicionada. Voce pode capturar outro gabarito ou corrigir a turma.");
}

function setCameraMessage(message) {
  els.cameraHelp.textContent = message;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if ((char === "," || char === ";") && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

async function readXlsxRows(file) {
  const entries = await unzipEntries(await file.arrayBuffer());
  const sharedStrings = parseSharedStrings(entries.get("xl/sharedStrings.xml") || "");
  const workbook = entries.get("xl/workbook.xml") || "";
  const rels = entries.get("xl/_rels/workbook.xml.rels") || "";
  const sheetPath = firstSheetPath(workbook, rels);
  const sheetXml = entries.get(sheetPath) || entries.get("xl/worksheets/sheet1.xml");

  if (!sheetXml) {
    throw new Error("Planilha sem primeira aba legivel.");
  }

  return parseWorksheet(sheetXml, sharedStrings);
}

async function unzipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const entries = new Map();
  const decoder = new TextDecoder("utf-8");
  let offset = findCentralDirectory(bytes);

  while (offset < bytes.length - 4) {
    if (readUint32(bytes, offset) !== 0x02014b50) break;

    const method = readUint16(bytes, offset + 10);
    const compressedSize = readUint32(bytes, offset + 20);
    const fileNameLength = readUint16(bytes, offset + 28);
    const extraLength = readUint16(bytes, offset + 30);
    const commentLength = readUint16(bytes, offset + 32);
    const localHeaderOffset = readUint32(bytes, offset + 42);
    const fileNameStart = offset + 46;
    const fileName = decoder.decode(bytes.slice(fileNameStart, fileNameStart + fileNameLength));
    const localNameLength = readUint16(bytes, localHeaderOffset + 26);
    const localExtraLength = readUint16(bytes, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);

    if (!fileName.endsWith("/")) {
      const content = method === 0 ? compressed : await inflateRaw(compressed);
      entries.set(fileName, decoder.decode(content));
    }

    offset = fileNameStart + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findCentralDirectory(bytes) {
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (readUint32(bytes, offset) === 0x06054b50) {
      return readUint32(bytes, offset + 16);
    }
  }

  throw new Error("Arquivo XLSX sem diretorio ZIP.");
}

async function inflateRaw(bytes) {
  if (!("DecompressionStream" in window)) {
    throw new Error("Este navegador nao tem suporte a leitura XLSX local.");
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function parseSharedStrings(xml) {
  return Array.from(xml.matchAll(/<si[\s\S]*?<\/si>/g)).map((match) => {
    return Array.from(match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g))
      .map((textMatch) => decodeXml(textMatch[1]))
      .join("");
  });
}

function firstSheetPath(workbookXml, relsXml) {
  const sheetMatch = workbookXml.match(/<sheet[^>]*r:id="([^"]+)"/);
  if (!sheetMatch) return "xl/worksheets/sheet1.xml";

  const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
  const rels = Array.from(relsXml.matchAll(relRegex));
  const rel = rels.find((item) => item[1] === sheetMatch[1]);
  if (!rel) return "xl/worksheets/sheet1.xml";

  const target = rel[2].replace(/^\/+/, "");
  return target.startsWith("xl/") ? target : `xl/${target}`;
}

function parseWorksheet(xml, sharedStrings) {
  const rows = [];
  const rowMatches = Array.from(xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g));

  rowMatches.forEach((rowMatch) => {
    const cells = [];
    const cellMatches = Array.from(rowMatch[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g));

    cellMatches.forEach((cellMatch) => {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/r="([A-Z]+)\d+"/);
      const columnIndex = ref ? columnNameToIndex(ref[1]) : cells.length;
      const valueMatch = body.match(/<v[^>]*>([\s\S]*?)<\/v>/);
      const inlineMatch = body.match(/<t[^>]*>([\s\S]*?)<\/t>/);
      const type = attrs.match(/t="([^"]+)"/);
      const raw = valueMatch ? decodeXml(valueMatch[1]) : inlineMatch ? decodeXml(inlineMatch[1]) : "";
      const value = type && type[1] === "s" ? sharedStrings[Number(raw)] || "" : raw;
      cells[columnIndex] = value;
    });

    if (cells.some((value) => cleanCell(value))) rows.push(cells.map((value) => value || ""));
  });

  return rows;
}

function columnNameToIndex(name) {
  return name.split("").reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function readUint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function normalizeHeader(value) {
  return cleanCell(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findHeaderIndex(headers, candidates) {
  const index = headers.findIndex((header) => candidates.includes(header));
  return index >= 0 ? index : 0;
}

function cleanCell(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function simulateAnswers(studentIndex) {
  return state.answerKey.map((correct, questionIndex) => {
    const shouldMiss = (studentIndex + questionIndex) % 4 === 0;
    if (!shouldMiss) return correct;
    const offset = ((studentIndex + questionIndex) % (letters.length - 1)) + 1;
    return letters[(letters.indexOf(correct) + offset) % letters.length];
  });
}

function createDemoFiles() {
  return sampleNames.slice(0, 6).map((name, index) => ({
    name: `cartao-resposta-${index + 1}-${slug(name)}.pdf`,
    size: 280000 + index * 13500
  }));
}

function buildReviews(results) {
  const reviews = [];

  results.forEach((result, resultIndex) => {
    result.answers.forEach((answer, questionIndex) => {
      const uncertain = (resultIndex * 2 + questionIndex) % 11 === 0;
      if (uncertain) {
        reviews.push({
          student: result.student,
          question: questionIndex + 1,
          detected: answer,
          suggested: state.answerKey[questionIndex]
        });
      }
    });
  });

  return reviews.slice(0, 6);
}

function renderResults() {
  els.resultsBody.innerHTML = "";
  els.emptyResults.classList.add("hidden");
  els.resultsWrap.classList.remove("hidden");

  state.results.forEach((result) => {
    const row = document.createElement("tr");
    const lowConfidence = result.confidence < 82;
    row.innerHTML = `
      <td><strong>${result.student}</strong><br><small>${result.fileName}</small></td>
      <td>${result.code || "--"}</td>
      <td>${result.hits}</td>
      <td>${result.errors}</td>
      <td class="grade">${result.grade.toFixed(1)}</td>
      <td><span class="confidence ${lowConfidence ? "low" : ""}">${result.confidence}%</span></td>
    `;
    els.resultsBody.append(row);
  });
}

function renderReviews() {
  els.reviewList.innerHTML = "";
  els.reviewStatus.textContent = `${state.reviews.length} pendencia(s)`;
  els.metricReview.textContent = state.reviews.length;

  if (!state.reviews.length) {
    els.reviewList.innerHTML = `
      <div class="empty-state compact">
        <strong>Sem duvidas por enquanto</strong>
        <span>Marcacoes com baixa confianca aparecem aqui.</span>
      </div>
    `;
    return;
  }

  state.reviews.forEach((review, index) => {
    const item = document.createElement("div");
    item.className = "review-item";
    item.innerHTML = `
      <div>
        <strong>${review.student} - questao ${review.question}</strong>
        <small>Detectado ${review.detected}; gabarito ${review.suggested}</small>
      </div>
      <div class="review-actions" aria-label="Escolher alternativa"></div>
    `;

    const actions = item.querySelector(".review-actions");
    letters.forEach((letter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = letter;
      button.addEventListener("click", () => resolveReview(index, letter));
      actions.append(button);
    });

    els.reviewList.append(item);
  });
}

function resolveReview(index) {
  state.reviews.splice(index, 1);
  renderReviews();
  updateMetrics();
}

function renderQuestionBars() {
  els.questionBars.innerHTML = "";
  const total = Math.max(state.results.length, 1);

  state.answerKey.forEach((_, index) => {
    const misses = state.results.length
      ? state.results.filter((result) => result.answers[index] !== state.answerKey[index]).length
      : 0;
    const percent = Math.round((misses / total) * 100);

    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <strong>Q${index + 1}</strong>
      <div class="bar-track"><div class="bar-fill" style="width: ${percent}%"></div></div>
      <span>${percent}%</span>
    `;
    els.questionBars.append(row);
  });
}

function updateMetrics() {
  if (!state.results.length) {
    els.metricAverage.textContent = "--";
    els.metricCritical.textContent = "--";
    return;
  }

  const average = state.results.reduce((sum, result) => sum + result.grade, 0) / state.results.length;
  const critical = state.answerKey.filter((_, index) => {
    const misses = state.results.filter((result) => result.answers[index] !== state.answerKey[index]).length;
    return misses / state.results.length >= 0.4;
  }).length;

  els.metricAverage.textContent = average.toFixed(1);
  els.metricCritical.textContent = critical;
}

function exportCsv() {
  if (!state.results.length) return;

  const header = ["Aluno", "Codigo", "Arquivo", "Acertos", "Erros", "Nota", "Confianca"];
  const rows = state.results.map((result) => [
    result.student,
    result.code,
    result.fileName,
    result.hits,
    result.errors,
    result.grade.toFixed(1),
    `${result.confidence}%`
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "resultados-corrigeprovas.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function fillExample() {
  state.answerKey = ["B", "D", "A", "C", "E", "B", "A", "D", "C", "E"];
  els.questionCount.value = state.answerKey.length;
  renderAnswerGrid();
  renderQuestionBars();
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  return `${Math.round(bytes / 1024)} KB`;
}

function slug(value) {
  return value.toLowerCase().replaceAll(" ", "-");
}

els.questionCount.addEventListener("change", initAnswerKey);
els.rosterFile.addEventListener("change", importRoster);
els.scanFiles.addEventListener("change", (event) => {
  state.files = [...state.files, ...Array.from(event.target.files)];
  renderFiles();
});
document.querySelector("#runCorrection").addEventListener("click", runCorrection);
document.querySelector("#exportCsv").addEventListener("click", exportCsv);
document.querySelector("#fillExample").addEventListener("click", fillExample);
document.querySelector("#generateCards").addEventListener("click", generateAnswerSheets);
document.querySelector("#printCards").addEventListener("click", printAnswerSheets);
document.querySelector("#startCamera").addEventListener("click", startCamera);
document.querySelector("#stopCamera").addEventListener("click", stopCamera);
document.querySelector("#captureScan").addEventListener("click", captureScan);
document.querySelectorAll(".scan-tab").forEach((tab) => {
  tab.addEventListener("click", () => setScanMode(tab.dataset.scanMode));
});

initAnswerKey();
