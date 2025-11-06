-- Create table for Excel uploads and their data
CREATE TABLE IF NOT EXISTS public.excel_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  columns TEXT[] NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Excel data rows
CREATE TABLE IF NOT EXISTS public.excel_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES public.excel_uploads(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for PDF uploads
CREATE TABLE IF NOT EXISTS public.pdf_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  parsed_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for comparisons
CREATE TABLE IF NOT EXISTS public.comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdf_id UUID NOT NULL REFERENCES public.pdf_uploads(id) ON DELETE CASCADE,
  excel_id UUID NOT NULL REFERENCES public.excel_uploads(id) ON DELETE CASCADE,
  differences JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.excel_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excel_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for this system)
CREATE POLICY "Anyone can view excel uploads" 
ON public.excel_uploads FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert excel uploads" 
ON public.excel_uploads FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete excel uploads" 
ON public.excel_uploads FOR DELETE 
USING (true);

CREATE POLICY "Anyone can view excel data" 
ON public.excel_data FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert excel data" 
ON public.excel_data FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete excel data" 
ON public.excel_data FOR DELETE 
USING (true);

CREATE POLICY "Anyone can view pdf uploads" 
ON public.pdf_uploads FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert pdf uploads" 
ON public.pdf_uploads FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete pdf uploads" 
ON public.pdf_uploads FOR DELETE 
USING (true);

CREATE POLICY "Anyone can view comparisons" 
ON public.comparisons FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert comparisons" 
ON public.comparisons FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete comparisons" 
ON public.comparisons FOR DELETE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_excel_data_upload_id ON public.excel_data(upload_id);
CREATE INDEX idx_comparisons_pdf_id ON public.comparisons(pdf_id);
CREATE INDEX idx_comparisons_excel_id ON public.comparisons(excel_id);