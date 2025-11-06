import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, AlertCircle, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [selectedComparison, setSelectedComparison] = useState<string | null>(null);
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
      
      // Automatically select the most recent comparison
      if (data && data.length > 0) {
        setSelectedComparison(data[0].id);
      }
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

      // Clear selected comparison if deleting the selected one
      if (selectedComparison === id) {
        setSelectedComparison(null);
      }

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

  const selectedComparisonData = comparisons.find(c => c.id === selectedComparison);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 shadow-medium">
        <h3 className="text-xl font-semibold text-foreground mb-4">Histórico de Comparações</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell">Data</TableHead>
                <TableHead>Arquivo PDF</TableHead>
                <TableHead className="hidden sm:table-cell">Arquivo Excel</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((comparison) => (
                <TableRow 
                  key={comparison.id}
                  className={`cursor-pointer transition-colors ${selectedComparison === comparison.id ? 'bg-accent' : ''}`}
                  onClick={() => setSelectedComparison(comparison.id)}
                >
                  <TableCell className="hidden md:table-cell">
                    {format(new Date(comparison.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {selectedComparison === comparison.id && (
                        <FileCheck className="h-4 w-4 text-secondary" />
                      )}
                      <span className="truncate max-w-[150px]">
                        {comparison.pdf_uploads.file_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="truncate max-w-[150px] block">
                      {comparison.excel_uploads.file_name}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDifferences(
                            comparison.differences,
                            comparison.pdf_uploads.file_name,
                            comparison.excel_uploads.file_name
                          );
                        }}
                        className="hidden sm:flex"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Diferenças
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDifferences(
                            comparison.differences,
                            comparison.pdf_uploads.file_name,
                            comparison.excel_uploads.file_name
                          );
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
                          handleDelete(comparison.id);
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

      {selectedComparison && selectedComparisonData && (
        <Card className="p-6 shadow-medium animate-fade-in">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-foreground mb-2">Detalhes da Comparação</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                PDF: {selectedComparisonData.pdf_uploads.file_name}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Excel: {selectedComparisonData.excel_uploads.file_name}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {format(new Date(selectedComparisonData.created_at), "dd/MM/yyyy HH:mm")}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Resumo da Comparação
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Total de linhas no Excel:</span>
                  <span className="ml-2 font-medium">
                    {selectedComparisonData.differences.total_excel_rows}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Arquivo PDF:</span>
                  <span className="ml-2 font-medium">
                    {selectedComparisonData.differences.pdf_file}
                  </span>
                </div>
              </div>
              {selectedComparisonData.differences.comparison_note && (
                <p className="text-sm text-muted-foreground mt-3 italic">
                  {selectedComparisonData.differences.comparison_note}
                </p>
              )}
            </div>

            {selectedComparisonData.differences.sample_differences && 
             selectedComparisonData.differences.sample_differences.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-secondary" />
                  Diferenças Identificadas
                </h4>
                <ScrollArea className="w-full">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">Campo</TableHead>
                          <TableHead className="min-w-[200px]">Valor no Excel</TableHead>
                          <TableHead className="min-w-[200px]">Valor no PDF</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedComparisonData.differences.sample_differences.map((diff: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{diff.field}</TableCell>
                            <TableCell className="bg-success/10">
                              <span className="line-clamp-2">{diff.excel_value}</span>
                            </TableCell>
                            <TableCell className="bg-warning/10">
                              <span className="line-clamp-2">{diff.pdf_value}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
