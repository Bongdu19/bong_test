var CONFIG = null;
var selectedFile = null;
var uploadedFileId = null;
var currentJobId = null;
var els = {};

function getEl(id) {
  return document.getElementById(id);
}

function initElements() {
  els.apiKey = getEl("apiKey");
  els.configId = getEl("configId");
  els.proxyMode = getEl("proxyMode");
  els.proxyUrl = getEl("proxyUrl");
  els.proxyUrlWrap = getEl("proxyUrlWrap");
  els.proxyNotice = getEl("proxyNotice");
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
  els.comparisonTableBody = getEl("comparisonTableBody");
  els.documentKeys = getEl("documentKeys");
  els.issues = getEl("issues");
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

/* Proxy Selector UI Update */
function updateProxyUI() {
  var mode = els.proxyMode.value;

  if (mode === "worker") {
    els.proxyUrlWrap.style.display = "block";
    els.proxyNotice.className = "notice-box notice-info";
    els.proxyNotice.innerHTML = "🔒 <strong>Cloudflare Worker 모드</strong>: API 키와 통신이 본인의 Worker 서버를 경유하므로 보안상 유출되지 않습니다.";
  } else if (mode === "public") {
    els.proxyUrlWrap.style.display = "none";
    els.proxyNotice.className = "notice-box notice-warning";
    els.proxyNotice.innerHTML = "⚠️ <strong>공개 프록시 경고</strong>: <code>corsproxy.io</code> 제3자 서버를 통과하므로 보안에 유의하세요. (테스트용 권장)";
  } else {
    els.proxyUrlWrap.style.display = "none";
    els.proxyNotice.className = "notice-box notice-info";
    els.proxyNotice.innerHTML = "🌐 <strong>직접 연결 모드</strong>: API 서버가 CORS를 허용하지 않는 경우 브라우저에서 요청이 차단될 수 있습니다.";
  }
}

/* Construct Request URL based on Proxy Mode */
function getApiEndpoint(path) {
  var mode = els.proxyMode.value;
  var targetUrl = (CONFIG.baseUrl || "https://api.upstage.ai/v2") + path;

  if (mode === "public") {
    return "https://corsproxy.io/?" + targetUrl;
  } else if (mode === "worker") {
    var workerBase = trimValue(els.proxyUrl.value);
    if (!workerBase) {
      throw new Error("Cloudflare Worker URL을 입력해 주세요.");
    }
    // Remove trailing slash
    workerBase = workerBase.replace(/\/+$/, "");

    // If worker base ends with /v2 or path starts with /v2
    if (!workerBase.endsWith("/v2") && !workerBase.endsWith("/v1")) {
      return workerBase + "/v2" + path;
    }
    return workerBase + path;
  } else {
    return targetUrl;
  }
}

function setStatus(text, meta) {
  els.jobStatus.textContent = text || "";
  els.jobMeta.textContent = meta || "";
}

function badgeClass(result) {
  var v = String(result || "").toLowerCase();

  if (v.indexOf("일치") >= 0 || v === "match" || v === "ok" || v === "proceed") {
    return "badge badge-ok";
  }
  if (
    v.indexOf("검토") >= 0 ||
    v.indexOf("warning") >= 0 ||
    v === "review_required" ||
    v === "unclear"
  ) {
    return "badge badge-warn";
  }
  if (
    v.indexOf("불일치") >= 0 ||
    v.indexOf("critical") >= 0 ||
    v === "mismatch" ||
    v === "on_hold" ||
    v === "missing"
  ) {
    return "badge badge-crit";
  }
  return "badge badge-neutral";
}

function clearResult() {
  els.overallStatus.textContent = "-";
  els.overallStatusDesc.textContent = "결과 없음";
  els.alertLevel.textContent = "-";
  els.alertLevelDesc.textContent = "결과 없음";
  els.recommendedAction.textContent = "결과 없음";
  els.oneLineSummary.textContent = "결과 없음";
  els.documentKeys.innerHTML = "결과 없음";
  els.issues.innerHTML = "결과 없음";
  els.comparisonTableBody.innerHTML = '<tr><td colspan="8" class="empty-cell">결과 없음</td></tr>';
  els.rawJson.textContent = "결과 없음";
  setStatus("대기 중", "");
}

function normalizeResultPayload(parsed) {
  if (parsed && parsed.structured_result) {
    return parsed.structured_result;
  }
  return parsed || {};
}

function renderDocumentKeys(documentKeys) {
  var html = "";
  var key;

  if (!documentKeys || typeof documentKeys !== "object") {
    els.documentKeys.innerHTML = "결과 없음";
    return;
  }

  for (key in documentKeys) {
    if (Object.prototype.hasOwnProperty.call(documentKeys, key)) {
      html += '<div class="kv-item">';
      html += '<div class="kv-key">' + escapeHtml(key) + "</div>";
      html += '<div class="kv-value">' + escapeHtml(documentKeys[key] || "-") + "</div>";
      html += "</div>";
    }
  }

  els.documentKeys.innerHTML = html || "결과 없음";
}

function buildDateTimeline(dateChecks) {
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

  if (!dateChecks || typeof dateChecks !== "object") {
    return "";
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

  html += '<div class="issue-item">';
  html += '<div class="issue-title">Date Flow Timeline</div>';
  html += '<div class="issue-desc" style="margin-top:6px;">';
  html += '<span class="badge ' + statusClass + '">' + escapeHtml(dateChecks.date_sequence_status || "-") + "</span>";
  html += " " + escapeHtml(dateChecks.date_sequence_notes || "날짜 흐름 설명 없음");
  html += "</div>";
  html += '<div class="timeline-wrap" style="margin-top:12px; display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px;">';

  for (i = 0; i < items.length; i += 1) {
    item = items[i];
    value = trimValue(dateChecks[item.key] || "");
    if (!value) {
      continue;
    }

    html += '<div class="kv-item" style="padding: 8px 10px;">';
    html += '<div class="kv-key" style="font-size:12px;">' + escapeHtml(item.label) + "</div>";
    html += '<div class="kv-value" style="font-size:13px; margin-top:2px;">' + escapeHtml(value) + "</div>";
    html += "</div>";
  }

  html += "</div>";
  html += "</div>";

  return html;
}

function renderIssues(data) {
  var html = "";
  var rows = data && data.comparison_matrix ? data.comparison_matrix : [];
  var i;
  var row;
  var result;
  var isIssue;

  html += buildDateTimeline(data.date_checks);

  if (rows && rows.length) {
    for (i = 0; i < rows.length; i += 1) {
      row = rows[i];
      result = String(row.result || "");
      isIssue =
        result.indexOf("불일치") >= 0 ||
        result.indexOf("검토") >= 0 ||
        result.toLowerCase().indexOf("warning") >= 0 ||
        result.toLowerCase().indexOf("critical") >= 0 ||
        result.toLowerCase() === "mismatch" ||
        result.toLowerCase() === "missing" ||
        result.toLowerCase() === "unclear";

      if (isIssue) {
        html += '<div class="issue-item">';
        html += '<span class="' + badgeClass(result) + '">' + escapeHtml(result) + "</span>";
        html += '<div class="issue-title">' + escapeHtml(row.check_item || "-") + "</div>";
        html += '<div class="issue-desc">';
        html += "LC: " + escapeHtml(row.lc || "-");
        html += " / Invoice: " + escapeHtml(row.commercial_invoice || "-");
        html += " / B/L: " + escapeHtml(row.bill_of_lading || "-");
        html += " / Packing List: " + escapeHtml(row.packing_list || "-");
        html += " / Insurance: " + escapeHtml(row.marine_cargo_insurance || "-");
        html += "</div>";
        html += "</div>";
      }
    }
  }

  els.issues.innerHTML = html || "이슈 없음";
}

function renderComparisonTable(rows) {
  var html = "";
  var i;
  var row;

  if (!rows || !rows.length) {
    els.comparisonTableBody.innerHTML = '<tr><td colspan="8" class="empty-cell">비교표 데이터가 없습니다.</td></tr>';
    return;
  }

  for (i = 0; i < rows.length; i += 1) {
    row = rows[i];
    html += "<tr>";
    html += "<td><strong>" + escapeHtml(row.check_item || "-") + "</strong></td>";
    html += '<td><span class="' + badgeClass(row.result) + '">' + escapeHtml(row.result || "-") + "</span></td>";
    html += "<td>" + escapeHtml(row.lc || "-") + "</td>";
    html += "<td>" + escapeHtml(row.commercial_invoice || "-") + "</td>";
    html += "<td>" + escapeHtml(row.bill_of_lading || "-") + "</td>";
    html += "<td>" + escapeHtml(row.packing_list || "-") + "</td>";
    html += "<td>" + escapeHtml(row.marine_cargo_insurance || "-") + "</td>";
    html += "<td>" + escapeHtml(row.certificate_of_origin || "-") + "</td>";
    html += "</tr>";
  }

  els.comparisonTableBody.innerHTML = html;
}

function renderResult(parsed) {
  var data = normalizeResultPayload(parsed);
  var rows = [];

  els.rawJson.textContent = JSON.stringify(parsed, null, 2);
  els.overallStatus.textContent = data.overall_status || "-";
  els.alertLevel.textContent = data.overall_alert_level || "-";
  els.oneLineSummary.textContent = data.one_line_summary || "-";
  els.recommendedAction.textContent = data.recommended_action || "-";

  if (data.overall_status === "review_required") {
    els.overallStatusDesc.textContent = "진행 전 검토 필요";
  } else if (data.overall_status === "proceed") {
    els.overallStatusDesc.textContent = "진행 가능";
  } else if (data.overall_status === "on_hold") {
    els.overallStatusDesc.textContent = "보류";
  } else {
    els.overallStatusDesc.textContent = "결과 확인";
  }

  if (data.overall_alert_level === "critical") {
    els.alertLevelDesc.textContent = "치명 이슈 포함";
  } else if (data.overall_alert_level === "warning") {
    els.alertLevelDesc.textContent = "주의 필요";
  } else if (data.overall_alert_level === "info") {
    els.alertLevelDesc.textContent = "참고 수준";
  } else {
    els.alertLevelDesc.textContent = "결과 확인";
  }

  renderDocumentKeys(data.document_keys);
  renderIssues(data);
  rows = data.comparison_matrix || [];
  renderComparisonTable(rows);
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
      renderResult(parsed);
      setStatus("완료", "job_id=" + currentJobId);
      els.runBtn.disabled = false;
    })
    .catch(function (error) {
      console.error(error);
      setStatus("오류 발생", error.message);

      if (String(error.message || "").indexOf("Failed to fetch") >= 0) {
        alert(
          "CORS 통신 오류가 발생했습니다.\n" +
          "선택하신 프록시 모드 (공개 프록시 / Cloudflare Worker)의 설정 상태를 확인해 주세요."
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
  var sample = {
    structured_result: {
      overall_status: "review_required",
      overall_alert_level: "warning",
      one_line_summary: "합본 무역서류 비교 결과 일부 검토가 필요합니다.",
      recommended_action: "불일치 또는 누락 항목을 확인하고 원본 서류와 대조하세요.",
      document_keys: {
        lc_number: "M0201410ES04828",
        invoice_number: "A4631-L032-61",
        bl_number: "RKOE076",
        policy_certificate_number: "15-H0065622"
      },
      date_checks: {
        insurance_policy_issue_date: "2015-05-01",
        invoice_date: "2015-05-07",
        packing_list_date: "2015-05-07",
        bl_shipment_date: "2015-05-07",
        bl_on_board_date: "2015-05-07",
        latest_shipment_date: "",
        lc_issue_date: "",
        certificate_issue_date: "",
        date_sequence_status: "match",
        date_sequence_notes: "보험증권 발행일 이후 송장/패킹리스트/B/L 날짜 흐름은 대체로 자연스럽습니다."
      },
      comparison_matrix: [
        {
          check_item: "invoice_number",
          result: "match",
          lc: "-",
          commercial_invoice: "A4631-L032-61",
          bill_of_lading: "-",
          packing_list: "A4631-L032-61",
          marine_cargo_insurance: "A4631-L032-61",
          certificate_of_origin: "-"
        },
        {
          check_item: "measurement_cbm",
          result: "match",
          lc: "-",
          commercial_invoice: "-",
          bill_of_lading: "22.948",
          packing_list: "22.948",
          marine_cargo_insurance: "-",
          certificate_of_origin: "-"
        },
        {
          check_item: "date_flow_timeline",
          result: "match",
          lc: "-",
          commercial_invoice: "2015-05-07",
          bill_of_lading: "2015-05-07",
          packing_list: "2015-05-07",
          marine_cargo_insurance: "2015-05-01",
          certificate_of_origin: "-"
        }
      ]
    }
  };

  renderResult(sample);
  setStatus("샘플 결과 표시 중", "");
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

  els.proxyMode.addEventListener("change", updateProxyUI);
  updateProxyUI();

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
