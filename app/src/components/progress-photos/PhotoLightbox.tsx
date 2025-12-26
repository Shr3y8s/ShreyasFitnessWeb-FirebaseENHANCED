'use client';

import React from 'react';
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { PhotoAngle } from '@/types/progress-photo';

interface PhotoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  date: string;
  angle: PhotoAngle;
  associatedMetrics?: {
    weight?: number;
    weightUnit?: string;
    bodyFat?: number;
    bmi?: number;
  };
  onDelete?: () => Promise<void>;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function PhotoLightbox({
  isOpen,
  onClose,
  photoUrl,
  date,
  angle,
  associatedMetrics,
  onDelete,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: PhotoLightboxProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteDialog(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete photo:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
      onPrevious();
    } else if (e.key === 'ArrowRight' && hasNext && onNext) {
      onNext();
    }
  };

  if (!isOpen) return null;

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const angleLabel = angle.charAt(0).toUpperCase() + angle.slice(1);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
        onClick={onClose}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Delete Button */}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-16 text-white hover:bg-red-500/20"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        )}

        {/* Previous Button */}
        {hasPrevious && onPrevious && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onPrevious();
            }}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {/* Next Button */}
        {hasNext && onNext && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}

        {/* Image Container */}
        <div
          className="max-w-4xl max-h-[90vh] overflow-auto mx-4 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={photoUrl}
            alt={`${angleLabel} view - ${formattedDate}`}
            className="w-auto h-auto max-w-none rounded-lg"
          />

          {/* Info Bar */}
          <div className="mt-4 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{formattedDate}</h3>
                <p className="text-sm text-white/80">{angleLabel} View</p>
              </div>
              {associatedMetrics && (
                <div className="text-right space-y-1">
                  {associatedMetrics.weight && (
                    <p className="text-sm">
                      <span className="text-white/80">Weight:</span>{' '}
                      <span className="font-semibold">
                        {associatedMetrics.weight} {associatedMetrics.weightUnit || 'lbs'}
                      </span>
                    </p>
                  )}
                  {associatedMetrics.bodyFat && (
                    <p className="text-sm">
                      <span className="text-white/80">Body Fat:</span>{' '}
                      <span className="font-semibold">{associatedMetrics.bodyFat}%</span>
                    </p>
                  )}
                  {associatedMetrics.bmi && (
                    <p className="text-sm">
                      <span className="text-white/80">BMI:</span>{' '}
                      <span className="font-semibold">{associatedMetrics.bmi.toFixed(1)}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Progress Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {angleLabel.toLowerCase()} view photo from {formattedDate}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Photo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
