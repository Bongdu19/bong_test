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

function trimValue(value) {
  return String(value == null ? "" : value).replace(/^\s+|\s+\$/g, "");
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
        html += " / B/L: " + escapeHtml(row.bill_of_lading || "-");
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
    html += "<td>" + escapeHtml(row.check_item || "-") + "</td>";
    html += '<td><span class="' + badgeClass(row.result) + '">' + escapeHtml(row.result || "-") + "</span></td>";
    html += "<td>" + escapeHtml(row.lc || "-") + "</td>";
    html += "<td>" + escapeHtml(row.invoice || "-") + "</td>";
    html += "<td>" + escapeHtml(row.bill_of_lading || "-") + "</td>";
    html += "<td>" + escapeHtml(row.packing_list || "-") + "</td>";
    html += "<td>" + escapeHtml(row.insurance || "-") + "</td>";
    html += "<td>" + escapeHtml(row.coo || "-") + "</td>";
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
  } else if (data.overall_status === "rejected") {
    els.overallStatusDesc.textContent = "반려";
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
  rows = data.comparison_table || [];
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

  // 필요 시 config에서 purpose를 바꿀 수 있게 함
  form.append("purpose", CONFIG.filePurpose || "user_data");

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

  console.log("createJob request body", JSON.stringify(body, null, 2));

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

      console.log("uploaded file response", uploaded);
      console.log("uploaded file id", uploadedFileId);

      els.fileInfo.innerHTML =
        "<strong>" + escapeHtml(selectedFile.name) + "</strong><br>" +
        '<span class="meta-text">file_id=' + escapeHtml(uploadedFileId) + "</span>";

      setStatus("Job 생성 중...", "file_id=" + uploadedFileId);
      return createJob(apiKey, uploadedFileId, configId);
    })
    .then(function (job) {
      currentJobId = job.id;
      console.log("job created", job);
      setStatus("실행 중...", "job_id=" + currentJobId);
      return pollJob(apiKey, currentJobId);
    })
    .then(function (finalJob) {
      var rawText;
      var parsed;

      console.log("final job", finalJob);
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
      setStatus("오류 발생", "");

      if (String(error.message || "").indexOf("No access to file") >= 0) {
        alert(
          "업로드된 file_id를 현재 에이전트 실행에서 바로 사용할 수 없어 403이 발생했습니다.\n" +
          "이 경우 파일 업로드 목적값 또는 실행 방식이 현재 API/에이전트 컨텍스트와 맞지 않습니다."
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
