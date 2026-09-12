var CONFIG = null;
var selectedFile = null;
var uploadedFileId = null;
var currentJobId = null;
var currentChecklistData = null;
var activeChecklistTab = null;
var els = {};

function getEl(id) {
  return document.getElementById(id);
}

function initElements() {
  els.apiKey = getEl("apiKey");
  els.workerUrl = getEl("workerUrl");
  els.configId = getEl("configId");
  els.themeToggleBtn = getEl("themeToggleBtn");
  els.themeIcon = getEl("themeIcon");
  els.themeLabel = getEl("themeLabel");
  els.fileInput = getEl("fileInput");
  els.dropzone = getEl("dropzone");
  els.fileInfo = getEl("fileInfo");
  els.runBtn = getEl("runBtn");
  els.sampleBtn = getEl("sampleBtn");
  els.clearBtn = getEl("clearBtn");
  els.jobStatus = getEl("jobStatus");
  els.jobMeta = getEl("jobMeta");
  els.overallStatus = getEl("overallStatus");
  els.overallStatusDesc = getEl("overallStatusDesc");
  els.alertLevel = getEl("alertLevel");
  els.alertLevelDesc = getEl("alertLevelDesc");
  els.recommendedAction = getEl("recommendedAction");
  els.oneLineSummary = getEl("oneLineSummary");
  els.usageCard = getEl("usageCard");
  els.usageStepName = getEl("usageStepName");
  els.usageInputTokens = getEl("usageInputTokens");
  els.usageOutputTokens = getEl("usageOutputTokens");
  els.usageTotalTokens = getEl("usageTotalTokens");
  els.comparisonTableBody = getEl("comparisonTableBody");
  els.documentKeys = getEl("documentKeys");
  els.dateTimeline = getEl("dateTimeline");
  els.checklistTabs = getEl("checklistTabs");
  els.checklistContent = getEl("checklistContent");
  els.rawJson = getEl("rawJson");
}

