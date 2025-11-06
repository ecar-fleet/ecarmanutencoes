import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, GitCompare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
      // Store PDF info
      const { data: pdfData, error: pdfError } = await supabase
        .from("pdf_uploads")
        .insert({
          file_name: pdfFile.name,
          parsed_content: "PDF content would be parsed here",
        })
        .select()
        .single();

      if (pdfError) throw pdfError;

      // Fetch Excel data
      const { data: excelData, error: excelError } = await supabase
        .from("excel_data")
        .select("data")
        .eq("upload_id", selectedExcel);

      if (excelError) throw excelError;

      // Simple comparison logic - in real scenario, this would be more sophisticated
      const differences = {
        total_excel_rows: excelData.length,
        pdf_file: pdfFile.name,
        comparison_note: "Comparação simplificada - implementar lógica específica conforme necessário",
        sample_differences: [
          { field: "Exemplo", excel_value: "Valor no Excel", pdf_value: "Valor no PDF" }
        ]
      };

      const { error: compError } = await supabase
        .from("comparisons")
        .insert({
          pdf_id: pdfData.id,
          excel_id: selectedExcel,
          differences: differences,
        });

      if (compError) throw compError;

      toast({
        title: "Comparação concluída!",
        description: "Os resultados foram salvos no histórico de comparações",
      });

      setPdfFile(null);
      setSelectedExcel("");
      onComparisonComplete();
    } catch (error) {
      console.error("Error comparing files:", error);
      toast({
        title: "Erro na comparação",
        description: "Ocorreu um erro ao comparar os arquivos",
        variant: "destructive",
      });
    } finally {
      setComparing(false);
    }
  };

  return (
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
  );
};
