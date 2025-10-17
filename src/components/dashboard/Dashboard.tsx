import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileVideo, FileText, Upload, Eye, Download, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { FileRecord } from '@/types';
import { Link } from 'react-router-dom';
import { FileUpload } from './FileUpload';

export const Dashboard = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFiles();
    }
  }, [user]);

  const fetchFiles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
      setFiles(files.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const canUpload = user?.is_premium || (user?.usage_count || 0) < (import.meta.env.VITE_MAX_FREE_EXPORTS || 3);

  const videoFiles = files.filter(f => f.file_type === 'video');
  const pdfFiles = files.filter(f => f.file_type === 'pdf');

  if (showUpload) {
    return (
      <FileUpload
        onBack={() => setShowUpload(false)}
        onUploadComplete={() => {
          setShowUpload(false);
          fetchFiles();
        }}
      />
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.full_name || 'User'}!</h1>
          <p className="text-muted-foreground">
            Create stunning multimedia content with text annotations
          </p>
        </div>
        <Button 
          onClick={() => setShowUpload(true)}
          disabled={!canUpload}
          size="lg"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload File
        </Button>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{files.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exports Used</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.usage_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {user?.is_premium ? 'Unlimited' : `${Math.max(0, (import.meta.env.VITE_MAX_FREE_EXPORTS || 3) - (user?.usage_count || 0))} remaining`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <Badge variant={user?.is_premium ? "default" : "secondary"}>
              {user?.is_premium ? "Premium" : "Free"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {user?.is_premium ? (
                <span className="text-green-600">All features unlocked</span>
              ) : (
                <Link to="/upgrade" className="text-blue-600 hover:underline">
                  Upgrade for unlimited exports
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Files Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Files</CardTitle>
          <CardDescription>
            Manage your uploaded videos and PDFs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Files ({files.length})</TabsTrigger>
              <TabsTrigger value="videos">Videos ({videoFiles.length})</TabsTrigger>
              <TabsTrigger value="pdfs">PDFs ({pdfFiles.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              <FileList files={files} onDelete={deleteFile} />
            </TabsContent>
            
            <TabsContent value="videos" className="space-y-4">
              <FileList files={videoFiles} onDelete={deleteFile} />
            </TabsContent>
            
            <TabsContent value="pdfs" className="space-y-4">
              <FileList files={pdfFiles} onDelete={deleteFile} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {!canUpload && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-orange-800">Export limit reached</h3>
                <p className="text-sm text-orange-700">
                  You've used all your free exports. Upgrade to premium for unlimited access.
                </p>
              </div>
              <Link to="/upgrade">
                <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface FileListProps {
  files: FileRecord[];
  onDelete: (fileId: string) => void;
}

const FileList = ({ files, onDelete }: FileListProps) => {
  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Upload className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
        >
          <div className="flex items-center space-x-3">
            {file.file_type === 'video' ? (
              <FileVideo className="h-8 w-8 text-blue-500" />
            ) : (
              <FileText className="h-8 w-8 text-red-500" />
            )}
            <div>
              <p className="font-medium">{file.filename}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(file.created_at).toLocaleDateString()} • {(file.file_size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={
              file.status === 'completed' ? 'default' :
              file.status === 'processing' ? 'secondary' :
              file.status === 'failed' ? 'destructive' : 'outline'
            }>
              {file.status}
            </Badge>
            <Link to={`/editor/${file.file_type}/${file.id}`}>
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(file.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};