function escapeHtml(value) {
  var str = String(value == null ? "" : value);
  str = str.replace(/&/g, "&amp;");
  str = str.replace(/</g, "&lt;");
  str = str.replace(/>/g, "&gt;");
  str = str.replace(/"/g, "&quot;");
  str = str.replace(/'/g, "&#039;");
  return str;
}

/* Remove raw citation markers like 【†16】, [†80], 【80】 */
function cleanText(value) {
  if (value == null) return "";
  var str = String(value);
  str = str.replace(/【†?\d+】/g, "").replace(/\[†?\d+\]/g, "");
  return str.trim();
}

function trimValue(value) {
  return String(value == null ? "" : value).replace(/^\s+|\s+$/g, "");
}

function getCacheBuster() {
  var url = new URL(window.location.href);
  return url.searchParams.get("v") || String(Date.now());
}

/* Theme Toggle */
function initTheme() {
  var savedTheme = localStorage.getItem("theme") || "light";
  setTheme(savedTheme);

  if (els.themeToggleBtn) {
    els.themeToggleBtn.addEventListener("click", function () {
      var currentTheme = document.documentElement.getAttribute("data-theme") || "light";
      var nextTheme = currentTheme === "light" ? "dark" : "light";
      setTheme(nextTheme);
    });
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  if (els.themeIcon && els.themeLabel) {
    if (theme === "dark") {
      els.themeIcon.textContent = "🌙";
      els.themeLabel.textContent = "어두운 화면";
    } else {
      els.themeIcon.textContent = "☀️";
      els.themeLabel.textContent = "밝은 화면";
    }
  }
}

/* API Endpoint Construction via Cloudflare Worker */
function getApiEndpoint(path) {
  var workerBase = trimValue(els.workerUrl ? els.workerUrl.value : "") || (CONFIG ? CONFIG.workerUrl : "");
  if (!workerBase) {
    workerBase = "https://bong.gehunmin19.workers.dev";
  }
  
  if (!/^https?:\/\//i.test(workerBase)) {
    workerBase = "https://" + workerBase;
  }

  workerBase = workerBase.replace(/\/+$/, "");

  if (!workerBase.endsWith("/v2") && !workerBase.endsWith("/v1")) {
    return workerBase + "/v2" + path;
  }
  return workerBase + path;
}

function setStatus(text, meta) {
  els.jobStatus.textContent = text || "";
  els.jobMeta.textContent = meta || "";
}

function badgeClass(result) {
  var v = String(result || "").toLowerCase();

  if (v.indexOf("일치") >= 0 || v === "match" || v === "ok" || v === "proceed" || v === "pass") {
    return "badge badge-ok";
  }
  if (
    v.indexOf("검토") >= 0 ||
    v.indexOf("warning") >= 0 ||
    v === "review_required" ||
    v === "unclear" ||
    v === "warn"
  ) {
    return "badge badge-warn";
  }
  if (
    v.indexOf("불일치") >= 0 ||
    v.indexOf("critical") >= 0 ||
    v === "mismatch" ||
    v === "on_hold" ||
    v === "missing" ||
    v === "fail"
  ) {
    return "badge badge-crit";
  }
  return "badge badge-neutral";
}

function rowHighlightClass(result) {
  var v = String(result || "").toLowerCase();

  if (
    v.indexOf("불일치") >= 0 ||
    v.indexOf("critical") >= 0 ||
    v === "mismatch" ||
    v === "missing" ||
    v === "fail"
  ) {
    return "row-crit";
  }
  if (
    v.indexOf("검토") >= 0 ||
    v.indexOf("warning") >= 0 ||
    v === "review_required" ||
    v === "unclear" ||
    v === "warn"
  ) {
    return "row-warn";
  }
  return "";
}

function clearResult() {
  els.overallStatus.innerHTML = "-";
  els.overallStatusDesc.textContent = "결과 없음";
  els.alertLevel.innerHTML = "-";
  els.alertLevelDesc.textContent = "결과 없음";
  els.recommendedAction.textContent = "결과 없음";
  els.oneLineSummary.textContent = "결과 없음";
  if (els.usageCard) els.usageCard.style.display = "none";
  els.documentKeys.innerHTML = "결과 없음";
  if (els.dateTimeline) els.dateTimeline.innerHTML = "결과 없음";
  els.comparisonTableBody.innerHTML = '<tr><td colspan="8" class="empty-cell">결과 없음</td></tr>';
  if (els.checklistTabs) els.checklistTabs.innerHTML = "";
  if (els.checklistContent) els.checklistContent.innerHTML = '<div class="empty-cell">결과 없음</div>';
  els.rawJson.textContent = "결과 없음";
  currentChecklistData = null;
  activeChecklistTab = null;
  setStatus("대기 중", "");
}

function normalizeResultPayload(parsed) {
  if (parsed && parsed.structured_result) {
    return parsed.structured_result;
  }
  return parsed || {};
}

function renderUsage(finalJob) {
  if (!els.usageCard) return;

  var usage = finalJob.usage;
  var stepName = (finalJob.output && finalJob.output[0] && finalJob.output[0].model) || finalJob.model || "Agent Job";

  if (usage || stepName) {
    els.usageCard.style.display = "block";
    els.usageStepName.textContent = stepName;
    els.usageInputTokens.textContent = (usage && usage.input_tokens != null) ? usage.input_tokens.toLocaleString() : "-";
    els.usageOutputTokens.textContent = (usage && usage.output_tokens != null) ? usage.output_tokens.toLocaleString() : "-";
    els.usageTotalTokens.textContent = (usage && usage.total_tokens != null) ? usage.total_tokens.toLocaleString() : "-";
  } else {
    els.usageCard.style.display = "none";
  }
}

function renderDocumentKeys(documentKeys) {
  var html = "";
  var key;
  var cleanedVal;

  if (!documentKeys || typeof documentKeys !== "object") {
    els.documentKeys.innerHTML = "결과 없음";
    return;
  }

  for (key in documentKeys) {
    if (Object.prototype.hasOwnProperty.call(documentKeys, key)) {
      cleanedVal = cleanText(documentKeys[key]);
      html += '<div class="kv-item">';
      html += '<div class="kv-key">' + escapeHtml(key) + "</div>";
      html += '<div class="kv-value">' + escapeHtml(cleanedVal || "-") + "</div>";
      html += "</div>";
    }
  }

  els.documentKeys.innerHTML = html || "결과 없음";
}

function renderDateTimeline(dateChecks) {
  if (!els.dateTimeline) return;

  var items = [
    { key: "insurance_policy_issue_date", label: "Insurance Issue" },
    { key: "invoice_date", label: "Invoice" },
    { key: "packing_list_date", label: "Packing List" },
    { key: "bl_shipment_date", label: "B/L Shipment" },
    { key: "bl_on_board_date", label: "B/L On Board" },
    { key: "latest_shipment_date", label: "Latest Shipment" },
    { key: "lc_issue_date", label: "LC Issue" },
    { key: "certificate_issue_date", label: "COO Issue" }
  ];

  var html = "";
  var i;
  var item;
  var value;
  var statusClass = "badge-neutral";
  var cleanedNotes = "";

  if (!dateChecks || typeof dateChecks !== "object") {
    els.dateTimeline.innerHTML = "결과 없음";
    return;
  }

  if (dateChecks.date_sequence_status === "match") {
    statusClass = "badge-ok";
  } else if (dateChecks.date_sequence_status === "mismatch") {
    statusClass = "badge-crit";
  } else if (
    dateChecks.date_sequence_status === "missing" ||
    dateChecks.date_sequence_status === "unclear"
  ) {
    statusClass = "badge-warn";
  }

  cleanedNotes = cleanText(dateChecks.date_sequence_notes || "날짜 흐름 설명 없음");

  if (cleanedNotes) {
    html += '<div class="timeline-note-box">';
    html += '<span class="timeline-note-icon">📌</span>';
    html += '<div><strong>날짜 순서 종합 판정 (<span class="badge ' + statusClass + '">' + escapeHtml(dateChecks.date_sequence_status || "-") + '</span>):</strong> ' + escapeHtml(cleanedNotes) + '</div>';
    html += '</div>';
  }

  html += '<div class="doc-comparison-grid">';

  for (i = 0; i < items.length; i += 1) {
    item = items[i];
    value = cleanText(dateChecks[item.key] || "");
    if (!value) {
      continue;
    }

    html += '<div class="doc-box">';
    html += '<div class="doc-box-label">' + escapeHtml(item.label) + '</div>';
    html += '<div class="doc-box-val">' + escapeHtml(value) + '</div>';
    html += '</div>';
  }

  html += '</div>';

  els.dateTimeline.innerHTML = html || "날짜 정보 없음";
}

function renderComparisonTable(rows) {
  var html = "";
  var i;
  var row;
  var rowClass = "";
  var itemTitle = "";

  if (!rows || !rows.length) {
    els.comparisonTableBody.innerHTML = '<tr><td colspan="8" class="empty-cell">비교표 데이터가 없습니다.</td></tr>';
    return;
  }

  for (i = 0; i < rows.length; i += 1) {
    row = rows[i];
    rowClass = rowHighlightClass(row.result);
    itemTitle = row.check_item_ko || row.check_item || "-";

    html += '<tr class="' + rowClass + '">';
    html += "<td><strong>" + escapeHtml(cleanText(itemTitle)) + "</strong></td>";
    html += '<td><span class="' + badgeClass(row.result) + '">' + escapeHtml(row.result || "-") + "</span></td>";
    html += "<td>" + escapeHtml(cleanText(row.lc || "-")) + "</td>";
    html += "<td>" + escapeHtml(cleanText(row.commercial_invoice || row.invoice || "-")) + "</td>";
    html += "<td>" + escapeHtml(cleanText(row.bill_of_lading || row.bl || "-")) + "</td>";
    html += "<td>" + escapeHtml(cleanText(row.packing_list || "-")) + "</td>";
    html += "<td>" + escapeHtml(cleanText(row.marine_cargo_insurance || row.insurance || "-")) + "</td>";
    html += "<td>" + escapeHtml(cleanText(row.certificate_of_origin || row.coo || "-")) + "</td>";
    html += "</tr>";
  }

  els.comparisonTableBody.innerHTML = html;
}

/* Render Per-Document Checklist Tabs & Content */
function selectChecklistTab(docKey) {
  if (!currentChecklistData || !currentChecklistData[docKey]) return;

  activeChecklistTab = docKey;

  // Update tab buttons active state
  var buttons = els.checklistTabs.querySelectorAll(".tab-btn");
  buttons.forEach(function (btn) {
    if (btn.getAttribute("data-key") === docKey) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Render checklist items
  var items = currentChecklistData[docKey];
  var html = "";
  var i;
  var item;
  var statusBadge = "badge-neutral";

  if (!items || !items.length) {
    els.checklistContent.innerHTML = '<div class="empty-cell">해당 서류의 체크리스트 항목이 없습니다.</div>';
    return;
  }

  for (i = 0; i < items.length; i += 1) {
    item = items[i];
    statusBadge = badgeClass(item.status);

    html += '<div class="checklist-item">';
    html += '<div>';
    html += '<div class="checklist-item-title">' + escapeHtml(cleanText(item.item || item.title || "점검 항목")) + '</div>';
    if (item.details || item.desc) {
      html += '<div class="checklist-item-details">' + escapeHtml(cleanText(item.details || item.desc)) + '</div>';
    }
    html += '</div>';
    html += '<div><span class="' + statusBadge + '">' + escapeHtml(item.status || "CHECK") + '</span></div>';
    html += '</div>';
  }

  els.checklistContent.innerHTML = html;
}

function renderChecklists(documentChecklists) {
  if (!els.checklistTabs || !els.checklistContent) return;

  if (!documentChecklists || typeof documentChecklists !== "object" || Object.keys(documentChecklists).length === 0) {
    els.checklistTabs.innerHTML = "";
    els.checklistContent.innerHTML = '<div class="empty-cell">서류별 체크리스트 데이터가 없습니다.</div>';
    return;
  }

  currentChecklistData = documentChecklists;

  var docLabels = {
    lc: "📜 L/C 신용장",
    invoice: "📄 상업송장 (INV)",
    commercial_invoice: "📄 상업송장 (INV)",
    bl: "🚢 선하증권 (B/L)",
    bill_of_lading: "🚢 선하증권 (B/L)",
    packing_list: "📦 포장명세서 (PK)",
    insurance: "🛡️ 해상보험 (INS)",
    marine_cargo_insurance: "🛡️ 해상보험 (INS)",
    coo: "🏛️ 원산지증명 (COO)",
    certificate_of_origin: "🏛️ 원산지증명 (COO)"
  };

  var tabsHtml = "";
  var keys = Object.keys(documentChecklists);
  var firstKey = keys[0];

  keys.forEach(function (key) {
    var label = docLabels[key] || (key.toUpperCase() + " 서류");
    tabsHtml += '<button type="button" class="tab-btn" data-key="' + escapeHtml(key) + '">' + escapeHtml(label) + '</button>';
  });

  els.checklistTabs.innerHTML = tabsHtml;

  // Bind tab click events
  var buttons = els.checklistTabs.querySelectorAll(".tab-btn");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var k = this.getAttribute("data-key");
      selectChecklistTab(k);
    });
  });

  // Select first tab default
  selectChecklistTab(firstKey);
}

function renderResult(parsed, finalJob) {
  var data = normalizeResultPayload(parsed);
  var rows = [];
  var overall = String(data.overall_status || "").toLowerCase();
  var alertLvl = String(data.overall_alert_level || "").toLowerCase();

  els.rawJson.textContent = JSON.stringify(finalJob || parsed, null, 2);

  /* Render Overall Status Pill */
  if (overall === "review_required") {
    els.overallStatus.innerHTML = '<span class="status-pill-lg badge-warn">Review Required</span>';
    els.overallStatusDesc.textContent = "진행 전 추가 검토 필요";
  } else if (overall === "proceed") {
    els.overallStatus.innerHTML = '<span class="status-pill-lg badge-ok">Proceed</span>';
    els.overallStatusDesc.textContent = "서류 일치 (진행 가능)";
  } else if (overall === "on_hold") {
    els.overallStatus.innerHTML = '<span class="status-pill-lg badge-crit">On Hold</span>';
    els.overallStatusDesc.textContent = "불일치 발생 (보류)";
  } else {
    els.overallStatus.innerHTML = '<span class="status-pill-lg badge-neutral">' + escapeHtml(data.overall_status || "-") + '</span>';
    els.overallStatusDesc.textContent = "결과 확인";
  }

  /* Render Alert Level Pill */
  if (alertLvl === "critical") {
    els.alertLevel.innerHTML = '<span class="status-pill-lg badge-crit">Critical</span>';
    els.alertLevelDesc.textContent = "치명 이슈 포함";
  } else if (alertLvl === "warning") {
    els.alertLevel.innerHTML = '<span class="status-pill-lg badge-warn">Warning</span>';
    els.alertLevelDesc.textContent = "주의 필요";
  } else if (alertLvl === "info") {
    els.alertLevel.innerHTML = '<span class="status-pill-lg badge-ok">Info</span>';
    els.alertLevelDesc.textContent = "참고 수준";
  } else {
    els.alertLevel.innerHTML = '<span class="status-pill-lg badge-neutral">' + escapeHtml(data.overall_alert_level || "-") + '</span>';
    els.alertLevelDesc.textContent = "결과 확인";
  }

  els.oneLineSummary.textContent = cleanText(data.one_line_summary) || "-";
  els.recommendedAction.textContent = cleanText(data.recommended_action) || "-";

  if (finalJob) {
    renderUsage(finalJob);
  }

  renderDocumentKeys(data.document_keys);
  renderDateTimeline(data.date_checks);
  rows = data.comparison_matrix || [];
  renderComparisonTable(rows);
  renderChecklists(data.document_checklists);
}

function loadConfig() {
  var v = getCacheBuster();

  return fetch("./config.json?v=" + encodeURIComponent(v), {
    cache: "no-store"
  })
    .then(function (res) {
      if (!res.ok) {
        throw new Error("config.json 로드 실패");
      }
      return res.json();
    })
    .then(function (json) {
      CONFIG = json;
      if (CONFIG.defaultApiKey && !els.apiKey.value) {
        els.apiKey.value = CONFIG.defaultApiKey;
      }
      if (CONFIG.workerUrl && els.workerUrl) {
        els.workerUrl.value = CONFIG.workerUrl;
      }
      if (CONFIG.configId && els.configId) {
        els.configId.value = CONFIG.configId;
      }
    });
}

function uploadFile(apiKey, file) {
  var form = new FormData();
  form.append("file", file);
  form.append("purpose", CONFIG.filePurpose || "user_data");

  var endpoint = getApiEndpoint("/files");

  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey
    },
    body: form
  }).then(function (res) {
    if (!res.ok) {
      return res.text().then(function (text) {
        throw new Error("파일 업로드 실패 (" + res.status + "): " + text);
      });
    }
    return res.json();
  });
}

