import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Clock, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ExcelUpload {
  id: string;
  file_name: string;
  upload_date: string;
  columns: string[];
  row_count: number;
}

interface ExcelData {
  data: Record<string, any>;
  row_index: number;
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
  const [selectedUpload, setSelectedUpload] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<ExcelData[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const { toast } = useToast();

  const fetchUploads = async () => {
    try {
      const { data, error } = await supabase
        .from("excel_uploads")
        .select("*")
        .order("upload_date", { ascending: false });

      if (error) throw error;
      setUploads(data || []);
      
      // Automatically load the most recent upload data
      if (data && data.length > 0) {
        setSelectedUpload(data[0].id);
        fetchUploadData(data[0].id);
      }
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

  const fetchUploadData = async (uploadId: string) => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from("excel_data")
        .select("data, row_index")
        .eq("upload_id", uploadId)
        .order("row_index")
        .limit(100); // Limit to first 100 rows for performance

      if (error) throw error;
      setUploadData((data || []).map(row => ({
        data: row.data as Record<string, any>,
        row_index: row.row_index
      })));
    } catch (error) {
      console.error("Error fetching upload data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do arquivo",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
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

      // Clear selected data if deleting the selected upload
      if (selectedUpload === id) {
        setSelectedUpload(null);
        setUploadData([]);
      }

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

  const handleSelectUpload = (uploadId: string) => {
    setSelectedUpload(uploadId);
    fetchUploadData(uploadId);
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

  const selectedUploadInfo = uploads.find(u => u.id === selectedUpload);
  const columns = selectedUploadInfo?.columns || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 shadow-medium">
        <h3 className="text-xl font-semibold text-foreground mb-4">Histórico de Importações</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Arquivo</TableHead>
                <TableHead className="hidden md:table-cell">Data de Upload</TableHead>
                <TableHead className="hidden sm:table-cell">Linhas</TableHead>
                <TableHead className="hidden lg:table-cell">Colunas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                <TableRow 
                  key={upload.id}
                  className={`cursor-pointer transition-colors ${selectedUpload === upload.id ? 'bg-accent' : ''}`}
                  onClick={() => handleSelectUpload(upload.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {selectedUpload === upload.id && (
                        <Database className="h-4 w-4 text-primary" />
                      )}
                      <span className="truncate max-w-[200px]">{upload.file_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {format(new Date(upload.upload_date), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{upload.row_count}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline">{upload.columns.length}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewData(upload.id, upload.file_name);
                        }}
                        className="hidden sm:flex"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Dados
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewData(upload.id, upload.file_name);
                        }}
                        className="sm:hidden"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(upload.id, upload.file_name);
                        }}
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

      {selectedUpload && (
        <Card className="p-6 shadow-medium animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Dados do Arquivo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedUploadInfo?.file_name} - {uploadData.length} linhas exibidas
              </p>
            </div>
            {uploadData.length >= 100 && (
              <Badge variant="secondary" className="hidden sm:flex bg-warning text-warning-foreground">
                Mostrando primeiras 100 linhas
              </Badge>
            )}
          </div>

          {loadingData ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando dados...
            </div>
          ) : uploadData.length > 0 ? (
            <ScrollArea className="w-full">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {columns.map((col, idx) => (
                        <TableHead key={idx} className="min-w-[150px]">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadData.map((row) => (
                      <TableRow key={row.row_index}>
                        <TableCell className="font-medium text-muted-foreground">
                          {row.row_index + 1}
                        </TableCell>
                        {columns.map((col, colIdx) => (
                          <TableCell key={colIdx}>
                            <span className="line-clamp-2">
                              {row.data[col]?.toString() || "-"}
                            </span>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
