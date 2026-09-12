var CONFIG = null;
var selectedFile = null;
var uploadedFileId = null;
var currentJobId = null;
var currentChecklistData = null;
var activeChecklistTab = null;
var currentRawPayload = null;
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
  els.lookupJobId = getEl("lookupJobId");
  els.lookupBtn = getEl("lookupBtn");
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
  els.comparisonCardsContainer = getEl("comparisonCardsContainer");
  els.comparisonTableWrap = getEl("comparisonTableWrap");
  els.viewCardBtn = getEl("viewCardBtn");
  els.viewTableBtn = getEl("viewTableBtn");
  els.documentKeys = getEl("documentKeys");
  els.dateTimeline = getEl("dateTimeline");
  els.checklistTabs = getEl("checklistTabs");
  els.checklistContent = getEl("checklistContent");
  els.copyJsonBtn = getEl("copyJsonBtn");
  els.downloadJsonBtn = getEl("downloadJsonBtn");
  els.setAsSampleBtn = getEl("setAsSampleBtn");
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
  if (els.comparisonCardsContainer) els.comparisonCardsContainer.innerHTML = '<div class="empty-cell">결과 없음</div>';
  if (els.checklistTabs) els.checklistTabs.innerHTML = "";
  if (els.checklistContent) els.checklistContent.innerHTML = '<div class="empty-cell">결과 없음</div>';
  els.rawJson.textContent = "결과 없음";
  currentChecklistData = null;
  activeChecklistTab = null;
  currentRawPayload = null;
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
  var cardsHtml = "";

  if (!rows || !rows.length) {
    els.comparisonTableBody.innerHTML = '<tr><td colspan="8" class="empty-cell">비교표 데이터가 없습니다.</td></tr>';
    if (els.comparisonCardsContainer) {
      els.comparisonCardsContainer.innerHTML = '<div class="empty-cell">비교표 데이터가 없습니다.</div>';
    }
    return;
  }

  /* Group rows by category */
  var categoryMap = {};
  var categoryOrder = [];

  var catIcons = {
    "서류 구비 현황": "📁",
    "당사자 정보": "👥",
    "물품 및 조건": "📦",
    "식별번호": "🔢",
    "날짜 및 선적": "🗓️"
  };

  rows.forEach(function (row) {
    var cat = row.category || "기타 검토 항목";
    if (!categoryMap[cat]) {
      categoryMap[cat] = [];
      categoryOrder.push(cat);
    }
    categoryMap[cat].push(row);
  });

  categoryOrder.forEach(function (catName) {
    var catRows = categoryMap[catName];
    var icon = catIcons[catName] || "📌";

    var matchCount = 0;
    var warnCount = 0;
    var critCount = 0;

    catRows.forEach(function (r) {
      var res = String(r.result || "").toLowerCase();
      if (
        res.indexOf("불일치") >= 0 ||
        res === "mismatch" ||
        res === "missing" ||
        res === "fail"
      ) {
        critCount += 1;
      } else if (
        res.indexOf("검토") >= 0 ||
        res === "review_required" ||
        res === "unclear" ||
        res === "warn"
      ) {
        warnCount += 1;
      } else if (
        res.indexOf("일치") >= 0 ||
        res === "match" ||
        res === "ok" ||
        res === "pass"
      ) {
        matchCount += 1;
      }
    });

    var summaryBadgeHtml = "";
    if (critCount > 0) {
      summaryBadgeHtml += '<span class="badge badge-crit">불일치 ' + critCount + '</span> ';
    }
    if (warnCount > 0) {
      summaryBadgeHtml += '<span class="badge badge-warn">검토필요 ' + warnCount + '</span> ';
    }
    if (matchCount > 0) {
      summaryBadgeHtml += '<span class="badge badge-ok">일치 ' + matchCount + '</span>';
    }

    /* Group Category Header Row (Table View) */
    html += '<tr class="group-header-row">';
    html += '<td colspan="8">';
    html += '<div class="group-header-flex">';
    html += '<div class="group-header-title">';
    html += '<span class="group-icon">' + icon + '</span> ';
    html += '<strong>' + escapeHtml(catName) + '</strong> ';
    html += '<span class="group-count">(' + catRows.length + '개 항목)</span>';
    html += '</div>';
    html += '<div class="group-header-badges">' + summaryBadgeHtml + '</div>';
    html += '</div>';
    html += '</td>';
    html += '</tr>';

    /* Group Category Header (Card View) */
    cardsHtml += '<div class="mobile-group-header">';
    cardsHtml += '<div class="mobile-group-title"><span class="group-icon">' + icon + '</span> <strong>' + escapeHtml(catName) + '</strong> <span class="group-count">(' + catRows.length + ')</span></div>';
    cardsHtml += '<div>' + summaryBadgeHtml + '</div>';
    cardsHtml += '</div>';

    /* Member Rows & Mobile Cards */
    catRows.forEach(function (row) {
      var rowClass = rowHighlightClass(row.result);
      var itemTitle = row.check_item_ko || row.check_item || "-";

      // Table Row
      html += '<tr class="' + rowClass + '">';
      html += '<td><strong class="item-title-cell">' + escapeHtml(cleanText(itemTitle)) + '</strong></td>';
      html += '<td><span class="' + badgeClass(row.result) + '">' + escapeHtml(row.result || "-") + '</span></td>';
      html += '<td>' + escapeHtml(cleanText(row.lc || "-")) + '</td>';
      html += '<td>' + escapeHtml(cleanText(row.commercial_invoice || row.invoice || "-")) + '</td>';
      html += '<td>' + escapeHtml(cleanText(row.bill_of_lading || row.bl || "-")) + '</td>';
      html += '<td>' + escapeHtml(cleanText(row.packing_list || "-")) + '</td>';
      html += '<td>' + escapeHtml(cleanText(row.marine_cargo_insurance || row.insurance || "-")) + '</td>';
      html += '<td>' + escapeHtml(cleanText(row.certificate_of_origin || row.coo || "-")) + '</td>';
      html += '</tr>';

      // Mobile Card Item
      cardsHtml += '<div class="mobile-matrix-card ' + rowClass + '">';
      cardsHtml += '<div class="mobile-card-top">';
      cardsHtml += '<span class="mobile-card-title">' + escapeHtml(cleanText(itemTitle)) + '</span>';
      cardsHtml += '<span class="' + badgeClass(row.result) + '">' + escapeHtml(row.result || "-") + '</span>';
      cardsHtml += '</div>';
      cardsHtml += '<div class="mobile-card-doc-grid">';

      var docs = [
        { label: "LC", val: row.lc },
        { label: "송장", val: row.commercial_invoice || row.invoice },
        { label: "B/L", val: row.bill_of_lading || row.bl },
        { label: "포장", val: row.packing_list },
        { label: "보험", val: row.marine_cargo_insurance || row.insurance },
        { label: "COO", val: row.certificate_of_origin || row.coo }
      ];

      docs.forEach(function (d) {
        var cleanV = cleanText(d.val || "-");
        var isMissing = cleanV === "missing" || cleanV === "-" || cleanV === "";
        var valClass = isMissing ? "doc-val-missing" : "doc-val-present";
        cardsHtml += '<div class="mobile-doc-item">';
        cardsHtml += '<span class="mobile-doc-tag">' + escapeHtml(d.label) + '</span>';
        cardsHtml += '<span class="mobile-doc-val ' + valClass + '">' + escapeHtml(cleanV || "-") + '</span>';
        cardsHtml += '</div>';
      });

      cardsHtml += '</div>';
      cardsHtml += '</div>';
    });
  });

  els.comparisonTableBody.innerHTML = html;
  if (els.comparisonCardsContainer) {
    els.comparisonCardsContainer.innerHTML = cardsHtml;
  }
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

  currentRawPayload = finalJob || parsed;
  els.rawJson.textContent = JSON.stringify(currentRawPayload, null, 2);

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

