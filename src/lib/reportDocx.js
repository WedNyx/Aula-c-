// ── Relatório de Comprovação de Aproveitamento de Aprendizado ──
// Reaproveita o modelo oficial (public/relatorio-modelo.docx, com o cabeçalho/rodapé/assinaturas
// exatamente como o professor mandou) e só preenche: cidade, mês/ano, e um bloco por turma
// (Matutino/Vespertino) com ALUNO/CPF/NOTA/ANEXO de cada aluno, mais 3 fotos por aluno (código,
// o próprio gráfico de "Meu Desempenho" que o aluno já vê na plataforma, e nota da prova)
// anexadas logo abaixo do registro dele.
// Gera um .docx de verdade (editável no Word depois), nunca um PDF travado.

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { PerformanceChart } from "../components/PerformanceChart.jsx";

const MESES_PT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const SATISFACTORY_MIN = 30; // nota mínima pra "Satisfatório" (abaixo disso vira "Insatisfatório")
const MIN_PRESENCAS_SATISFATORIO = 4; // com 2 ou 3 presenças (ou menos) vira "Insatisfatório", mesmo com nota boa

// "Satisfatório" só quando os dois critérios batem: nota mínima E frequência mínima — 2 ou 3
// presenças já derruba pra "Insatisfatório", nota boa sozinha não segura
function computeNota(student) {
  const nota = typeof student.score === "number" ? student.score : 0;
  const presencas = Object.values(student.attendance || {}).filter(v => v === "present").length;
  return nota >= SATISFACTORY_MIN && presencas >= MIN_PRESENCAS_SATISFATORIO ? "Satisfatório" : "Insatisfatório";
}

function formatDataAssinatura(d) {
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = MESES_PT[d.getMonth()];
  return `${dia} de ${mes.charAt(0).toUpperCase()}${mes.slice(1)} de ${d.getFullYear()}`;
}
function formatMesAno(d) {
  return `${MESES_PT[d.getMonth()]} de ${d.getFullYear()}`;
}
function escapeXml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;" }[c]));
}

// ── blocos de parágrafo idênticos, em formatação, aos do modelo original (Times New Roman 12pt,
// negrito, espaçamento de linha 360) — só o texto muda ──
const FIELD_PPR = `<w:pPr><w:pStyle w:val="Normal"/><w:tabs><w:tab w:val="clear" w:pos="720"/><w:tab w:val="left" w:pos="3119" w:leader="none"/></w:tabs><w:spacing w:lineRule="auto" w:line="360"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR"/></w:rPr></w:pPr>`;
const FIELD_PPR_CENTER = `<w:pPr><w:pStyle w:val="Normal"/><w:tabs><w:tab w:val="clear" w:pos="720"/><w:tab w:val="left" w:pos="3119" w:leader="none"/></w:tabs><w:spacing w:lineRule="auto" w:line="360"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR"/></w:rPr></w:pPr>`;
const RUN_RPR = `<w:rPr><w:rFonts w:cs="Times New Roman" w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR"/></w:rPr>`;

function fieldPara(text) { return `<w:p>${FIELD_PPR}<w:r>${RUN_RPR}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`; }
function centerPara(text) { return `<w:p>${FIELD_PPR_CENTER}<w:r>${RUN_RPR}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`; }
function blankPara() { return `<w:p>${FIELD_PPR}<w:r>${RUN_RPR}</w:r></w:p>`; }

function imagePara({ rId, id, cx, cy }) {
  return `<w:p><w:pPr><w:spacing w:lineRule="auto" w:line="240"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="Picture ${id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="Picture ${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

// ── 3 "fotos" por aluno, desenhadas em canvas (sem precisar tirar print de tela nenhuma) ──
function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}
function wrapLine(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const out = []; let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth) { out.push(line); line = ch; } else line += ch;
  }
  if (line) out.push(line);
  return out;
}

function drawCodeImage(student) {
  const files = (student.files || []).filter(f => (f.code || "").trim());
  const joined = files.length
    ? files.map(f => `// ===== ${f.name} =====\n${f.code}`).join("\n\n")
    : "(sem código salvo)";
  let lines = joined.split("\n");
  const MAX_LINES = 55;
  let truncatedNote = null;
  if (lines.length > MAX_LINES) { truncatedNote = `… (+${lines.length - MAX_LINES} linhas)`; lines = lines.slice(0, MAX_LINES); }

  const W = 1000, PAD = 24, LH = 20, HEADER_H = 44;
  const ctx0 = makeCanvas(10, 10).getContext("2d");
  ctx0.font = "13px 'Courier New', monospace";
  const wrapped = [];
  lines.forEach(l => wrapped.push(...wrapLine(ctx0, l.replace(/\t/g, "    "), W - PAD * 2)));
  if (truncatedNote) wrapped.push(truncatedNote);
  const H = HEADER_H + PAD + wrapped.length * LH + PAD;

  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#171026"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#231636"; ctx.fillRect(0, 0, W, HEADER_H);
  ctx.fillStyle = "#c084fc"; ctx.font = "bold 15px Arial"; ctx.textBaseline = "middle";
  ctx.fillText(`💻 Código de ${student.name}`, PAD, HEADER_H / 2);
  ctx.font = "13px 'Courier New', monospace"; ctx.textBaseline = "alphabetic";
  wrapped.forEach((l, i) => {
    ctx.fillStyle = l === truncatedNote ? "#776798" : "#e0dcf0";
    ctx.fillText(l, PAD, HEADER_H + PAD + (i + 1) * LH - 6);
  });
  return canvas;
}

