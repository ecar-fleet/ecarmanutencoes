function normSpaces(s: string) {
  return s.replace(/\u00a0/g, " ").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string[]> {
  // dynamic import to avoid TypeScript module resolution issues in some setups
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf");
  // Try to set a workerSrc. Importing the worker entry can fail depending on package layout
  // so we fallback to using a CDN worker URL constructed from the library version when available.
  // Try to set workerSrc or create a PDFWorker instance as fallback.
  // Prefer a local worker served from /pdf.worker.min.mjs or /pdf.worker.min.js. Copy it from node_modules with the helper script
  const workerCandidates = ['/pdf.worker.min.js', '/pdf.worker.min.mjs', '/pdf.worker.mjs', '/pdf.worker.js'];
  let workerUrl = workerCandidates.find(u => true); // we'll try candidates in order at runtime

  let workerInstance: any | undefined = undefined;
  try {
    // Try to set GlobalWorkerOptions (may be read-only in module namespace)
    try {
      if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
        // Some builds export GlobalWorkerOptions as writable object
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerCandidates[0];
      }
    } catch (e) {
      // ignore
    }

    // If PDFWorker constructor exists we can create an instance bound to the local worker
    if (pdfjsLib && typeof pdfjsLib.PDFWorker === 'function') {
      try {
        // try several worker file names until one works
        for (const candidate of workerCandidates) {
          try {
            workerInstance = new pdfjsLib.PDFWorker({ url: candidate });
            // if created without throwing, stop
            break;
          } catch (e) {
            // try next candidate
          }
        }
      } catch (e) {
        // ignore; fallback to GlobalWorkerOptions
      }
    }
  } catch (e) {
    console.warn('pdfParser: could not setup local pdf worker', e);
  }

  const loadingTask = pdfjsLib.getDocument(workerInstance ? { data: arrayBuffer, worker: workerInstance } : { data: arrayBuffer });
  const doc = await loadingTask.promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((it: any) => (it.str ? it.str : ""));
    pages.push(strings.join(" "));
  }
  return pages.map(p => normSpaces(p));
}

function findFirst(pat: RegExp | string, text: string) {
  const re = typeof pat === "string" ? new RegExp(pat, "i") : pat;
  const m = re.exec(text);
  return m && m[1] ? m[1].trim() : null;
}

