import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, GitCompare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import pdfParser from "@/lib/pdfParser";
import { comparePdfToExcel } from "@/lib/comparator";
import { DifferencesViewer } from "./DifferencesViewer";

interface ExcelUpload {
  id: string;
  file_name: string;
}

export const PDFComparator = ({ onComparisonComplete }: { onComparisonComplete: () => void }) => {
  const [uploading, setUploading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [selectedExcel, setSelectedExcel] = useState<string>("");
  const [excelUploads, setExcelUploads] = useState<ExcelUpload[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [columnOptions, setColumnOptions] = useState<string[]>([]);
  const [mapModelo, setMapModelo] = useState<string>("");
  const [mapPlaca, setMapPlaca] = useState<string>("");
  const [mapAno, setMapAno] = useState<string>("");
  const [mapKm, setMapKm] = useState<string>("");
  const [mapChassi, setMapChassi] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchExcelUploads();
  }, []);

  const fetchExcelUploads = async () => {
    try {
      const { data, error } = await supabase
        .from("excel_uploads")
        .select("id, file_name")
        .order("upload_date", { ascending: false });

      if (error) throw error;
      setExcelUploads(data || []);
    } catch (error) {
      console.error("Error fetching excel uploads:", error);
    }
  };

  // Fetch column options when a specific upload is selected
  useEffect(() => {
    const loadColumns = async () => {
      if (!selectedExcel) {
        setColumnOptions([]);
        setMapModelo("");
        setMapPlaca("");
        return;
      }

      try {
        const { data: uploadInfo, error } = await supabase
          .from("excel_uploads")
          .select("columns")
          .eq("id", selectedExcel)
          .single();

        if (error) throw error;
        const cols = uploadInfo?.columns || [];
        setColumnOptions(cols);

        // set defaults according to preferred names if present (based on your provided columns)
        const defaultModelo = cols.find((c: string) => c.toLowerCase() === "modelo do veículo") || "";
        // prefer mapping Placa -> 'Veículo' if present (some sheets have both 'Placa' and 'Veículo')
        const defaultPlaca = cols.find((c: string) => c.toLowerCase() === "veículo") || cols.find((c: string) => c.toLowerCase() === "placa") || "";
        // Hodômetro is used for km
        const defaultKm = cols.find((c: string) => {
          const l = c.toLowerCase();
          return l.includes("hod") || l.includes("hodomet") || l.includes("km") || l.includes("quilom");
        }) || "";
        const defaultAno = cols.find((c: string) => c.toLowerCase() === "ano") || "";
        const defaultChassi = cols.find((c: string) => c.toLowerCase().includes("chassi")) || "";

        setMapModelo(defaultModelo || "");
        setMapPlaca(defaultPlaca || "");
        setMapKm(defaultKm || "");
        setMapAno(defaultAno || "");
        setMapChassi(defaultChassi || "");
      } catch (err) {
        console.error("Error loading columns:", err);
      }
    };
    loadColumns();
  }, [selectedExcel]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo PDF",
        variant: "destructive",
      });
      return;
    }

    setPdfFile(file);
    toast({
      title: "PDF selecionado",
      description: `${file.name} está pronto para comparação`,
    });
  };

  const handleCompare = async () => {
    if (!pdfFile || !selectedExcel) {
      toast({
        title: "Seleção incompleta",
        description: "Por favor, selecione um PDF e um arquivo Excel do histórico",
        variant: "destructive",
      });
      return;
    }

    setComparing(true);

    try {
      // Parse PDF in the browser
      const arrayBuffer = await pdfFile.arrayBuffer();
      const texts = await pdfParser.extractTextFromPdf(arrayBuffer);
      const parsed = pdfParser.parsePdfTexts(texts);

      // Fetch Excel data and columns
      const { data: uploadInfo, error: uploadErr } = await supabase
        .from("excel_uploads")
        .select("columns, file_name")
        .eq("id", selectedExcel)
        .single();

      if (uploadErr) throw uploadErr;

      const { data: excelDataRows, error: excelError } = await supabase
        .from("excel_data")
        .select("data")
        .eq("upload_id", selectedExcel);

      if (excelError) throw excelError;

      const excelRows = (excelDataRows || []).map((r: any) => r.data || {});
      const columns = uploadInfo?.columns || [];

      const columnMapping: Record<string,string> = {};
      if (mapModelo) columnMapping["modelo"] = mapModelo;
      if (mapPlaca) columnMapping["placa"] = mapPlaca;
      if (mapAno) columnMapping["ano"] = mapAno;
      if (mapKm) columnMapping["km_atual"] = mapKm;
      if (mapChassi) columnMapping["chassi"] = mapChassi;

      const differences = comparePdfToExcel(parsed, excelRows, columns, columnMapping);

      // Show differences viewer for user to inspect and optionally accept/edit before persisting
      setCurrentDifferences({ differences, parsedPdf: parsed, pdfName: pdfFile.name, excelName: uploadInfo?.file_name || "Excel", selectedExcelId: selectedExcel });
      setIsDifferencesOpen(true);
    } catch (error: any) {
      // Show detailed error in console and toast to help debugging
      console.error("Error comparing files:", error);
      let message = "Ocorreu um erro ao comparar os arquivos";
      try {
        if (error?.message) message = error.message;
        else if (typeof error === "string") message = error;
        else message = JSON.stringify(error);
      } catch (e) {
        message = String(error);
      }

      toast({
        title: "Erro na comparação",
        description: message,
        variant: "destructive",
      });
    } finally {
      setComparing(false);
    }
  };

  // Differences viewer state
  const [isDifferencesOpen, setIsDifferencesOpen] = useState(false);
  const [currentDifferences, setCurrentDifferences] = useState<any>(null);

  const handleAcceptComparison = async (acceptedRow?: any) => {
    if (!currentDifferences) return;
    setComparing(true);
    try {
      // Persist PDF metadata
      const { data: pdfData, error: pdfError } = await supabase
        .from("pdf_uploads")
        .insert({ file_name: pdfFile?.name || currentDifferences.pdfName, parsed_content: JSON.stringify(currentDifferences.parsedPdf) })
        .select()
        .single();

      if (pdfError) throw pdfError;

      const payload = {
        pdf_id: pdfData.id,
        excel_id: currentDifferences.selectedExcelId,
        differences: currentDifferences.differences,
        accepted_row: acceptedRow || currentDifferences.differences.best_row_data || null,
      };

      const { error: compError } = await supabase
        .from("comparisons")
        .insert(payload)
        .select();

      if (compError) throw compError;

      toast({ title: "Comparação salva", description: "A comparação foi salva no histórico" });
      setIsDifferencesOpen(false);
      setCurrentDifferences(null);
      setPdfFile(null);
      setSelectedExcel("");
      onComparisonComplete();
    } catch (err: any) {
      console.error("Error saving accepted comparison:", err);
      toast({ title: "Erro ao salvar", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setComparing(false);
    }
  };

  return (
    <>
    <Card className="p-6 bg-card shadow-medium hover:shadow-strong transition-smooth">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-secondary/10">
            <GitCompare className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Comparar PDF com Excel</h3>
            <p className="text-sm text-muted-foreground">
              Identifique diferenças entre documentos
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {columnOptions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Mapear Campo Modelo (PDF)</label>
                <Select value={mapModelo} onValueChange={setMapModelo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha coluna do Excel para Modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Mapear Campo Placa (PDF)</label>
                <Select value={mapPlaca} onValueChange={setMapPlaca}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha coluna do Excel para Placa" />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Mapear Ano</label>
                <Select value={mapAno} onValueChange={setMapAno}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha coluna do Excel para Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Mapear Km</label>
                <Select value={mapKm} onValueChange={setMapKm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha coluna do Excel para Km" />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Mapear Chassi</label>
                <Select value={mapChassi} onValueChange={setMapChassi}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha coluna do Excel para Chassi" />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Selecionar Excel do Histórico
            </label>
            <Select value={selectedExcel} onValueChange={setSelectedExcel}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um arquivo Excel" />
              </SelectTrigger>
              <SelectContent>
                {excelUploads.map((upload) => (
                  <SelectItem key={upload.id} value={upload.id}>
                    {upload.file_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Carregar PDF para Comparar
            </label>
            <div className="flex gap-2">
              <label htmlFor="pdf-upload" className="flex-1">
                <Button
                  variant="outline"
                  disabled={uploading}
                  className="w-full cursor-pointer"
                  asChild
                >
                  <span>
                    <FileText className="mr-2 h-4 w-4" />
                    {pdfFile ? pdfFile.name : "Selecionar PDF"}
                  </span>
                </Button>
              </label>
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
          </div>

          <Button
            onClick={handleCompare}
            disabled={!pdfFile || !selectedExcel || comparing}
            className="w-full bg-gradient-success hover:opacity-90"
            size="lg"
          >
            <Upload className="mr-2 h-4 w-4" />
            {comparing ? "Comparando..." : "Comparar Documentos"}
          </Button>
        </div>
      </div>
    </Card>
    {currentDifferences && (
      <DifferencesViewer
        differences={currentDifferences.differences}
        parsedPdf={currentDifferences.parsedPdf}
        pdfName={currentDifferences.pdfName}
        excelName={currentDifferences.excelName}
        isOpen={isDifferencesOpen}
        onClose={() => setIsDifferencesOpen(false)}
        onAccept={(editedRow?: any) => handleAcceptComparison(editedRow)}
      />
    )}
    </>
  );
};
