function normalize(v: any) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (s === "") return null;
  return s;
}

function numeric(v: any) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(/,/g, ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function comparePdfToExcel(parsedPdf: any, excelRows: any[], columns: string[], columnMapping?: Record<string, string>) {
  const keys = ["placa", "modelo", "ano", "km_atual", "chassi"];

  // Map candidate column keys in Excel to standard keys
  const colMap: Record<string, string> = {};

  // If a mapping was provided by the user, prefer those explicit mappings
  if (columnMapping) {
    Object.entries(columnMapping).forEach(([k, v]) => {
      if (v && columns.find(c => c.toLowerCase() === v.toLowerCase())) {
        colMap[k] = columns.find(c => c.toLowerCase() === v.toLowerCase()) as string;
      }
    });
  }

  // Fallback heuristics for columns not covered by mapping
  columns.forEach((col) => {
    const lower = col.toLowerCase();
    if (!colMap["placa"] && lower.includes("placa")) colMap["placa"] = col;
    if (!colMap["modelo"] && (lower.includes("modelo") || lower.includes("carro") || lower.includes("veiculo"))) colMap["modelo"] = col;
    if (!colMap["ano"] && lower.includes("ano")) colMap["ano"] = col;
  if (!colMap["km_atual"] && (lower.includes("km") || lower.includes("quilom") || lower.includes("hod") || lower.includes("hodomet"))) colMap["km_atual"] = col;
    if (!colMap["chassi"] && lower.includes("chassi")) colMap["chassi"] = col;
  });

  const results: any[] = [];

  for (let i = 0; i < excelRows.length; i++) {
    const row = excelRows[i];
    let totalScore = 0;
    const mismatches: any[] = [];
    const fieldScores: Record<string, any> = {};

    keys.forEach((k) => {
      const col = colMap[k];
      const excelVal = col ? normalize(row[col]) : null;
      const pdfVal = normalize(parsedPdf.veiculo?.[k]);

      // default per-field weightings (max possible per field)
      let weight = 0;
      let fieldScore = 0;
      let matched = false;

      if (k === "placa") weight = 5;
      else if (k === "modelo") weight = 3;
      else if (k === "ano") weight = 2;
      else if (k === "km_atual") weight = 1;
      else if (k === "chassi") weight = 2;

      if (excelVal && pdfVal) {
        if (k === "placa") {
          matched = String(excelVal).toUpperCase() === String(pdfVal).toUpperCase();
          fieldScore = matched ? weight : 0;
          if (!matched) mismatches.push({ field: "placa", excel_value: excelVal, pdf_value: pdfVal });
        } else if (k === "modelo") {
          const a = String(pdfVal).toLowerCase();
          const b = String(excelVal).toLowerCase();
          matched = a.includes(b) || b.includes(a);
          fieldScore = matched ? weight : 0;
          if (!matched) mismatches.push({ field: "modelo", excel_value: excelVal, pdf_value: pdfVal });
        } else if (k === "ano") {
          matched = String(excelVal) === String(pdfVal);
          fieldScore = matched ? weight : 0;
          if (!matched) mismatches.push({ field: "ano", excel_value: excelVal, pdf_value: pdfVal });
        } else if (k === "km_atual") {
          const ev = numeric(excelVal);
          const pv = numeric(pdfVal);
          if (ev !== null && pv !== null) {
            const diff = Math.abs(ev - pv) / Math.max(1, ev);
            matched = diff < 0.1; // within 10%
            fieldScore = matched ? weight : 0;
            if (!matched) mismatches.push({ field: "km_atual", excel_value: excelVal, pdf_value: pdfVal });
          }
        } else if (k === "chassi") {
          matched = String(excelVal).toUpperCase() === String(pdfVal).toUpperCase();
          fieldScore = matched ? weight : 0;
          if (!matched) mismatches.push({ field: "chassi", excel_value: excelVal, pdf_value: pdfVal });
        }
      }

      totalScore += fieldScore;
      fieldScores[k] = { score: fieldScore, max: weight, matched };
    });

    results.push({ row_index: i, totalScore, mismatches, row, fieldScores });
  }

  results.sort((a, b) => b.totalScore - a.totalScore);
  const best = results[0] || null;

  const sample_differences = (best && best.mismatches.length > 0) ? best.mismatches.slice(0, 10) : [];

  return {
    total_excel_rows: excelRows.length,
    best_match_row_index: best ? best.row_index : null,
    best_row_data: best ? best.row : null,
    match_score: best ? best.totalScore : 0,
    comparison_note: best ? `Melhor correspondência na linha ${best.row_index + 1} (score ${best.totalScore})` : "Nenhuma correspondência encontrada",
    sample_differences,
    field_scores: best ? best.fieldScores : {},
  };
}

export default { comparePdfToExcel };
