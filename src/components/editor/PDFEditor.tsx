import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Download, 
  Type,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { FileRecord, Annotation } from '@/types';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const PDFEditor = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<FileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Annotation form state
  const [annotationText, setAnnotationText] = useState('');
  const [annotationX, setAnnotationX] = useState(50);
  const [annotationY, setAnnotationY] = useState(50);
  const [annotationPage, setAnnotationPage] = useState(1);
  const [annotationFontSize, setAnnotationFontSize] = useState(16);
  const [annotationColor, setAnnotationColor] = useState('#000000');
  const [annotationFontFamily, setAnnotationFontFamily] = useState('Arial');
  const [annotationFontWeight, setAnnotationFontWeight] = useState<'normal' | 'bold'>('normal');
  const [annotationFontStyle, setAnnotationFontStyle] = useState<'normal' | 'italic'>('normal');

  useEffect(() => {
    if (fileId) {
      fetchFile();
    }
  }, [fileId]);

  useEffect(() => {
    if (file && file.original_url) {
      loadPDF();
    }
  }, [file]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage();
    }
  }, [pdfDoc, currentPage, scale]);

  const fetchFile = async () => {
    if (!fileId || !user) return;

    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      setFile(data);
      setAnnotations(data.annotations || []);
      setAnnotationPage(1);
    } catch (error) {
      console.error('Error fetching file:', error);
      setError('Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const loadPDF = async () => {
    if (!file?.original_url) return;

    try {
      const loadingTask = pdfjsLib.getDocument(file.original_url);
      const pdf = await loadingTask.promise;
      
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading PDF:', error);
      setError('Failed to load PDF');
    }
  };

  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context!,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setAnnotationX(x);
    setAnnotationY(y);
    setAnnotationPage(currentPage);
    setShowAnnotationForm(true);
  };

  const addAnnotation = () => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'text',
      content: annotationText,
      position: { x: annotationX, y: annotationY },
      page: annotationPage,
      style: {
        fontSize: annotationFontSize,
        fontFamily: annotationFontFamily,
        color: annotationColor,
        fontWeight: annotationFontWeight,
        fontStyle: annotationFontStyle,
        textAlign: 'left',
      },
    };

    const updatedAnnotations = [...annotations, newAnnotation];
    setAnnotations(updatedAnnotations);
    saveAnnotations(updatedAnnotations);
    resetAnnotationForm();
  };

  const removeAnnotation = (annotationId: string) => {
    const updatedAnnotations = annotations.filter(a => a.id !== annotationId);
    setAnnotations(updatedAnnotations);
    saveAnnotations(updatedAnnotations);
  };

  const saveAnnotations = async (updatedAnnotations: Annotation[]) => {
    if (!file) return;

    try {
      const { error } = await supabase
        .from('files')
        .update({ annotations: updatedAnnotations })
        .eq('id', file.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving annotations:', error);
    }
  };

  const resetAnnotationForm = () => {
    setAnnotationText('');
    setAnnotationX(50);
    setAnnotationY(50);
    setAnnotationPage(currentPage);
    setAnnotationFontSize(16);
    setAnnotationColor('#000000');
    setAnnotationFontFamily('Arial');
    setAnnotationFontWeight('normal');
    setAnnotationFontStyle('normal');
    setShowAnnotationForm(false);
  };

  const exportPDF = async () => {
    if (!file || !user || !pdfDoc) return;

    // Check if user can export
    const canExport = user.is_premium || user.usage_count < (import.meta.env.VITE_MAX_FREE_EXPORTS || 3);
    if (!canExport) {
      setError('Export limit reached. Please upgrade to premium.');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const pdf = new jsPDF();
      
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (pageNum > 1) {
          pdf.addPage();
        }

        // Render the original page
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context!,
          viewport: viewport
        }).promise;

        // Create a container div for annotations
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.width = `${viewport.width}px`;
        container.style.height = `${viewport.height}px`;
        container.style.background = `url(${canvas.toDataURL()}) no-repeat`;
        container.style.backgroundSize = 'contain';

        // Add annotations for this page
        const pageAnnotations = annotations.filter(a => a.page === pageNum);
        pageAnnotations.forEach(annotation => {
          const textElement = document.createElement('div');
          textElement.style.position = 'absolute';
          textElement.style.left = `${(annotation.position.x / 100) * viewport.width}px`;
          textElement.style.top = `${(annotation.position.y / 100) * viewport.height}px`;
          textElement.style.fontSize = `${annotation.style.fontSize}px`;
          textElement.style.color = annotation.style.color;
          textElement.style.fontFamily = annotation.style.fontFamily;
          textElement.style.fontWeight = annotation.style.fontWeight;
          textElement.style.fontStyle = annotation.style.fontStyle;
          textElement.style.whiteSpace = 'pre-wrap';
          textElement.textContent = annotation.content;
          container.appendChild(textElement);
        });

        // Temporarily add to DOM for html2canvas
        document.body.appendChild(container);
        
        const canvasWithAnnotations = await html2canvas(container, {
          width: viewport.width,
          height: viewport.height,
          scale: 1,
        });

        // Remove from DOM
        document.body.removeChild(container);

        // Add to PDF
        const imgData = canvasWithAnnotations.toDataURL('image/jpeg', 0.95);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (viewport.height * pdfWidth) / viewport.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      // Convert to blob and upload
      const pdfBlob = pdf.output('blob');
      
      // Upload processed PDF to Supabase Storage
      const fileName = `processed/${user.id}/${Date.now()}_${file.filename}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('processed-files')
        .upload(fileName, pdfBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('processed-files')
        .getPublicUrl(fileName);

      // Update file record
      await supabase
        .from('files')
        .update({ 
          processed_url: publicUrl,
          status: 'completed'
        })
        .eq('id', file.id);

      // Update user usage count
      await supabase
        .from('profiles')
        .update({ usage_count: (user.usage_count || 0) + 1 })
        .eq('id', user.id);

      // Download the file
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(pdfBlob);
      downloadLink.download = `edited_${file.filename}`;
      downloadLink.click();

    } catch (error) {
      console.error('Export failed:', error);
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const getCurrentPageAnnotations = () => {
    return annotations.filter(annotation => annotation.page === currentPage);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!file) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>File not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">PDF Editor</h1>
            <p className="text-muted-foreground">{file.filename}</p>
          </div>
        </div>
        <Button onClick={exportPDF} disabled={exporting || annotations.length === 0}>
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PDF Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={zoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{Math.round(scale * 100)}%</span>
                  <Button size="sm" variant="outline" onClick={zoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                ref={containerRef}
                className="relative overflow-auto max-h-[600px] bg-gray-100 flex justify-center p-4"
              >
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    className="border shadow-lg cursor-crosshair"
                    onClick={handleCanvasClick}
                  />
                  
                  {/* Annotation Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {getCurrentPageAnnotations().map((annotation) => (
                      <div
                        key={annotation.id}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${annotation.position.x}%`,
                          top: `${annotation.position.y}%`,
                          fontSize: `${annotation.style.fontSize}px`,
                          color: annotation.style.color,
                          fontFamily: annotation.style.fontFamily,
                          fontWeight: annotation.style.fontWeight,
                          fontStyle: annotation.style.fontStyle,
                          transform: 'translate(-50%, -50%)',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {annotation.content}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Annotation Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Text Annotations</CardTitle>
                <Button size="sm" onClick={() => setShowAnnotationForm(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Text
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{annotation.content}</p>
                    <p className="text-xs text-muted-foreground">
                      Page {annotation.page}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAnnotation(annotation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {annotations.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No annotations added yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Annotation Form */}
          {showAnnotationForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Text Annotation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="text">Text</Label>
                  <Textarea
                    id="text"
                    value={annotationText}
                    onChange={(e) => setAnnotationText(e.target.value)}
                    placeholder="Enter annotation text"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>X Position (%)</Label>
                    <Slider
                      value={[annotationX]}
                      max={100}
                      step={1}
                      onValueChange={([value]) => setAnnotationX(value)}
                    />
                    <span className="text-xs text-muted-foreground">{annotationX.toFixed(0)}%</span>
                  </div>
                  <div>
                    <Label>Y Position (%)</Label>
                    <Slider
                      value={[annotationY]}
                      max={100}
                      step={1}
                      onValueChange={([value]) => setAnnotationY(value)}
                    />
                    <span className="text-xs text-muted-foreground">{annotationY.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="page">Page</Label>
                    <Input
                      id="page"
                      type="number"
                      value={annotationPage}
                      onChange={(e) => setAnnotationPage(parseInt(e.target.value))}
                      min={1}
                      max={totalPages}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fontSize">Font Size</Label>
                    <Input
                      id="fontSize"
                      type="number"
                      value={annotationFontSize}
                      onChange={(e) => setAnnotationFontSize(parseInt(e.target.value))}
                      min={8}
                      max={72}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={annotationColor}
                    onChange={(e) => setAnnotationColor(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Select value={annotationFontFamily} onValueChange={setAnnotationFontFamily}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Courier New">Courier New</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fontWeight">Weight</Label>
                    <Select value={annotationFontWeight} onValueChange={(value: 'normal' | 'bold') => setAnnotationFontWeight(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fontStyle">Style</Label>
                    <Select value={annotationFontStyle} onValueChange={(value: 'normal' | 'italic') => setAnnotationFontStyle(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="italic">Italic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={addAnnotation} disabled={!annotationText.trim()}>
                    <Type className="h-4 w-4 mr-1" />
                    Add Annotation
                  </Button>
                  <Button variant="outline" onClick={resetAnnotationForm}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};