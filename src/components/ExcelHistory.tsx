import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ExcelUpload {
  id: string;
  file_name: string;
  upload_date: string;
  columns: string[];
  row_count: number;
}

export const ExcelHistory = ({ 
  refreshTrigger, 
  onViewData 
}: { 
  refreshTrigger: number;
  onViewData: (uploadId: string, fileName: string) => void;
}) => {
  const [uploads, setUploads] = useState<ExcelUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUploads = async () => {
    try {
      const { data, error } = await supabase
        .from("excel_uploads")
        .select("*")
        .order("upload_date", { ascending: false });

      if (error) throw error;
      setUploads(data || []);
    } catch (error) {
      console.error("Error fetching uploads:", error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar os arquivos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, [refreshTrigger]);

  const handleDelete = async (id: string, fileName: string) => {
    try {
      const { error } = await supabase
        .from("excel_uploads")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Arquivo removido",
        description: `${fileName} foi excluído do histórico`,
      });

      fetchUploads();
    } catch (error) {
      console.error("Error deleting upload:", error);
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível remover o arquivo",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Carregando histórico...</p>
      </Card>
    );
  }

  if (uploads.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum arquivo importado ainda</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-medium">
      <h3 className="text-xl font-semibold text-foreground mb-4">Histórico de Importações</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome do Arquivo</TableHead>
              <TableHead>Data de Upload</TableHead>
              <TableHead>Linhas</TableHead>
              <TableHead>Colunas</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uploads.map((upload) => (
              <TableRow key={upload.id}>
                <TableCell className="font-medium">{upload.file_name}</TableCell>
                <TableCell>{format(new Date(upload.upload_date), "dd/MM/yyyy HH:mm")}</TableCell>
                <TableCell>{upload.row_count}</TableCell>
                <TableCell>{upload.columns.length}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewData(upload.id, upload.file_name)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Dados
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(upload.id, upload.file_name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
