import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ResumeUploader({ onScan }: { onScan: (file: File, jobDesc: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [jobDesc, setJobDesc] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  const handleScan = () => {
    if (file && jobDesc) {
      onScan(file, jobDesc);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>ATS Resume Scanner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50"}`}
        >
          <input {...getInputProps()} />
          {file ? (
            <p className="text-sm font-medium text-primary">{file.name} selected</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Drag & drop your resume (PDF), or click to select
            </p>
          )}
        </div>

        {/* Job Description Textarea */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Job Description</label>
          <Textarea
            placeholder="Paste the job description here..."
            className="h-32"
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
          />
        </div>

        {/* Submit Button */}
        <Button 
          className="w-full" 
          disabled={!file || !jobDesc} 
          onClick={handleScan}
        >
          Scan Resume
        </Button>
      </CardContent>
    </Card>
  );
}