function validateUploadedFile(uploaded) {
  if (!uploaded || !uploaded.id) {
    throw new Error("업로드 응답에 file id가 없습니다.");
  }
  return uploaded;
}

function createJob(apiKey, fileId, configId) {
  var body = {
    model: CONFIG.agentId,
    include: ["last"],
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

  if (configId) {
    body.config_id = configId;
  }

  var endpoint = getApiEndpoint("/responses");

  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  }).then(function (res) {
    if (!res.ok) {
      return res.text().then(function (text) {
        throw new Error("Job 생성 실패 (" + res.status + "): " + text);
      });
    }
    return res.json();
  });
}

function getJob(apiKey, jobId) {
  var endpoint = getApiEndpoint("/responses/" + encodeURIComponent(jobId) + "?include[]=last");

  return fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + apiKey
    }
  }).then(function (res) {
    if (!res.ok) {
      return res.text().then(function (text) {
        throw new Error("Job 조회 실패 (" + res.status + "): " + text);
      });
    }
    return res.json();
  });
}

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function pollJob(apiKey, jobId) {
  return new Promise(function (resolve, reject) {
    function loop() {
      getJob(apiKey, jobId)
        .then(function (job) {
          setStatus("실행 상태: " + job.status, "job_id=" + job.id);

          if (job.status === "completed" || job.status === "failed") {
            resolve(job);
            return;
          }

          wait(CONFIG.pollIntervalMs || 2500).then(loop);
        })
        .catch(reject);
    }

    loop();
  });
}