/* Run Job Lookup by Job ID */
function lookupExistingJob() {
  var apiKey = trimValue(els.apiKey.value);
  var jobId = trimValue(els.lookupJobId ? els.lookupJobId.value : "");

  if (!apiKey) {
    alert("API Key를 입력하세요.");
    return;
  }

  if (!jobId) {
    alert("조회할 Job ID (res_...)를 입력하세요.");
    return;
  }

  clearResult();
  setStatus("Job 조회 중...", "job_id=" + jobId);

  getJob(apiKey, jobId)
    .then(function (finalJob) {
      var rawText;
      var parsed;

      els.rawJson.textContent = JSON.stringify(finalJob, null, 2);

      if (finalJob.status === "failed") {
        setStatus("실행 실패된 Job", "job_id=" + jobId);
        alert("실행 실패된 Job입니다. Raw JSON을 확인하세요.");
        return;
      }

      rawText = extractResultText(finalJob);

      if (!rawText) {
        setStatus("조회 완료 (결과 텍스트 없음)", "job_id=" + jobId);
        return;
      }

      parsed = parseResultText(rawText);
      renderResult(parsed, finalJob);
      setStatus("조회 완료: " + finalJob.status, "job_id=" + jobId);
    })
    .catch(function (error) {
      console.error(error);
      setStatus("조회 실패", error.message);
      alert("Job 조회 실패: " + error.message);
    });
}

