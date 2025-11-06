import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

export const ExcelUploader = ({ onUploadComplete }: { onUploadComplete: () => void }) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls)",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast({
          title: "Arquivo vazio",
          description: "O arquivo Excel não contém dados",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      const columns = Object.keys(jsonData[0] as object);

      const { data: uploadData, error: uploadError } = await supabase
        .from("excel_uploads")
        .insert({
          file_name: file.name,
          columns: columns,
          row_count: jsonData.length,
        })
        .select()
        .single();

      if (uploadError) throw uploadError;

      const rowsToInsert = jsonData.map((row, index) => ({
        upload_id: uploadData.id,
        row_index: index,
        data: row as Record<string, any>,
      }));

      const { error: dataError } = await supabase
        .from("excel_data")
        .insert(rowsToInsert);

      if (dataError) throw dataError;

      toast({
        title: "Sucesso!",
        description: `Arquivo ${file.name} importado com ${jsonData.length} linhas`,
      });

      onUploadComplete();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erro ao importar",
        description: "Ocorreu um erro ao processar o arquivo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <Card className="p-6 bg-card shadow-medium hover:shadow-strong transition-smooth">
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-primary/10">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Importar Excel</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Carregue seus arquivos Excel para análise
          </p>
        </div>
        <label htmlFor="excel-upload">
          <Button
            variant="default"
            disabled={uploading}
            className="cursor-pointer"
            asChild
          >
            <span>
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Processando..." : "Selecionar Arquivo"}
            </span>
          </Button>
        </label>
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
      </div>
    </Card>
  );
};