export function parsePdfTexts(texts: string[]) {
  const raw = texts.join("\n");
  const t = raw.replace(/\s+/g, " ");
  // Try template-based parsing for known vendors (e.g., Bosch)
  const lower = t.toLowerCase();

  // BOSCH preventive order template
  if (lower.includes("bosch") || lower.includes("ordem bosch") || lower.includes("preventiva")) {
    const placa = findFirst(/PLACA:\s*([A-Z0-9\-]{4,8})/i, t) || findFirst(/Ve[íi]culo:\s*([A-Z0-9\-]+)/i, t);
    const marca = findFirst(/Marca[:\s]*([A-Za-z0-9\-]+)/i, t) || null;
    const modelo = findFirst(/Modelo[:\s]*([A-Za-z0-9 \-\.]+)/i, t) || findFirst(/Ve[íi]culo:\s*[A-Z0-9\-]+\s*-\s*([A-Za-z0-9 \-\.]+)/i, t) || null;
    const ano = findFirst(/Ano[:\s]*([0-9]{4})/i, t) || null;
    const km = findFirst(/KM:?\s*([0-9\.,]+)/i, t) || findFirst(/Hod[oô]metro:?\s*([0-9\.,]+)/i, t) || null;
    const chassi = findFirst(/CHASSI:?\s*([A-Z0-9]+)/i, t) || null;

    const tipo_ordem = findFirst(/(Preventiva|Corretiva|Preventiva)/i, t) || null;
    const situacao = findFirst(/Situa[cç][aã]o:?\s*([A-Za-z0-9 \-]+)/i, t) || findFirst(/Status:?\s*([A-Za-z0-9 \-]+)/i, t) || null;
    const colaborador = findFirst(/Colaborador:?\s*([A-Za-z\s\-\.]+)/i, t) || null;

    // Items: try to capture lines with description and numeric totals
    const itens: any[] = [];
    // split into lines heuristically
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      // look for patterns like: description ... valor_total
      const itemMatch = /(.+?)\s+(?:R\$\s*)?([0-9]+[\.,][0-9]{2})\s*$/.exec(line);
      if (itemMatch) {
        const desc = itemMatch[1].replace(/\s{2,}/g, ' ').trim();
        const val = itemMatch[2].replace(/\./g, '').replace(/,/g, '.');
        const num = Number(val);
        if (!Number.isNaN(num)) {
          itens.push({ descricao: desc, valor_total: num });
        }
      }
    }

    // Totals: try to get peças, serviços and os_total
    const pecas = findFirst(/Pe[cç]as?:?\s*R\$\s*([0-9\.,]+)/i, t) || findFirst(/pecas[:\s]*([0-9\.,]+)/i, t) || null;
    const servicos = findFirst(/Serv[ií]cos?:?\s*R\$\s*([0-9\.,]+)/i, t) || findFirst(/servi[cç]os[:\s]*([0-9\.,]+)/i, t) || null;
    const os_total = findFirst(/Total\s*da\s*OS:?\s*R\$\s*([0-9\.,]+)/i, t) || findFirst(/os_total[:\s]*R\$?\s*([0-9\.,]+)/i, t) || null;

    function numOrNull(s: any) {
      if (!s) return null;
      const n = Number(String(s).replace(/\./g, '').replace(/,/g, '.'));
      return Number.isFinite(n) ? n : null;
    }

    return {
      source_type: "bosch_preventiva",
      veiculo: {
        placa: placa || null,
        marca: marca || null,
        modelo: modelo || null,
        ano: ano || null,
        km_atual: km || null,
        chassi: chassi || null,
      },
      tipo_ordem_servico: tipo_ordem || null,
      situacao: situacao || null,
      colaborador: colaborador || null,
      os_referencia: null,
      itens_previstos: itens,
      totais: {
        pecas: numOrNull(pecas),
        servicos: numOrNull(servicos),
        os_total: numOrNull(os_total),
      },
      raw_text: t,
    };
  }

  // Fallback generic parsing
  const placa = findFirst(/PLACA:\s*([A-Z0-9\-]{5,7})/i, t) || findFirst(/Ve[íi]culo:\s*([A-Z0-9\-]+)/i, t);
  const modelo = findFirst(/MODELO\s*VE[ÍI]CULO:\s*([A-Za-z0-9 \-\.]+)/i, t) || findFirst(/Modelo:\s*([A-Za-z0-9 \-]+)/i, t) || findFirst(/Ve[íi]culo:\s*[A-Z0-9\-]+\s*-\s*([A-Z0-9 ]+)/i, t);
  const ano = findFirst(/Ano:\s*([0-9]{4})/i, t) || findFirst(/ANO\s*VE[ÍI]CULO:\s*([0-9]{4})/i, t);
  const km = findFirst(/KM:?\s*([0-9\.,]+)/i, t) || findFirst(/Quilometragem do Ve[íi]culo:\s*([0-9\.,]+)/i, t) || findFirst(/KM\s*ATUAL:\s*([0-9\.,]+)/i, t);
  const chassi = findFirst(/CHASSI:?\s*([A-Z0-9]+)/i, t);

  // Totais simples
  const totalOS = findFirst(/Total\s*da\s*OS:\s*R\$\s*([0-9\.,]+)/i, t) || findFirst(/os_total\s*R\$\s*([0-9\.,]+)/i, t);

  return {
    source_type: "parsed_pdf",
    veiculo: {
      placa: placa || null,
      modelo: modelo || null,
      ano: ano || null,
      km_atual: km || null,
      chassi: chassi || null,
    },
    totais: {
      os_total: totalOS || null,
    },
    raw_text: t,
  };
}

export default { extractTextFromPdf, parsePdfTexts };
