let CONFIG = null;
let selectedFile = null;
let uploadedFileId = null;
let currentJobId = null;

const \$ = (id) => document.getElementById(id);

const els = {
  apiKey: \$("apiKey"),
  configId: \$("configId"),
  fileInput: \$("fileInput"),
  dropzone: \$("dropzone"),
  fileInfo: \$("fileInfo"),
  runBtn: \$("runBtn"),
  sampleBtn: \$("sampleBtn"),
  clearBtn: \$("clearBtn"),
  jobStatus: \$("jobStatus"),
  jobMeta: \$("jobMeta"),
  overallStatus: \$("overallStatus"),
  overallStatusDesc: \$("overallStatusDesc"),
  alertLevel: \$("alertLevel"),
  alertLevelDesc: \$("alertLevelDesc"),
  recommendedAction: \$("recommendedAction"),
  oneLineSummary: \$("oneLineSummary"),
  comparisonTableBody: \$("comparisonTableBody"),
  documentKeys: \$("documentKeys"),
  issues: \$("issues"),
  rawJson: \$("rawJson")
};

async function loadConfig() {
  const res = await fetch("./config.json");
  if (!res.ok) throw new Error("config.json 로드 실패");
  CONFIG = await res.json();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(text, meta = "") {
  els.jobStatus.textContent = text;
  els.jobMeta.textContent = meta;
}

function badgeClass(result) {
  const v = String(result || "").toLowerCase();
  if (v.includes("일치") || v === "match" || v === "ok") return "badge badge-ok";
  if (v.includes("검토") || v.includes("warning") || v === "review_required") return "badge badge-warn";
  if (v.includes("불일치") || v.includes("critical") || v === "mismatch") return "badge badge-crit";
  return "badge badge-neutral";
}

function normalizeResultPayload(parsed) {
  if (parsed?.structured_result) return parsed.structured_result;
  return parsed;
}

function renderDocumentKeys(documentKeys) {
  if (!documentKeys || typeof documentKeys !== "object") {
    els.documentKeys.className = "kv-list empty";
    els.documentKeys.innerHTML = "결과 없음";
    return;
  }

  els.documentKeys.className = "kv-list";
  els.documentKeys.innerHTML = Object.entries(documentKeys)
    .map(([k, v]) => `
      <div class="kv-item">
        <div class="kv-key">\${escapeHtml(k)}</div>
        <div class="kv-value">\${escapeHtml(v)}</div>
      </div>
    `)
    .join("");
}

function renderIssues(data) {
  const issues = [];

  if (Array.isArray(data?.comparison_table)) {
    for (const row of data.comparison_table) {
      const result = String(row.result || "");
      if (
        result.includes("불일치") ||
        result.includes("검토") ||
        result.toLowerCase().includes("warning") ||
        result.toLowerCase().includes("critical")
      ) {
        issues.push({
          level: result.includes("불일치") ? "critical" : "warning",
          title: row.check_item || "-",
          desc: `LC: \${row.lc ?? "-"} / Invoice: \${row.invoice ?? "-"} / B/L: \${row.bill_of_lading ?? row.bl ?? "-"} / Packing List: \${row.packing_list ?? "-"}`
        });
      }
    }
  }

  if (!issues.length && data?.overall_alert_level) {
    issues.push({
      level: data.overall_alert_level,
      title: "overall_alert_level",
      desc: data.one_line_summary || "-"
    });
  }

  if (!issues.length) {
    els.issues.className = "issue-list empty";
    els.issues.innerHTML = "이슈 없음";
    return;
  }

  els.issues.className = "issue-list";
  els.issues.innerHTML = issues.map(issue => `
    <div class="issue-item">
      <span class="\${badgeClass(issue.level)}">\${escapeHtml(issue.level)}</span>
      <div class="issue-title">\${escapeHtml(issue.title)}</div>
      <div class="issue-desc">\${escapeHtml(issue.desc)}</div>
    </div>
  `).join("");
}

function renderComparisonTable(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    els.comparisonTableBody.innerHTML = `
      <tr><td colspan="8" class="empty-cell">비교표 데이터가 없습니다.</td></tr>
    `;
    return;
  }

  els.comparisonTableBody.innerHTML = rows.map(row => `
    <tr>
      <td>\${escapeHtml(row.check_item ?? row.item ?? "-")}</td>
      <td><span class="\${badgeClass(row.result)}">\${escapeHtml(row.result ?? "-")}</span></td>
      <td>\${escapeHtml(row.lc ?? "-")}</td>
      <td>\${escapeHtml(row.invoice ?? "-")}</td>
      <td>\${escapeHtml(row.bill_of_lading ?? row.bl ?? "-")}</td>
      <td>\${escapeHtml(row.packing_list ?? "-")}</td>
      <td>\${escapeHtml(row.insurance ?? "-")}</td>
      <td>\${escapeHtml(row.coo ?? row.certificate_of_origin ?? "-")}</td>
    </tr>
  `).join("");
}

