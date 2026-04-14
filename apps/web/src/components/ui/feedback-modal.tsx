'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FeedbackModalProps {
  /** Modal heading */
  title: string;
  /** Subtitle / description text */
  description: string;
  /** List of selectable options */
  options: string[];
  /** Label for the confirmation button */
  confirmLabel?: string;
  /** Called when user confirms with the selected option */
  onConfirm: (selected: string) => void;
  /** Called when user cancels or closes */
  onClose: () => void;
}

export function FeedbackModal({
  title,
  description,
  options,
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
}: FeedbackModalProps) {
  const [selected, setSelected] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Backdrop — strong blur so the entire page is visibly blurred */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-[500px] rounded-2xl border border-border/60 bg-card text-card-foreground shadow-soft-lg overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border/50">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 pt-5">
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{description}</p>
          <div className="space-y-2.5">
            {options.map((opt) => (
              <label
                key={opt}
                className={[
                  'flex items-center border p-3.5 rounded-xl cursor-pointer transition-all duration-200',
                  selected === opt
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border/60 hover:bg-muted/40',
                ].join(' ')}
              >
                <input
                  type="radio"
                  className="hidden"
                  checked={selected === opt}
                  onChange={() => setSelected(opt)}
                />
                <span
                  className={[
                    'text-sm font-medium',
                    selected === opt ? 'text-foreground' : 'text-foreground/80',
                  ].join(' ')}
                >
                  {opt}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border/50 bg-muted/10 p-6 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={() => onConfirm(selected)} disabled={!selected}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
