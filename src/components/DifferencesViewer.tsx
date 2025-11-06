import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface DifferencesViewerProps {
  differences: any;
  pdfName: string;
  excelName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DifferencesViewer = ({ 
  differences, 
  pdfName, 
  excelName, 
  isOpen, 
  onClose 
}: DifferencesViewerProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-2">
            <span>Comparação de Diferenças</span>
            <div className="flex gap-2 text-sm font-normal text-muted-foreground">
              <Badge variant="outline">PDF: {pdfName}</Badge>
              <Badge variant="outline">Excel: {excelName}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Resumo</h4>
              <p className="text-sm text-muted-foreground">
                Total de linhas no Excel: {differences.total_excel_rows}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {differences.comparison_note}
              </p>
            </div>

            {differences.sample_differences && differences.sample_differences.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Diferenças Identificadas</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campo</TableHead>
                      <TableHead>Valor no Excel</TableHead>
                      <TableHead>Valor no PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {differences.sample_differences.map((diff: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{diff.field}</TableCell>
                        <TableCell className="bg-success/10">{diff.excel_value}</TableCell>
                        <TableCell className="bg-warning/10">{diff.pdf_value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