function renderResult(parsed) {
  const data = normalizeResultPayload(parsed);

  els.rawJson.textContent = JSON.stringify(parsed, null, 2);
  els.overallStatus.textContent = data.overall_status || "-";
  els.alertLevel.textContent = data.overall_alert_level || "-";
  els.oneLineSummary.textContent = data.one_line_summary || "-";
  els.recommendedAction.textContent = data.recommended_action || "-";

  els.overallStatusDesc.textContent =
    data.overall_status === "review_required" ? "진행 전 검토 필요" :
    data.overall_status === "approved" ? "이상 없음" : "결과 확인";

  els.alertLevelDesc.textContent =
    data.overall_alert_level === "critical" ? "치명 이슈 포함" :
    data.overall_alert_level === "warning" ? "주의 필요" :
    data.overall_alert_level === "info" ? "참고 수준" : "결과 확인";

  renderDocumentKeys(data.document_keys);
  renderIssues(data);

  const rows =
    data.comparison_table ||
    data.comparison_results ||
    data.check_results ||
    [];

  renderComparisonTable(rows);
}

function clearResult() {
  els.overallStatus.textContent = "-";
  els.overallStatusDesc.textContent = "결과 없음";
  els.alertLevel.textContent = "-";
  els.alertLevelDesc.textContent = "결과 없음";
  els.recommendedAction.textContent = "결과 없음";
  els.oneLineSummary.textContent = "결과 없음";
  els.documentKeys.className = "kv-list empty";
  els.documentKeys.innerHTML = "결과 없음";
  els.issues.className = "issue-list empty";
  els.issues.innerHTML = "결과 없음";
  els.comparisonTableBody.innerHTML = `<tr><td colspan="8" class="empty-cell">결과 없음</td></tr>`;
  els.rawJson.textContent = "결과 없음";
  setStatus("대기 중");
}

async function uploadFile(apiKey, file) {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", "user_data");

  const res = await fetch(`\${CONFIG.baseUrl}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer \${apiKey}`
    },
    body: form
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`파일 업로드 실패 (\${res.status}): \${text}`);
  }

  return await res.json();
}

async function createJob(apiKey, fileId, configId) {
  const body = {
    model: CONFIG.agentId,
    include: CONFIG.include,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            file_id: fileId
          }
        ]
      }
    ]
  };

  if (configId && configId.trim()) {
    body.config_id = configId.trim();
  }

  const res = await fetch(`\${CONFIG.baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer \${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Job 생성 실패 (\${res.status}): \${text}`);
  }

  return await res.json();
}