/* 1-Click JSON Helpers */
function copyJsonToClipboard() {
  if (!currentRawPayload) {
    alert("복사할 결과가 없습니다.");
    return;
  }
  var jsonStr = JSON.stringify(currentRawPayload, null, 2);
  navigator.clipboard.writeText(jsonStr).then(function () {
    alert("📋 Raw JSON이 클립보드에 복사되었습니다!");
  }).catch(function (err) {
    alert("복사 실패: " + err.message);
  });
}

function downloadJsonFile() {
  if (!currentRawPayload) {
    alert("다운로드할 결과가 없습니다.");
    return;
  }
  var jsonStr = JSON.stringify(currentRawPayload, null, 2);
  var blob = new Blob([jsonStr], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "upstage_trade_job_result.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function setAsCustomSample() {
  if (!currentRawPayload) {
    alert("샘플로 지정할 결과가 없습니다.");
    return;
  }
  try {
    localStorage.setItem("myCustomSample", JSON.stringify(currentRawPayload));
    alert("⭐ 현재 결과가 내 커스텀 샘플로 지정되었습니다!\n앞으로 '👁️ 샘플 보기' 버튼을 누르면 이 결과가 표시됩니다.");
  } catch (e) {
    alert("저장 실패: " + e.message);
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
      if (els.lookupJobId) els.lookupJobId.value = currentJobId;
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
  var savedCustom = localStorage.getItem("myCustomSample");
  var sampleJob = null;

  if (savedCustom) {
    try {
      sampleJob = JSON.parse(savedCustom);
    } catch (e) {
      sampleJob = null;
    }
  }

  if (sampleJob) {
    try {
      var rawText = extractResultText(sampleJob);
      var parsed = parseResultText(rawText);
      renderResult(parsed, sampleJob);
      if (els.lookupJobId && sampleJob.id) {
        els.lookupJobId.value = sampleJob.id;
      }
      setStatus("커스텀 샘플 결과 표시 중", "job_id=" + sampleJob.id);
      return;
    } catch (e) {
      console.warn("커스텀 샘플 파싱 실패, 기본 sample.json 로드:", e);
    }
  }

  setStatus("서버 샘플 로딩 중...", "sample.json");

  fetch("./sample.json?v=" + encodeURIComponent(getCacheBuster()), {
    cache: "no-store"
  })
    .then(function (res) {
      if (!res.ok) {
        throw new Error("sample.json 파일 로드 실패 (" + res.status + ")");
      }
      return res.json();
    })
    .then(function (sampleData) {
      var rawText = extractResultText(sampleData);
      var parsed = parseResultText(rawText);
      renderResult(parsed, sampleData);
      if (els.lookupJobId && sampleData.id) {
        els.lookupJobId.value = sampleData.id;
      }
      setStatus("샘플 결과 표시 중 (서버 sample.json)", "job_id=" + sampleData.id);
    })
    .catch(function (error) {
      console.error(error);
      setStatus("샘플 로드 실패", error.message);
      alert("샘플 데이터 로드 실패: " + error.message);
    });
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

function initComparisonViewToggle() {
  if (!els.viewCardBtn || !els.viewTableBtn) return;

  els.viewCardBtn.addEventListener("click", function () {
    els.viewCardBtn.classList.add("active");
    els.viewTableBtn.classList.remove("active");
    if (els.comparisonCardsContainer) els.comparisonCardsContainer.style.display = "flex";
    if (els.comparisonTableWrap) els.comparisonTableWrap.style.display = "none";
  });

  els.viewTableBtn.addEventListener("click", function () {
    els.viewTableBtn.classList.add("active");
    els.viewCardBtn.classList.remove("active");
    if (els.comparisonCardsContainer) els.comparisonCardsContainer.style.display = "none";
    if (els.comparisonTableWrap) els.comparisonTableWrap.style.display = "block";
  });
}

function init() {
  initElements();
  initTheme();
  initComparisonViewToggle();

  loadConfig()
    .then(function () {
      bindFileEvents();
      els.runBtn.addEventListener("click", runWorkflow);
      els.sampleBtn.addEventListener("click", fillSample);
      els.clearBtn.addEventListener("click", clearResult);
      if (els.lookupBtn) els.lookupBtn.addEventListener("click", lookupExistingJob);
      if (els.copyJsonBtn) els.copyJsonBtn.addEventListener("click", copyJsonToClipboard);
      if (els.downloadJsonBtn) els.downloadJsonBtn.addEventListener("click", downloadJsonFile);
      if (els.setAsSampleBtn) els.setAsSampleBtn.addEventListener("click", setAsCustomSample);
      clearResult();
      setStatus("대기 중", "cache_buster=v=" + getCacheBuster());
    })
    .catch(function (error) {
      console.error(error);
      alert("초기화 실패: " + error.message);
    });
}

document.addEventListener("DOMContentLoaded", init);
