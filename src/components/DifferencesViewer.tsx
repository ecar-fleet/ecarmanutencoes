import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface DifferencesViewerProps {
  differences: any;
  parsedPdf?: any;
  pdfName: string;
  excelName: string;
  isOpen: boolean;
  onClose: () => void;
  onAccept?: (editedRow?: any) => void | Promise<void>;
}

export const DifferencesViewer = ({ 
  differences, 
  parsedPdf,
  pdfName, 
  excelName, 
  isOpen, 
  onClose 
  , onAccept
}: DifferencesViewerProps) => {
  const [editedJson, setEditedJson] = useState<string>("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setJsonError(null);
    try {
      const init = differences?.best_row_data || {};
      setEditedJson(JSON.stringify(init, null, 2));
    } catch (e) {
      setEditedJson("{}");
    }
  }, [differences]);
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

              {differences.best_row_data && (
                <div className="bg-card p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Melhor linha correspondente (pré-visualização)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">Coluna</th>
                          <th className="text-left">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(differences.best_row_data).map(([col, val]) => (
                          <tr key={col}>
                            <td className="font-medium pr-4 align-top">{col}</td>
                            <td className="align-top">{String(val)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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

            {/* Field score breakdown and accept/edit area */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Detalhes de Score por Campo</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {differences.field_scores && Object.entries(differences.field_scores).map(([k, v]: any) => (
                  <div key={k} className="p-2 border rounded">
                    <div className="text-sm font-medium">{k}</div>
                    <div className="text-xs text-muted-foreground">Score: {v.score} / {v.max} — {v.matched ? 'match' : 'diff'}</div>
                  </div>
                ))}
              </div>

              <h4 className="font-semibold mt-4 mb-2">Editar linha selecionada (opcional)</h4>
              <textarea
                value={editedJson}
                onChange={(e) => setEditedJson(e.target.value)}
                className="w-full min-h-[120px] p-2 rounded border bg-background text-sm font-mono"
              />
              {jsonError && <div className="text-sm text-destructive mt-2">{jsonError}</div>}

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(editedJson || "{}");
                      setJsonError(null);
                      if (onAccept) onAccept(parsed);
                    } catch (e: any) {
                      setJsonError(String(e?.message || e));
                    }
                  }}
                >Salvar comparação</Button>

                <Button variant="outline" onClick={onClose}>Fechar</Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