// a "foto" das notas das atividades é o PRÓPRIO gráfico de "📊 Meu Desempenho" que o aluno já vê
// na plataforma (mesmo componente, Recharts de verdade) — não uma tabela desenhada à parte.
// Monta o componente escondido fora da tela, espera o Recharts carregar e desenhar o <svg>, e
// serializa esse SVG pra dentro de um canvas (técnica padrão de SVG→PNG via Image + data URI).
async function renderPerformanceChartCanvas(student) {
  const entries = Object.entries(student.scoreHistory || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const CHART_W = 600, CHART_H = 140, HEADER_H = 44, PAD = 20;
  const W = CHART_W + PAD * 2;

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = `${CHART_W}px`;
  container.style.height = `${CHART_H}px`;
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(createElement(PerformanceChart, { entries }));

  let svgEl = null;
  for (let i = 0; i < 60; i++) {
    svgEl = container.querySelector("svg");
    if (svgEl && Number(svgEl.getAttribute("width")) > 0) break;
    await new Promise(r => setTimeout(r, 100));
  }
  // o gráfico entra com animação (animationDuration:700 no Area) — espera terminar antes de tirar
  // a "foto", senão captura a área/linha ainda desenhando pela metade
  if (svgEl) await new Promise(r => setTimeout(r, 850));

  const canvas = makeCanvas(W, HEADER_H + PAD + CHART_H + PAD);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#171026"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#231636"; ctx.fillRect(0, 0, canvas.width, HEADER_H);
  ctx.fillStyle = "#c084fc"; ctx.font = "bold 15px Arial"; ctx.textBaseline = "middle";
  ctx.fillText(`📊 Meu Desempenho — ${student.name}`, PAD, HEADER_H / 2);

  if (svgEl) {
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgDataUrl = `data:image/svg+xml;charset=utf-8;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, PAD, HEADER_H + PAD); resolve(); };
      img.onerror = () => resolve();
      img.src = svgDataUrl;
    });
  } else {
    ctx.fillStyle = "#776798"; ctx.font = "14px Arial";
    ctx.fillText(entries.length ? "Não consegui capturar o gráfico." : "Sem atividades registradas ainda.", PAD, HEADER_H + PAD + 20);
  }

  root.unmount();
  container.remove();
  return canvas;
}

function drawExamImage(student) {
  const W = 480, H = 160;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#231636"; ctx.fillRect(0, 0, W, 44);
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 15px Arial"; ctx.textBaseline = "middle";
  ctx.fillText(`🏆 Nota da prova — ${student.name}`, 20, 22);
  ctx.textAlign = "center";
  if (typeof student.examScore === "number") {
    ctx.fillStyle = "#171026"; ctx.font = "bold 44px Arial";
    ctx.fillText(String(student.examScore), W / 2, H / 2 + 34);
  } else {
    ctx.fillStyle = "#776798"; ctx.font = "16px Arial";
    ctx.fillText("Não fez a prova", W / 2, H / 2 + 20);
  }
  ctx.textAlign = "left";
  return canvas;
}

function canvasToPngBytes(canvas) {
  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// 96dpi: 1px = 9525 EMU. Redimensiona pra caber numa largura de ~5.4in mantendo a proporção.
const TARGET_WIDTH_EMU = 4938000; // ~5.4in
function emuExtentFor(canvas) {
  const cx = TARGET_WIDTH_EMU;
  const cy = Math.round(TARGET_WIDTH_EMU * (canvas.height / canvas.width));
  return { cx, cy };
}

// "Turma Matutina"/"Turma Vespertina" pras 2 turmas de fábrica (mantém o texto de sempre no
// relatório); uma turma extra criada pelo professor usa o próprio nome dela (ex: "Turma Vespertino B")
function turmaLabel(turma) {
  if (turma.id === "matutino") return "Matutina";
  if (turma.id === "vespertino") return "Vespertina";
  return turma.label || turma.id;
}

// ── monta o XML de uma turma inteira (cabeçalho + um bloco por aluno + as 3 fotos de cada) ──
async function buildTurmaXml(turma, students, { cursoTexto, tipoAvaliacao }, imgReg) {
  let xml = "";
  xml += centerPara(`CURSO DE: ${cursoTexto} — Turma ${turmaLabel(turma)}`);
  xml += fieldPara(`TIPO DE AVALIAÇÃO: ${tipoAvaliacao}`);
  xml += blankPara();
  if (!students.length) {
    xml += fieldPara("Nenhum aluno registrado nesta turma neste período.");
    xml += blankPara();
    return xml;
  }
  for (const s of students) {
    const nota = computeNota(s);
    xml += fieldPara(`ALUNO: ${s.name}`);
    xml += fieldPara(`CPF: ${s.cpf || "—"}`);
    xml += fieldPara(`NOTA: ${nota}`);
    xml += fieldPara("ANEXO: Anexo I – Código; Anexo II – Notas das atividades (gráfico de Meu Desempenho); Anexo III – Nota da prova");
    const canvases = [drawCodeImage(s), await renderPerformanceChartCanvas(s), drawExamImage(s)];
    for (const canvas of canvases) {
      const { rId, id } = imgReg.add(canvasToPngBytes(canvas));
      xml += imagePara({ rId, id, ...emuExtentFor(canvas) });
    }
    xml += blankPara();
  }
  xml += blankPara(); xml += blankPara();
  return xml;
}

// registra imagens novas: escolhe rId/nome de arquivo livres e acumula os bytes pra gravar no zip
function makeImageRegistry(startRid, startDocPrId) {
  let rid = startRid, docPrId = startDocPrId;
  const files = []; // { name, bytes }
  const rels = []; // { id, target }
  return {
    add(bytes) {
      const idx = files.length + 1;
      const name = `relatorioImg${idx}.png`;
      files.push({ name, bytes });
      const rId = `rId${rid}`;
      rels.push({ id: rId, target: `media/${name}` });
      rid++;
      const id = docPrId++;
      return { rId, id };
    },
    files, rels,
  };
}

function nextFreeRid(relsXml) {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => Number(m[1]));
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

/**
 * Gera o Relatório de Comprovação de Aproveitamento de Aprendizado em .docx, reaproveitando o
 * modelo oficial (cabeçalho, rodapé, assinaturas — tudo igual), preenchendo cidade/mês e um
 * bloco POR TURMA (todas as turmas ativas, não só matutino/vespertino) com todos os alunos que
 * entraram na plataforma.
 */
export async function generateRelatorioDocx({ city, studentsByShift, turmas, cursoTexto, tipoAvaliacao, when = new Date() }) {
  const JSZip = (await import("jszip")).default;
  const res = await fetch("/relatorio-modelo.docx");
  if (!res.ok) throw new Error("Não consegui carregar o modelo do relatório.");
  const zip = await JSZip.loadAsync(await res.arrayBuffer());

  let documentXml = await zip.file("word/document.xml").async("string");
  let relsXml = await zip.file("word/_rels/document.xml.rels").async("string");

  // usa uma FUNÇÃO como segundo argumento de .replace() em vez de string — se fosse string,
  // sequências como "$&", "$$", "$`", "$'" dentro do nome de um aluno ou da cidade seriam
  // interpretadas como padrões especiais de substituição do JS (mesmo o padrão de busca sendo
  // texto puro, não regex) e corromperiam o XML gerado.
  const cidade = (city || "—").toUpperCase();
  documentXml = documentXml
    .replace("__CIDADE1__", () => escapeXml(cidade))
    .replace("__CIDADE2__", () => escapeXml(cidade))
    .replace("__MESANO__", () => escapeXml(formatMesAno(when)))
    .replace("__DATA_ASSINATURA__", () => escapeXml(formatDataAssinatura(when)));

  const imgReg = makeImageRegistry(nextFreeRid(relsXml), 5000);
  let turmasXml = "";
  for (const turma of turmas) {
    turmasXml += await buildTurmaXml(turma, studentsByShift[turma.id] || [], { cursoTexto, tipoAvaliacao }, imgReg);
  }
  documentXml = documentXml.replace(
    '<w:p><w:pPr><w:pStyle w:val="Normal"/><w:tabs><w:tab w:val="clear" w:pos="720"/><w:tab w:val="left" w:pos="3119" w:leader="none"/></w:tabs><w:spacing w:lineRule="auto" w:line="360"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:cs="Times New Roman" w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR"/></w:rPr><w:t>__TURMAS__</w:t></w:r></w:p>',
    () => turmasXml
  );

  if (imgReg.rels.length) {
    relsXml = relsXml.replace(
      "</Relationships>",
      () => imgReg.rels.map(r => `<Relationship Id="${r.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${r.target}"/>`).join("") + "</Relationships>"
    );
  }

  zip.file("word/document.xml", documentXml);
  zip.file("word/_rels/document.xml.rels", relsXml);
  for (const f of imgReg.files) zip.file(`word/media/${f.name}`, f.bytes);

  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

export function downloadRelatorioDocx(blob, { city, when = new Date() }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = String(city || "cidade").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
  a.href = url;
  a.download = `relatorio-comprovacao-${slug}-${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}.docx`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
