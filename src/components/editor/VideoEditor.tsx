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
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Download, 
  Type,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { FileRecord, Annotation } from '@/types';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export const VideoEditor = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ffmpegRef = useRef(new FFmpeg());

  const [file, setFile] = useState<FileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Annotation form state
  const [annotationText, setAnnotationText] = useState('');
  const [annotationX, setAnnotationX] = useState(50);
  const [annotationY, setAnnotationY] = useState(50);
  const [annotationTimestamp, setAnnotationTimestamp] = useState(0);
  const [annotationDuration, setAnnotationDuration] = useState(3);
  const [annotationFontSize, setAnnotationFontSize] = useState(24);
  const [annotationColor, setAnnotationColor] = useState('#ffffff');
  const [annotationFontFamily, setAnnotationFontFamily] = useState('Arial');
  const [annotationFontWeight, setAnnotationFontWeight] = useState<'normal' | 'bold'>('normal');
  const [annotationFontStyle, setAnnotationFontStyle] = useState<'normal' | 'italic'>('normal');

  useEffect(() => {
    if (fileId) {
      fetchFile();
      loadFFmpeg();
    }
  }, [fileId]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const updateTime = () => setCurrentTime(video.currentTime);
      const updateDuration = () => setDuration(video.duration);
      
      video.addEventListener('timeupdate', updateTime);
      video.addEventListener('loadedmetadata', updateDuration);
      
      return () => {
        video.removeEventListener('timeupdate', updateTime);
        video.removeEventListener('loadedmetadata', updateDuration);
      };
    }
  }, [file]);

  const loadFFmpeg = async () => {
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      const ffmpeg = ffmpegRef.current;
      
      ffmpeg.on('log', ({ message }) => {
        console.log(message);
      });
      
      ffmpeg.on('progress', ({ progress }) => {
        setExportProgress(Math.round(progress * 100));
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      setError('Failed to load video processing engine');
    }
  };

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
    } catch (error) {
      console.error('Error fetching file:', error);
      setError('Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (playing) {
        video.pause();
      } else {
        video.play();
      }
      setPlaying(!playing);
    }
  };

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  const addAnnotation = () => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'text',
      content: annotationText,
      position: { x: annotationX, y: annotationY },
      timestamp: annotationTimestamp,
      duration: annotationDuration,
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
    setAnnotationTimestamp(currentTime);
    setAnnotationDuration(3);
    setAnnotationFontSize(24);
    setAnnotationColor('#ffffff');
    setAnnotationFontFamily('Arial');
    setAnnotationFontWeight('normal');
    setAnnotationFontStyle('normal');
    setShowAnnotationForm(false);
  };

  const exportVideo = async () => {
    if (!file || !user) return;

    // Check if user can export
    const canExport = user.is_premium || user.usage_count < (import.meta.env.VITE_MAX_FREE_EXPORTS || 3);
    if (!canExport) {
      setError('Export limit reached. Please upgrade to premium.');
      return;
    }

    setExporting(true);
    setExportProgress(0);
    setError(null);

    try {
      const ffmpeg = ffmpegRef.current;
      
      // Fetch the original video file
      const videoResponse = await fetch(file.original_url!);
      const videoData = await videoResponse.arrayBuffer();
      
      await ffmpeg.writeFile('input.mp4', new Uint8Array(videoData));

      // Create filter complex for text overlays
      let filterComplex = '';
      annotations.forEach((annotation, index) => {
        const startTime = annotation.timestamp || 0;
        const endTime = startTime + (annotation.duration || 3);
        const x = (annotation.position.x / 100) * 1920; // Assuming 1920x1080 video
        const y = (annotation.position.y / 100) * 1080;
        
        const textFilter = `drawtext=text='${annotation.content.replace(/'/g, "\\'")}':x=${x}:y=${y}:fontsize=${annotation.style.fontSize}:fontcolor=${annotation.style.color}:enable='between(t,${startTime},${endTime})'`;
        
        if (index === 0) {
          filterComplex = `[0:v]${textFilter}[v${index}]`;
        } else {
          filterComplex += `;[v${index - 1}]${textFilter}[v${index}]`;
        }
      });

      const outputLabel = annotations.length > 0 ? `[v${annotations.length - 1}]` : '[0:v]';
      
      // Run FFmpeg command
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-filter_complex', filterComplex || '[0:v]copy[v0]',
        '-map', outputLabel,
        '-map', '0:a',
        '-c:a', 'copy',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        'output.mp4'
      ]);

      // Read the output file
      const outputData = await ffmpeg.readFile('output.mp4');
      const outputBlob = new Blob([outputData], { type: 'video/mp4' });

      // Upload processed video to Supabase Storage
      const fileName = `processed/${user.id}/${Date.now()}_${file.filename}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('processed-files')
        .upload(fileName, outputBlob);

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
      downloadLink.href = URL.createObjectURL(outputBlob);
      downloadLink.download = `edited_${file.filename}`;
      downloadLink.click();

      setExportProgress(100);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const getVisibleAnnotations = () => {
    return annotations.filter(annotation => {
      const startTime = annotation.timestamp || 0;
      const endTime = startTime + (annotation.duration || 3);
      return currentTime >= startTime && currentTime <= endTime;
    });
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
            <h1 className="text-2xl font-bold">Video Editor</h1>
            <p className="text-muted-foreground">{file.filename}</p>
          </div>
        </div>
        <Button onClick={exportVideo} disabled={exporting || annotations.length === 0}>
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Video
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={file.original_url}
                  className="w-full h-auto"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 pointer-events-none"
                  style={{ display: 'none' }}
                />
                
                {/* Annotation Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {getVisibleAnnotations().map((annotation) => (
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
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {annotation.content}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Video Controls */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-4">
                <Button size="sm" onClick={togglePlay}>
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <span className="text-sm font-mono">
                  {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                </span>
              </div>
              
              <Slider
                value={[currentTime]}
                max={duration}
                step={0.1}
                onValueChange={([value]) => seekTo(value)}
                className="w-full"
              />
            </CardContent>
          </Card>

          {exporting && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Exporting video...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} />
                </div>
              </CardContent>
            </Card>
          )}

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
                      {annotation.timestamp?.toFixed(1)}s - {((annotation.timestamp || 0) + (annotation.duration || 3)).toFixed(1)}s
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
                    <span className="text-xs text-muted-foreground">{annotationX}%</span>
                  </div>
                  <div>
                    <Label>Y Position (%)</Label>
                    <Slider
                      value={[annotationY]}
                      max={100}
                      step={1}
                      onValueChange={([value]) => setAnnotationY(value)}
                    />
                    <span className="text-xs text-muted-foreground">{annotationY}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timestamp">Start Time (s)</Label>
                    <Input
                      id="timestamp"
                      type="number"
                      value={annotationTimestamp}
                      onChange={(e) => setAnnotationTimestamp(parseFloat(e.target.value))}
                      step={0.1}
                      max={duration}
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (s)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={annotationDuration}
                      onChange={(e) => setAnnotationDuration(parseFloat(e.target.value))}
                      step={0.1}
                      min={0.1}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      type="color"
                      value={annotationColor}
                      onChange={(e) => setAnnotationColor(e.target.value)}
                    />
                  </div>
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