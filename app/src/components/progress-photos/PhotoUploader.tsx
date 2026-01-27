'use client';

import React, { useState } from 'react';
import { Upload, Calendar, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { extractPhotoDate, uploadProgressPhoto } from '@/lib/progress-photo-api';
import { getTodayLocal } from '@/lib/date-utils';
import type { PhotoAngle } from '@/types/progress-photo';

interface PhotoUploaderProps {
  userId: string;
  onUploadComplete: () => void;
}

type ExifStatus = 'not-detected' | 'found' | 'unavailable';

export function PhotoUploader({ userId, onUploadComplete }: PhotoUploaderProps) {
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocal());
  const [exifStatus, setExifStatus] = useState<ExifStatus>('not-detected');
  const [detectedDate, setDetectedDate] = useState<string | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<PhotoAngle>('front');
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setUploadSuccess(false);

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Set file and preview
    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    // Try to extract EXIF date
    const exifDate = await extractPhotoDate(file);
    if (exifDate) {
      setExifStatus('found');
      setDetectedDate(exifDate);
      setSelectedDate(exifDate);
    } else {
      setExifStatus('unavailable');
      setDetectedDate(null);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a photo first');
      return;
    }

    setUploading(true);
    setError(null);

    const result = await uploadProgressPhoto({
      userId,
      date: selectedDate,
      angle: selectedAngle,
      file: selectedFile
    });

    setUploading(false);

    if (result.success) {
      setUploadSuccess(true);
      
      // Wait 1.5 seconds to show success, then reset form
      setTimeout(() => {
        resetForm();
        onUploadComplete();
      }, 1500);
    } else {
      setError(result.error || 'Upload failed');
    }
  };

  // Reset form
  const resetForm = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setSelectedDate(getTodayLocal());
    setExifStatus('not-detected');
    setDetectedDate(null);
    setSelectedAngle('front');
    setUploadSuccess(false);
    setError(null);
    
    // Reset file input
    const fileInput = document.getElementById('photo-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="space-y-6">
        
        {/* 3-Column Layout for Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:divide-x divide-gray-200">
          
          {/* Step 1: Select Photo */}
          <div className="space-y-3 md:pr-6">
            <Label className="text-base font-semibold">Step 1: Select Photo</Label>
            
            <div className="flex flex-col gap-3">
              <input
                id="photo-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('photo-file-input')?.click()}
                className="w-full justify-start"
                disabled={uploading || uploadSuccess}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : 'Choose File'}
              </Button>
              
              {/* Photo Preview - Thumbnail */}
              {previewUrl && (
                <div className="relative w-full max-w-[200px] mx-auto bg-gray-50 rounded-lg border-2 border-gray-200 p-2">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-auto object-contain rounded"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Photo Date */}
          <div className="space-y-3 md:px-6">
            <Label className="text-base font-semibold">Step 2: Photo Date</Label>
            
            {/* EXIF Status */}
            <div className="p-3 bg-gray-50 rounded-lg border text-xs">
              <div className="flex items-start gap-2">
                {exifStatus === 'found' && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-green-800">
                        Auto-Detected: {detectedDate}
                      </p>
                      <p className="text-[10px] text-green-700 mt-0.5">
                        From photo metadata
                      </p>
                    </div>
                  </>
                )}
                {exifStatus === 'unavailable' && (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-800">
                        No date found
                      </p>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        Set manually below
                      </p>
                    </div>
                  </>
                )}
                {exifStatus === 'not-detected' && (
                  <>
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-600">
                        Pending
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Select photo first
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <Label htmlFor="photo-date" className="text-sm">Set Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  id="photo-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={getTodayLocal()}
                  disabled={uploading || uploadSuccess}
                  className="flex-1 px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Select View */}
          <div className="space-y-3 md:pl-6">
            <Label className="text-base font-semibold">Step 3: Select View</Label>
            
            <RadioGroup 
              value={selectedAngle} 
              onValueChange={(value) => setSelectedAngle(value as PhotoAngle)}
              disabled={uploading || uploadSuccess}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="front" id="front" />
                <Label htmlFor="front" className="font-normal cursor-pointer">
                  Front View
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="side" id="side" />
                <Label htmlFor="side" className="font-normal cursor-pointer">
                  Side View
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="back" id="back" />
                <Label htmlFor="back" className="font-normal cursor-pointer">
                  Back View
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {uploadSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Photo uploaded successfully! Form will reset shortly...
            </p>
          </div>
        )}

        {/* Upload Button */}
        <div className="pt-2">
          {!uploadSuccess ? (
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Photo
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={resetForm}
              className="w-full"
              size="lg"
            >
              Upload Another Photo
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Upload photos from different angles to track your progress over time
          </p>
        </div>
    </div>
  );
}
