import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExcelDataViewerProps {
  uploadId: string | null;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelDataViewer = ({ uploadId, fileName, isOpen, onClose }: ExcelDataViewerProps) => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (uploadId && isOpen) {
      fetchData();
    }
  }, [uploadId, isOpen]);

  const fetchData = async () => {
    if (!uploadId) return;
    
    setLoading(true);
    try {
      const { data: uploadData, error: uploadError } = await supabase
        .from("excel_uploads")
        .select("columns")
        .eq("id", uploadId)
        .single();

      if (uploadError) throw uploadError;

      const { data: rowData, error: dataError } = await supabase
        .from("excel_data")
        .select("data, row_index")
        .eq("upload_id", uploadId)
        .order("row_index");

      if (dataError) throw dataError;

      setColumns(uploadData.columns);
      setData(rowData.map(row => row.data));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do arquivo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{fileName}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando dados...</div>
        ) : (
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col, idx) => (
                    <TableHead key={idx}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {columns.map((col, colIdx) => (
                      <TableCell key={colIdx}>{row[col]?.toString() || ""}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
