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
  str = str.replace(/</g, "<");
  str = str.replace(/>/g, ">");
  str = str.replace(/"/g, "&quot;");
  str = str.replace(/'/g, "&#039;");
  return str;
}

function setStatus(text, meta) {
  els.jobStatus.textContent = text || "";
  els.jobMeta.textContent = meta || "";
}

function badgeClass(result) {
  var v = String(result || "").toLowerCase();

  if (v.indexOf("일치") >= 0 || v === "match" || v === "ok") {
    return "badge badge-ok";
  }
  if (v.indexOf("검토") >= 0 || v.indexOf("warning") >= 0 || v === "review_required") {
    return "badge badge-warn";
  }
  if (v.indexOf("불일치") >= 0 || v.indexOf("critical") >= 0 || v === "mismatch") {
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
  return parsed;
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
      html += '<div class="kv-value">' + escapeHtml(documentKeys[key]) + "</div>";
      html += "</div>";
    }
  }

  els.documentKeys.innerHTML = html || "결과 없음";
}

function renderIssues(data) {
  var html = "";
  var rows = data && data.comparison_table ? data.comparison_table : [];
  var i;
  var row;
  var result;
  var isIssue;

  if (rows && rows.length) {
    for (i = 0; i < rows.length; i += 1) {
      row = rows[i];
      result = String(row.result || "");
      isIssue =
        result.indexOf("불일치") >= 0 ||
        result.indexOf("검토") >= 0 ||
        result.toLowerCase().indexOf("warning") >= 0 ||
        result.toLowerCase().indexOf("critical") >= 0;

      if (isIssue) {
        html += '<div class="issue-item">';
        html += '<span class="' + badgeClass(result) + '">' + escapeHtml(result) + "</span>";
        html += '<div class="issue-title">' + escapeHtml(row.check_item || "-") + "</div>";
        html += '<div class="issue-desc">';
        html += "LC: " + escapeHtml(row.lc || "-");
        html += " / Invoice: " + escapeHtml(row.invoice || "-");
        html += " / B/L: " + escapeHtml(row.bill_of_lading || row.bl || "-");
        html += " / Packing List: " + escapeHtml(row.packing_list || "-");
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
    html += "<td>" + escapeHtml(row.check_item || row.item || "-") + "</td>";
    html += '<td><span class="' + badgeClass(row.result) + '">' + escapeHtml(row.result || "-") + "</span></td>";
    html += "<td>" + escapeHtml(row.lc || "-") + "</td>";
    html += "<td>" + escapeHtml(row.invoice || "-") + "</td>";
    html += "<td>" + escapeHtml(row.bill_of_lading || row.bl || "-") + "</td>";
    html += "<td>" + escapeHtml(row.packing_list || "-") + "</td>";
    html += "<td>" + escapeHtml(row.insurance || "-") + "</td>";
    html += "<td>" + escapeHtml(row.coo || row.certificate_of_origin || "-") + "</td>";
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
  } else if (data.overall_status === "approved") {
    els.overallStatusDesc.textContent = "이상 없음";
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

  if (data.comparison_table) {
    rows = data.comparison_table;
  } else if (data.comparison_results) {
    rows = data.comparison_results;
  } else if (data.check_results) {
    rows = data.check_results;
  }

  renderComparisonTable(rows);
}

function loadConfig() {
  return fetch("./config.json")
    .then(function (res) {
      if (!res.ok) {
        throw new Error("config.json 로드 실패");
      }
      return res.json();
    })
    .then(function (json) {
      CONFIG = json;

      if (CONFIG.defaultApiKey) {
        els.apiKey.value = CONFIG.defaultApiKey;
      }
    });
}

function uploadFile(apiKey, file) {
  var form = new FormData();
  form.append("file", file);
  form.append("purpose", "user_data");

  return fetch(CONFIG.baseUrl + "/files", {
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


function createJob(apiKey, fileId, configId) {
  var body = {
    model: CONFIG.agentId,
    include: ["last"],
    file_ids: [fileId]
  };

  if (configId && configId.replace(/\s/g, "") !== "") {
    body.config_id = configId;
  }

  return fetch(CONFIG.baseUrl + "/responses", {
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
  return fetch(CONFIG.baseUrl + "/responses/" + encodeURIComponent(jobId) + "?include[]=last", {
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
        .catch(function (error) {
          reject(error);
        });
    }

    loop();
  });
}

function runWorkflow() {
  var apiKey = els.apiKey.value.replace(/^\s+|\s+\$/g, "");
  var configId = els.configId.value.replace(/^\s+|\s+\$/g, "");

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
      if (finalJob.status === "failed") {
        els.rawJson.textContent = JSON.stringify(finalJob, null, 2);
        setStatus("실행 실패", "job_id=" + currentJobId);
        alert("실행 실패: Raw JSON을 확인하세요.");
        els.runBtn.disabled = false;
        return;
      }

      if (!finalJob.output_text) {
        els.rawJson.textContent = JSON.stringify(finalJob, null, 2);
        setStatus("완료되었지만 output_text 없음", "job_id=" + currentJobId);
        els.runBtn.disabled = false;
        return;
      }

      var parsed = JSON.parse(finalJob.output_text);
      renderResult(parsed);
      setStatus("완료", "job_id=" + currentJobId);
      els.runBtn.disabled = false;
    })
    .catch(function (error) {
      console.error(error);
      setStatus("오류 발생", "");
      alert(error.message || "오류가 발생했습니다.");
      els.runBtn.disabled = false;
    });
}

function fillSample() {
  var sample = {
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

  loadConfig()
    .then(function () {
      bindFileEvents();
      els.runBtn.addEventListener("click", runWorkflow);
      els.sampleBtn.addEventListener("click", fillSample);
      els.clearBtn.addEventListener("click", clearResult);
      clearResult();
    })
    .catch(function (error) {
      console.error(error);
      alert("초기화 실패: " + error.message);
    });
}

document.addEventListener("DOMContentLoaded", init);