function extractResultText(finalJob) {
  if (finalJob.output_text) {
    return finalJob.output_text;
  }

  if (
    finalJob.output &&
    finalJob.output.length > 0 &&
    finalJob.output[0].content &&
    finalJob.output[0].content.length > 0 &&
    finalJob.output[0].content[0].text
  ) {
    return finalJob.output[0].content[0].text;
  }

  return null;
}

function parseResultText(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (e) {
    throw new Error("결과 JSON 파싱 실패: " + e.message + "\n원문: " + rawText);
  }
}

function runWorkflow() {
  var apiKey = trimValue(els.apiKey.value);
  var configId = trimValue(els.configId.value);

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
  setStatus("파일 업로드 중...", "");

  uploadFile(apiKey, selectedFile)
    .then(validateUploadedFile)
    .then(function (uploaded) {
      uploadedFileId = uploaded.id;

      els.fileInfo.innerHTML =
        "<strong>" + escapeHtml(selectedFile.name) + "</strong><br>" +
        '<span class="meta-text">file_id=' + escapeHtml(uploadedFileId) + "</span>";

      setStatus("Job 생성 중...", "file_id=" + uploadedFileId);
      return createJob(apiKey, uploadedFileId, configId);
    })
    .then(function (job) {
      currentJobId = job.id;
      setStatus("실행 중...", "job_id=" + currentJobId);
      return pollJob(apiKey, currentJobId);
    })
    .then(function (finalJob) {
      var rawText;
      var parsed;

      els.rawJson.textContent = JSON.stringify(finalJob, null, 2);

      if (finalJob.status === "failed") {
        setStatus("실행 실패", "job_id=" + currentJobId);
        alert("실행 실패: Raw JSON을 확인하세요.");
        els.runBtn.disabled = false;
        return;
      }

      rawText = extractResultText(finalJob);

      if (!rawText) {
        setStatus("완료되었지만 결과 텍스트 없음", "job_id=" + currentJobId);
        els.runBtn.disabled = false;
        return;
      }

      parsed = parseResultText(rawText);
      renderResult(parsed, finalJob);
      setStatus("완료", "job_id=" + currentJobId);
      els.runBtn.disabled = false;
    })
    .catch(function (error) {
      console.error(error);
      setStatus("오류 발생", error.message);

      if (String(error.message || "").indexOf("Failed to fetch") >= 0) {
        alert(
          "CORS 통신 오류가 발생했습니다.\n" +
          "Cloudflare Worker 서버 주소 (" + (els.workerUrl ? els.workerUrl.value : "") + ") 연결 상태를 확인해 주세요."
        );
      } else if (String(error.message || "").indexOf("No access to file") >= 0) {
        alert(
          "업로드된 file_id를 현재 에이전트 실행에서 바로 사용할 수 없어 403이 발생했습니다."
        );
      } else {
        alert(error.message || "오류가 발생했습니다.");
      }

      els.runBtn.disabled = false;
    });
}

