"use strict";

const WRAPPER_SIZE = 16;
const NAME_COUNT_OFFSET = 0x4d8;
const NAME_TABLE_OFFSET = 0x4e0;

const fileInput = document.querySelector("#save-file");
const dropzone = document.querySelector("#dropzone");
const fixButton = document.querySelector("#fix-button");
const downloadLink = document.querySelector("#download-link");
const statusText = document.querySelector("#status");
const statusDot = document.querySelector("#status-dot");
const logEl = document.querySelector("#log");

let selectedFile = null;
let selectedBytes = null;

const creativeFlags = [
  "bAchievementProgressionDisabled",
  "bIsIndividualDedicatedServerGame",
  "bCreativeModeActive",
  "bCreativeAllCatalogItemsUnlocked",
  "bCreativeFreeOxygenOn",
  "bCreativeFreeFuelOn",
  "bCreativeInvisibleToHazardsOn",
  "bCreativeInvincibleOn",
  "bCreativeUnlimitedBackpackPowerOn",
  "bCreativeRemoveDecoratorsWhilePainting",
  "bCreativeTerrainBrushLightActive",
  "bCreativeShowLODAnchorRangeVisualization",
  "bCreativeDisableCollectResourcesWhileDeforming",
  "bShowCreativeDroneUI",
];

function setStatus(message, state = "") {
  statusText.textContent = message;
  statusDot.className = `status-dot ${state}`.trim();
}

function log(lines) {
  logEl.textContent = Array.isArray(lines) ? lines.join("\n") : lines;
}

function readU32(view, offset) {
  return view.getUint32(offset, true);
}

function readI32(view, offset) {
  return view.getInt32(offset, true);
}

function writeU32(view, offset, value) {
  view.setUint32(offset, value, true);
}

function decodeAscii(bytes, start, length) {
  return new TextDecoder("utf-8").decode(bytes.subarray(start, start + length));
}

function indexOfBytes(haystack, needle, start = 0) {
  outer: for (let i = start; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function parseNames(raw) {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const count = readI32(view, NAME_COUNT_OFFSET);
  if (count <= 0 || count > 1_000_000) throw new Error(`Некорректное число имён: ${count}`);

  const names = [];
  const warnings = [];
  let pos = NAME_TABLE_OFFSET;

  for (let i = 0; i < count; i++) {
    const len = readI32(view, pos);
    pos += 4;
    if (len <= 0 || len > 10000 || pos + len > raw.length) {
      warnings.push(`Таблица имён остановлена на записи ${i}; нужные поля уже прочитаны.`);
      break;
    }

    names.push(decodeAscii(raw, pos, len - 1));
    pos += len;
  }

  return {
    names,
    warnings,
    indexByName: new Map(names.map((name, index) => [name, index])),
  };
}

function findNameHits(raw, namesInfo, name, start = 0) {
  const index = namesInfo.indexByName.get(name);
  if (index === undefined) return [];

  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const hits = [];
  for (let pos = start; pos <= raw.length - 4; pos++) {
    if (readU32(view, pos) === index) hits.push(pos);
  }
  return hits;
}

function setByte(raw, offset, value, label, changes) {
  if (offset < 0 || offset >= raw.length) {
    changes.push(`${label}: пропущено, адрес вне файла`);
    return;
  }
  const old = raw[offset];
  raw[offset] = value;
  changes.push(`${label}: 0x${offset.toString(16)} ${old} -> ${value}${old === value ? " (уже было)" : ""}`);
}

function setFirstBoolByName(raw, namesInfo, name, value, changes) {
  const hit = findNameHits(raw, namesInfo, name).find((pos) => {
    const valueOffset = pos + 0x10;
    return valueOffset < raw.length && (raw[valueOffset] === 0 || raw[valueOffset] === 1);
  });

  if (hit === undefined) {
    changes.push(`${name}: не найдено`);
    return;
  }

  setByte(raw, hit + 0x10, value, name, changes);
}

function restoreMissionFlag(raw, namesInfo, changes) {
  const managerNeedle = new TextEncoder().encode("AstroMissionsManager");
  const managerOffset = indexOfBytes(raw, managerNeedle);
  if (managerOffset < 0) throw new Error("Не найден AstroMissionsManager.");

  const hit = findNameHits(raw, namesInfo, "bMissionsDisabled", managerOffset).find((pos) => {
    const valueOffset = pos + 0x25;
    return valueOffset < raw.length && (raw[valueOffset] === 0 || raw[valueOffset] === 1);
  });

  if (hit === undefined) throw new Error("Не найден скрытый флаг заданий.");

  setByte(raw, hit + 0x25, 0, "AstroMissionsManager hidden mission flag", changes);
}

function fixedName(name) {
  return name.replace(/\$c/i, "$").replace(/\.savegame$/i, "") + ".fixed.savegame";
}

function fixSave(bytes) {
  if (!window.pako) throw new Error("Библиотека pako ещё не загрузилась.");
  if (bytes.length <= WRAPPER_SIZE) throw new Error("Файл слишком маленький.");

  const wrapped = new Uint8Array(bytes);
  const wrapperView = new DataView(wrapped.buffer, wrapped.byteOffset, wrapped.byteLength);
  const expectedRawSize = readU32(wrapperView, 12);
  const raw = window.pako.inflate(wrapped.subarray(WRAPPER_SIZE));

  if (raw.length !== expectedRawSize) {
    throw new Error(`Размер распаковки не совпал: заголовок ${expectedRawSize}, фактически ${raw.length}.`);
  }
  if (decodeAscii(raw, 0, 4) !== "GVAS") throw new Error("После распаковки не найден GVAS.");

  const namesInfo = parseNames(raw);
  const changes = [...namesInfo.warnings];
  restoreMissionFlag(raw, namesInfo, changes);
  creativeFlags.forEach((flag) => setFirstBoolByName(raw, namesInfo, flag, 0, changes));

  const header = new Uint8Array(wrapped.subarray(0, WRAPPER_SIZE));
  writeU32(new DataView(header.buffer), 12, raw.length);
  const compressed = window.pako.deflate(raw, { level: 6, windowBits: 12 });
  const output = new Uint8Array(header.length + compressed.length);
  output.set(header, 0);
  output.set(compressed, header.length);
  return { output, changes };
}

async function chooseFile(file) {
  selectedFile = file;
  selectedBytes = new Uint8Array(await file.arrayBuffer());
  fixButton.disabled = false;
  downloadLink.hidden = true;
  downloadLink.removeAttribute("href");
  setStatus(`Выбран файл: ${file.name}`, "ready");
  log(`Размер: ${selectedBytes.length.toLocaleString("ru-RU")} байт`);
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files && fileInput.files[0];
  if (file) chooseFile(file).catch(showError);
});

for (const eventName of ["dragenter", "dragover"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  dropzone.addEventListener(eventName, () => dropzone.classList.remove("dragover"));
}

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  const file = event.dataTransfer.files && event.dataTransfer.files[0];
  if (file) chooseFile(file).catch(showError);
});

fixButton.addEventListener("click", () => {
  if (!selectedFile || !selectedBytes) return;
  try {
    const { output, changes } = fixSave(selectedBytes);
    const blob = new Blob([output], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = fixedName(selectedFile.name);
    downloadLink.hidden = false;
    setStatus("Сейв исправлен", "good");
    log(changes);
  } catch (error) {
    showError(error);
  }
});

function showError(error) {
  setStatus("Не удалось обработать файл", "bad");
  log(error && error.message ? error.message : String(error));
}