async function getJob(apiKey, jobId) {
  const res = await fetch(`\${CONFIG.baseUrl}/responses/\${jobId}?include[]=last`, {
    method: "GET",
    headers: {
      Authorization: `Bearer \${apiKey}`
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Job 조회 실패 (\${res.status}): \${text}`);
  }

  return await res.json();
}

async function pollJob(apiKey, jobId) {
  while (true) {
    const job = await getJob(apiKey, jobId);
    setStatus(`실행 상태: \${job.status}`, `job_id=\${job.id}`);

    if (job.status === "completed" || job.status === "failed") {
      return job;
    }

    await new Promise(resolve => setTimeout(resolve, CONFIG.pollIntervalMs));
  }
}

async function runWorkflow() {
  try {
    const apiKey = els.apiKey.value.trim();
    const configId = els.configId.value.trim();

    if (!apiKey) {
      alert("API Key를 입력하세요.");
      return;
    }

    if (!selectedFile) {
      alert("파일을 선택하세요.");
      return;
    }

    clearResult();
    els.runBtn.disabled = true;

    setStatus("파일 업로드 중...");
    const uploaded = await uploadFile(apiKey, selectedFile);
    uploadedFileId = uploaded.id;

    els.fileInfo.innerHTML = `
      <strong>\${escapeHtml(selectedFile.name)}</strong><br>
      <span class="meta-text">file_id=\${escapeHtml(uploadedFileId)}</span>
    `;

    setStatus("Job 생성 중...", `file_id=\${uploadedFileId}`);
    const job = await createJob(apiKey, uploadedFileId, configId);
    currentJobId = job.id;

    setStatus("실행 중...", `job_id=\${currentJobId}`);
    const finalJob = await pollJob(apiKey, currentJobId);

    if (finalJob.status === "failed") {
      els.rawJson.textContent = JSON.stringify(finalJob, null, 2);
      setStatus("실행 실패", `job_id=\${currentJobId}`);
      alert("실행 실패: Raw JSON을 확인하세요.");
      return;
    }

    if (!finalJob.output_text) {
      els.rawJson.textContent = JSON.stringify(finalJob, null, 2);
      setStatus("완료되었지만 output_text 없음", `job_id=\${currentJobId}`);
      return;
    }

    const parsed = JSON.parse(finalJob.output_text);
    renderResult(parsed);
    setStatus("완료", `job_id=\${currentJobId}`);
  } catch (error) {
    console.error(error);
    setStatus("오류 발생");
    alert(error.message || "오류가 발생했습니다.");
  } finally {
    els.runBtn.disabled = false;
  }
}

function fillSample() {
  const sample = {
    structured_result: {
      overall_status: "review_required",
      overall_alert_level: "warning",
      one_line_summary: "B/L과 Packing List의 핵심 항목은 대체로 일치하나 일부 추가 검토가 필요합니다.",
      recommended_action: "불일치 또는 검토필요 항목을 우선 확인하고 선적서류 원본과 대조하세요.",
      document_keys: {
        lc_number: "M0201410ES04828",
        invoice_number: "A4631-L032-61",
        bl_number: "RKOE076",
        policy_certificate_number: "15-H0065622"
      },
      comparison_table: [
        {
          check_item: "L/C 번호",
          result: "일치",
          lc: "M0201410ES04828",
          invoice: "M0201410ES04828",
          bill_of_lading: "M0201410ES04828",
          packing_list: "M0201410ES04828",
          insurance: "M0201410ES04828",
          coo: "-"
        },
        {
          check_item: "부피(CBM)",
          result: "일치",
          lc: "-",
          invoice: "-",
          bill_of_lading: "22.948",
          packing_list: "22.948",
          insurance: "-",
          coo: "-"
        }
      ]
    }
  };

  renderResult(sample);
  setStatus("샘플 결과 표시 중");
}

function bindFileEvents() {
  els.dropzone.addEventListener("click", () => els.fileInput.click());

  els.fileInput.addEventListener("change", (e) => {
    selectedFile = e.target.files?.[0] || null;
    els.fileInfo.textContent = selectedFile ? selectedFile.name : "선택된 파일 없음";
  });

  ["dragenter", "dragover"].forEach(eventName => {
    els.dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      els.dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach(eventName => {
    els.dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      els.dropzone.classList.remove("dragover");
    });
  });

  els.dropzone.addEventListener("drop", (e) => {
    selectedFile = e.dataTransfer.files?.[0] || null;
    els.fileInfo.textContent = selectedFile ? selectedFile.name : "선택된 파일 없음";
  });
}

async function init() {
  try {
    await loadConfig();
    bindFileEvents();

    els.runBtn.addEventListener("click", runWorkflow);
    els.sampleBtn.addEventListener("click", fillSample);
    els.clearBtn.addEventListener("click", clearResult);

    clearResult();
  } catch (error) {
    console.error(error);
    alert("초기화 실패: config.json을 확인하세요.");
  }
}

init();