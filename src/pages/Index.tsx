import { useState } from "react";
import { ExcelUploader } from "@/components/ExcelUploader";
import { ExcelHistory } from "@/components/ExcelHistory";
import { ExcelDataViewer } from "@/components/ExcelDataViewer";
import { PDFComparator } from "@/components/PDFComparator";
import { ComparisonHistory } from "@/components/ComparisonHistory";
import { DifferencesViewer } from "@/components/DifferencesViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, GitCompare } from "lucide-react";

const Index = () => {
  const [refreshExcel, setRefreshExcel] = useState(0);
  const [refreshComparison, setRefreshComparison] = useState(0);
  const [viewingData, setViewingData] = useState<{
    uploadId: string;
    fileName: string;
  } | null>(null);
  const [viewingDifferences, setViewingDifferences] = useState<{
    differences: any;
    pdfName: string;
    excelName: string;
  } | null>(null);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto py-8 px-4">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Sistema de Gestão Documental
          </h1>
          <p className="text-muted-foreground">
            Importe, analise e compare documentos Excel e PDF
          </p>
        </header>

        <Tabs defaultValue="excel" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="excel" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              Comparar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="excel" className="space-y-8">
            <div className="grid md:grid-cols-1 gap-6">
              <ExcelUploader onUploadComplete={() => setRefreshExcel(prev => prev + 1)} />
            </div>
            
            <ExcelHistory 
              refreshTrigger={refreshExcel}
              onViewData={(uploadId, fileName) => setViewingData({ uploadId, fileName })}
            />
          </TabsContent>

          <TabsContent value="compare" className="space-y-8">
            <div className="grid md:grid-cols-1 gap-6">
              <PDFComparator onComparisonComplete={() => setRefreshComparison(prev => prev + 1)} />
            </div>

            <ComparisonHistory 
              refreshTrigger={refreshComparison}
              onViewDifferences={(differences, pdfName, excelName) => 
                setViewingDifferences({ differences, pdfName, excelName })
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      {viewingData && (
        <ExcelDataViewer
          uploadId={viewingData.uploadId}
          fileName={viewingData.fileName}
          isOpen={true}
          onClose={() => setViewingData(null)}
        />
      )}

      {viewingDifferences && (
        <DifferencesViewer
          differences={viewingDifferences.differences}
          pdfName={viewingDifferences.pdfName}
          excelName={viewingDifferences.excelName}
          isOpen={true}
          onClose={() => setViewingDifferences(null)}
        />
      )}
    </div>
  );
};

export default Index;