function fillSample() {
  var sampleJob = {
    id: "job_demo_20260912_v22",
    object: "response",
    status: "completed",
    model: "agt_EpTRLGpvzaoGjJEEyPcWN8",
    usage: {
      input_tokens: 33972,
      output_tokens: 10712,
      total_tokens: 44684
    },
    output: [
      {
        type: "message",
        status: "completed",
        role: "assistant",
        model: "Instruct - final_trade_document_set_review_api_v1",
        content: [
          {
            type: "output_text",
            text: JSON.stringify({
              structured_result: {
                overall_status: "review_required",
                overall_alert_level: "warning",
                one_line_summary: "업로드된 서류 세트는 Invoice, B/L, Packing List, Insurance는 확인되나 L/C 원문과 COO는 확인되지 않았고, 도착통지의 L/C 번호가 다른 선적서류와 상이하여 추가 검토가 필요합니다.",
                recommended_action: "도착통지의 L/C 번호 접미 -053의 의미를 원본 L/C 또는 amendment 기준으로 확인하고, L/C 원문 및 COO 확보 후 신적기한, 보험조건 요구서류 충족 여부를 재심사해보세요.",
                document_keys: {
                  lc_number: "M0201410ES04828-053",
                  invoice_number: "A4631-L032-61",
                  bl_number: "RKOE076",
                  policy_certificate_number: "15-H0065622",
                  certificate_number: "-"
                },
                date_checks: {
                  insurance_policy_issue_date: "2015-05-01",
                  invoice_date: "2015-05-07",
                  packing_list_date: "2015-05-07",
                  bl_shipment_date: "2015-05-07",
                  bl_on_board_date: "2015-05-07",
                  latest_shipment_date: "2015-05-15",
                  lc_issue_date: "2015-04-20",
                  certificate_issue_date: "-",
                  date_sequence_status: "missing",
                  date_sequence_notes: "보험증권 발행일은 2015-05-01, Invoice 및 Packing List 일자는 2015-05-07, B/L 선적일 및 On Board 일자는 2015-05-07로 시간 흐름은 대체로 자연스럽지만 L/C 발행일과 최종선적기한이 없어 완전 판정은 불가합니다."
                },
                comparison_matrix: [
                  {
                    category: "서류 구비 현황",
                    check_item: "file_presence",
                    check_item_ko: "서류 구비 현황",
                    result: "missing",
                    lc: "missing",
                    commercial_invoice: "present",
                    bill_of_lading: "present",
                    packing_list: "present",
                    marine_cargo_insurance: "present",
                    certificate_of_origin: "missing"
                  },
                  {
                    category: "당사자 정보",
                    check_item: "seller_party_consistency",
                    check_item_ko: "수출자(Beneficiary/Shipper) 정보 일치성",
                    result: "match",
                    lc: "not_available",
                    commercial_invoice: "MITSUBISHI ELECTRIC CORPORATION",
                    bill_of_lading: "MITSUBISHI ELECTRIC CORPORATION",
                    packing_list: "MITSUBISHI ELECTRIC CORPORATION",
                    marine_cargo_insurance: "MITSUBISHI ELECTRIC CORPORATION",
                    certificate_of_origin: "missing"
                  },
                  {
                    category: "당사자 정보",
                    check_item: "buyer_party_consistency",
                    check_item_ko: "수입자(Applicant/Consignee) 정보 일치성",
                    result: "unclear",
                    lc: "not_available",
                    commercial_invoice: "Hyundai Rotem Company",
                    bill_of_lading: "TO THE ORDER OF THE KOREA DEVELOPMENT BANK",
                    packing_list: "Hyundai Rotem Company",
                    marine_cargo_insurance: "not_available",
                    certificate_of_origin: "-"
                  }
                ],
                document_checklists: {
                  lc: [
                    { item: "신용장 유효기한 (Expiry Date)", status: "warning", details: "L/C 원문 미확인으로 유효기한 검증 필요" },
                    { item: "분할선적 허용 여부 (Partial Shipment)", status: "pass", details: "Partial Shipment Allowed 기재됨" }
                  ],
                  invoice: [
                    { item: "L/C 번호 표기 유무", status: "pass", details: "M0201410ES04828 기재 완료" },
                    { item: "발행자 서명 및 인장", status: "pass", details: "MITSUBISHI ELECTRIC 서명 확인" }
                  ],
                  bl: [
                    { item: "Clean On Board 표기", status: "pass", details: "2015-05-07 On Board 적재 확인" },
                    { item: "운임 지급 조건 (Freight Prepaid)", status: "pass", details: "Freight Prepaid 기재됨" }
                  ],
                  packing_list: [
                    { item: "포장 수량 및 CBM 산정", status: "pass", details: "22.948 CBM 산정 일치" }
                  ],
                  insurance: [
                    { item: "보험증권 발행일 (선적일 이전)", status: "pass", details: "2015-05-01 발행으로 B/L 선적일(05-07) 이전 부보됨" }
                  ]
                }
              }
            })
          }
        ]
      }
    ]
  };

  var rawText = extractResultText(sampleJob);
  var parsed = parseResultText(rawText);
  renderResult(parsed, sampleJob);
  setStatus("샘플 결과 표시 중", "job_id=" + sampleJob.id);
}

