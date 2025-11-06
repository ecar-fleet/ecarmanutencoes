import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Comparison {
  id: string;
  created_at: string;
  pdf_uploads: { file_name: string };
  excel_uploads: { file_name: string };
  differences: any;
}

export const ComparisonHistory = ({ 
  refreshTrigger,
  onViewDifferences 
}: { 
  refreshTrigger: number;
  onViewDifferences: (differences: any, pdfName: string, excelName: string) => void;
}) => {
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchComparisons = async () => {
    try {
      const { data, error } = await supabase
        .from("comparisons")
        .select(`
          *,
          pdf_uploads (file_name),
          excel_uploads (file_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComparisons(data || []);
    } catch (error) {
      console.error("Error fetching comparisons:", error);
      toast({
        title: "Erro ao carregar comparações",
        description: "Não foi possível carregar o histórico de comparações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparisons();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("comparisons")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Comparação removida",
        description: "O registro foi excluído do histórico",
      });

      fetchComparisons();
    } catch (error) {
      console.error("Error deleting comparison:", error);
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível remover a comparação",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Carregando comparações...</p>
      </Card>
    );
  }

  if (comparisons.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma comparação realizada ainda</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-medium">
      <h3 className="text-xl font-semibold text-foreground mb-4">Histórico de Comparações</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Arquivo PDF</TableHead>
              <TableHead>Arquivo Excel</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisons.map((comparison) => (
              <TableRow key={comparison.id}>
                <TableCell>{format(new Date(comparison.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                <TableCell>{comparison.pdf_uploads.file_name}</TableCell>
                <TableCell>{comparison.excel_uploads.file_name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDifferences(
                        comparison.differences,
                        comparison.pdf_uploads.file_name,
                        comparison.excel_uploads.file_name
                      )}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Diferenças
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(comparison.id)}
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
