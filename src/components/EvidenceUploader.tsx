'use client';
import React, { useState } from 'react';

export type EvidenceUpload = {
  evidenceId: string;
  files: { name: string; url?: string }[];
  notes?: string;
  inEnglish?: boolean;
  complete: boolean;
};

export default function EvidenceUploader({
  evidenceId,
  title,
  description,
  needsLanguageChoice,
  requiresTranslationIfNotEnglish,
  onChange,
  onUploadFile,
}: {
  evidenceId: string;
  title: string;
  description?: string;
  needsLanguageChoice?: boolean;
  requiresTranslationIfNotEnglish?: boolean;
  onChange: (v: EvidenceUpload) => void;
  onUploadFile?: (file: File) => Promise<{ name: string; url?: string } | null>;
}) {
  const [files, setFiles] = useState<{ name: string; url?: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [inEnglish, setInEnglish] = useState<boolean | undefined>(undefined);
  const [complete, setComplete] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    let record = { name: f.name } as { name: string; url?: string };
    if (onUploadFile) {
      const uploaded = await onUploadFile(f);
      if (uploaded) record = uploaded;
    }
    const updated = [...files, record];
    setFiles(updated);
    emit(updated, notes, inEnglish, complete);
  }

  function emit(filesV = files, notesV = notes, inEnglishV = inEnglish, completeV = complete) {
    onChange({ evidenceId, files: filesV, notes: notesV, inEnglish: inEnglishV, complete: completeV });
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{title}</h4>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={complete} onChange={(e) => { setComplete(e.target.checked); emit(files, notes, inEnglish, e.target.checked); }} />
          Mark complete
        </label>
      </div>
      {description && <p className="text-gray-600 text-sm mt-1">{description}</p>}

      <div className="mt-3">
        <input type="file" onChange={handleFile} />
        {files.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm">
            {files.map((f, i) => (<li key={i}>{f.name}</li>))}
          </ul>
        )}
      </div>

      {needsLanguageChoice && (
        <div className="mt-3 text-sm flex items-center gap-3">
          <span>Is this in English?</span>
          <label className="flex items-center gap-1">
            <input type="radio" name={`lang-${evidenceId}`} onChange={() => { setInEnglish(true); emit(files, notes, true, complete); }} checked={inEnglish === true} />
            Yes
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name={`lang-${evidenceId}`} onChange={() => { setInEnglish(false); emit(files, notes, false, complete); }} checked={inEnglish === false} />
            No
          </label>
          {inEnglish === false && requiresTranslationIfNotEnglish && (
            <span className="text-amber-700">
              • Translation required — <a className="underline" href="/translate">order certified translation ($49)</a>
            </span>
          )}
      </div>
      )}

      <div className="mt-3">
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); emit(files, e.target.value, inEnglish, complete); }}
          placeholder="Optional notes (e.g., photo captions: date, place, people)"
          className="w-full border rounded p-2 text-sm"
        />
      </div>
    </div>
  );
}