function bindFileEvents() {
  els.dropzone.addEventListener("click", function () {
    els.fileInput.click();
  });

  els.fileInput.addEventListener("change", function (e) {
    selectedFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    els.fileInfo.textContent = selectedFile ? selectedFile.name : "선택된 파일 없음";
  });

  els.dropzone.addEventListener("dragover", function (e) {
    e.preventDefault();
    els.dropzone.classList.add("dragover");
  });

  els.dropzone.addEventListener("dragleave", function (e) {
    e.preventDefault();
    els.dropzone.classList.remove("dragover");
  });

  els.dropzone.addEventListener("drop", function (e) {
    e.preventDefault();
    els.dropzone.classList.remove("dragover");
    selectedFile = e.dataTransfer.files && e.dataTransfer.files[0] ? e.dataTransfer.files[0] : null;
    els.fileInfo.textContent = selectedFile ? selectedFile.name : "선택된 파일 없음";
  });
}

function init() {
  initElements();
  initTheme();

  loadConfig()
    .then(function () {
      bindFileEvents();
      els.runBtn.addEventListener("click", runWorkflow);
      els.sampleBtn.addEventListener("click", fillSample);
      els.clearBtn.addEventListener("click", clearResult);
      clearResult();
      setStatus("대기 중", "cache_buster=v=" + getCacheBuster());
    })
    .catch(function (error) {
      console.error(error);
      alert("초기화 실패: " + error.message);
    });
}

document.addEventListener("DOMContentLoaded", init);
