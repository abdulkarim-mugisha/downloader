import React, { useState, useRef } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Progress } from './components/ui/progress';
import { Alert, AlertDescription } from './components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Download, Music, Video, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const StreamingDownload: React.FC = () => {
  const [url, setUrl] = useState('');
  const [downloadType, setDownloadType] = useState<'video' | 'audio'>('video');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setProgress(0);
    setError('');
    setFileName('');  // Reset fileName at the start of each download

    let currentFileName = 'download';  // Default filename
  
    try {
      const response = await fetch(`${API_URL}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, type: downloadType }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed: ${response.status} ${errorText}`);
      }
      if (!response.body) throw new Error('Response body is null');

      const reader = response.body.getReader();
      let chunks = [];
      let receivedLength = 0;
      let totalLength;
      let metadataReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (!metadataReceived) {
          const decoder = new TextDecoder();
          const text = decoder.decode(value);
          const metadataEndIndex = text.indexOf('\n');
          if (metadataEndIndex !== -1) {
            const metadata = text.slice(0, metadataEndIndex);
            const [name, size] = metadata.split('|');
            currentFileName = name || currentFileName;
            totalLength = parseInt(size, 10);
            setFileName(currentFileName);
            metadataReceived = true;
            
            // Only add the actual file content to chunks
            chunks.push(value.slice(metadataEndIndex + 1));
            receivedLength += value.length - (metadataEndIndex + 1);
          }
        } else {
          chunks.push(value);
          receivedLength += value.length;
        }

        if (totalLength) {
          setProgress((receivedLength / totalLength) * 100);
        }
      }

      const blob = new Blob(chunks);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      const fileExtension = downloadType === 'audio' ? '.mp3' : '.mp4';
      a.download = currentFileName.replace(/\.[^/.]+$/, "") + fileExtension;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError((err instanceof Error) ? err.message : String(err));
    } finally {
      setIsDownloading(false);
    }
  };
const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleClearUrl = () => {
    setUrl('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col">
      <h1 className="text-2xl font-semibold mb-6 text-center text-gray-800">Easy Download</h1>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-medium">Video Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL"
              className="pr-10 rounded-xl border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 transition duration-200"
            />
            {url && (
              <button
                onClick={handleClearUrl}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="flex justify-center space-x-4 mb-6">
            <Button
              onClick={() => setDownloadType('video')}
              variant={downloadType === 'video' ? 'default' : 'outline'}
              className={`rounded-full px-6 py-2 flex items-center ${
                downloadType === 'video' ? 'bg-blue-500 text-white' : 'bg-white text-blue-500 border-blue-500'
              }`}
            >
              <Video className="mr-2 h-4 w-4" />
              Video
            </Button>
            <Button
              onClick={() => setDownloadType('audio')}
              variant={downloadType === 'audio' ? 'default' : 'outline'}
              className={`rounded-full px-6 py-2 flex items-center ${
                downloadType === 'audio' ? 'bg-blue-500 text-white' : 'bg-white text-blue-500 border-blue-500'
              }`}
            >
              <Music className="mr-2 h-4 w-4" />
              Audio
            </Button>
          </div>
          <Button
            onClick={handleDownload}
            disabled={isDownloading || !url || !isValidUrl(url)}
            className="w-full mb-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition duration-200 flex items-center justify-center"
          >
            {isDownloading ? 'Downloading...' : 'Download'}
            <Download className="ml-2 h-5 w-5" />
          </Button>
          {isDownloading && (
            <div className="mb-6">
              <Progress value={progress} className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-200 ease-in-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </Progress>
              <p className="text-sm text-gray-600 mt-2 text-center">
                Downloading: {fileName || 'Preparing download...'}
              </p>
            </div>
          )}
          {error && (
            <Alert variant="destructive" className="rounded-xl bg-red-100 border-red-400 text-red-800">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StreamingDownload;