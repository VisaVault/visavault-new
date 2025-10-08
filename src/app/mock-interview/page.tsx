'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getLatestVisaApp } from '@/lib/persistence';

type Mode = 'audio' | 'typed';

export default function MockInterviewPage() {
  const [mode, setMode] = useState<Mode>('audio');
  const [visaAppId, setVisaAppId] = useState<string | null>(null);
  const [promptContext, setPromptContext] = useState<string>('Marriage-based interview (I-130/I-485).');
  const [feedback, setFeedback] = useState<string>('');
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Typed mode state
  const [typedTranscript, setTypedTranscript] = useState<string>('');

  // Audio mode state
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Load latest visa app id (so credits can be decremented server-side)
  useEffect(() => {
    (async () => {
      const app = await getLatestVisaApp();
      if (app?.id) setVisaAppId(app.id);
    })();
  }, []);

  // ---- Audio recording handlers ----
  const startRecording = useCallback(async () => {
    setError(null);
    setFeedback('');
    setAudioBlob(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Your browser does not support audio recording. Use the Typed mode instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        // stop all tracks to release mic
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      setRecording(true);
    } catch (e: any) {
      setError(e?.message || 'Could not start recording.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, []);

  // ---- Submitters ----
  async function submitAudio() {
    if (!audioBlob) {
      setError('No audio recorded. Please record first.');
      return;
    }
    setError(null);
    setPending(true);
    setFeedback('');

    try {
      const fd = new FormData();
      fd.append('audio', audioBlob, 'interview.webm');
      if (visaAppId) fd.append('visa_app_id', visaAppId);
      if (promptContext) fd.append('promptContext', promptContext);

      const res = await fetch('/api/interview/feedback', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to analyze');

      setFeedback(data.feedback || '');
      if (typeof data.creditsRemaining === 'number') {
        setCreditsRemaining(data.creditsRemaining);
      }
    } catch (e: any) {
      setError(e?.message || 'Upload failed.');
    } finally {
      setPending(false);
    }
  }

  async function submitTyped() {
    if (!typedTranscript.trim()) {
      setError('Please enter your answers or transcript.');
      return;
    }
    setError(null);
    setPending(true);
    setFeedback('');

    try {
      const res = await fetch('/api/interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: typedTranscript,
          promptContext,
          visa_app_id: visaAppId, // decrement credit when present
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to analyze');

      setFeedback(data.feedback || '');
      if (typeof data.creditsRemaining === 'number') {
        setCreditsRemaining(data.creditsRemaining);
      }
    } catch (e: any) {
      setError(e?.message || 'Submit failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="container mx-auto px-4">
        <header className="mb-8">
          <div className="badge">Interview Practice</div>
          <h1 className="font-display text-3xl font-semibold mt-2">Mock Interview — Same Day Confidence</h1>
          <p className="text-slate-700 mt-1">
            Record your answers or paste them below. We’ll score and coach you with targeted drills.
          </p>
        </header>

        {/* Plan entitlements status */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-slate-700">
              <div className="font-medium">Credits</div>
              <div className="text-sm">
                {creditsRemaining == null ? '—' : `Mock Interviews: ${creditsRemaining} left`}
              </div>
            </div>
            <a className="btn btn-outline" href="/pricing">Add More</a>
          </div>
        </div>

        <div className="card p-6">
          {/* Mode switch */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('audio')}
              className={`btn ${mode === 'audio' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Record Audio
            </button>
            <button
              onClick={() => setMode('typed')}
              className={`btn ${mode === 'typed' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Type Answers
            </button>
          </div>

          {/* Shared prompt context */}
          <label className="block text-sm font-medium text-slate-700 mb-1">Focus</label>
          <input
            type="text"
            value={promptContext}
            onChange={(e) => setPromptContext(e.target.value)}
            className="w-full p-2 border rounded-md mb-4"
            placeholder="e.g., Marriage-based interview (I-130/I-485)"
          />

          {/* AUDIO MODE */}
          {mode === 'audio' && (
            <div className="space-y-4">
              <div className="text-sm text-slate-700">
                Click <strong>Start</strong>, answer typical questions (e.g., “How did you meet?”), then click <strong>Stop</strong>.
              </div>
              <div className="flex gap-2">
                {!recording ? (
                  <button onClick={startRecording} className="btn btn-primary">Start</button>
                ) : (
                  <button onClick={stopRecording} className="btn btn-outline">Stop</button>
                )}
                <button
                  onClick={submitAudio}
                  disabled={!audioBlob || pending}
                  className="btn btn-ghost disabled:opacity-50"
                  title={!audioBlob ? 'Record first' : 'Analyze'}
                >
                  {pending ? 'Analyzing…' : 'Analyze Recording'}
                </button>
              </div>
              {audioBlob && (
                <audio controls src={URL.createObjectURL(audioBlob)} className="w-full mt-2" />
              )}
            </div>
          )}

          {/* TYPED MODE */}
          {mode === 'typed' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Paste your answers / transcript</label>
              <textarea
                value={typedTranscript}
                onChange={(e) => setTypedTranscript(e.target.value)}
                className="w-full p-2 border rounded-md h-40"
                placeholder={`Example:\n• We met in 2019 at...\n• We moved in together in...\n• Our joint evidence includes...`}
              />
              <button onClick={submitTyped} disabled={pending} className="btn btn-primary">
                {pending ? 'Analyzing…' : 'Analyze Typed Answers'}
              </button>
            </div>
          )}

          {error && <p className="text-red-600 mt-4">{error}</p>}

          {feedback && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-2">Your Coaching Feedback</h2>
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-800 bg-white/70 border rounded-xl p-4">
                {feedback}
              </div>
              {typeof creditsRemaining === 'number' && (
                <p className="text-sm text-slate-600 mt-2">Credits remaining: <strong>{creditsRemaining}</strong></p>
              )}
            </div>
          )}
        </div>

        <div className="text-sm text-slate-600 mt-6">
          Tip: Practice concise, consistent answers. We’ll highlight red flags so you can improve the same day.
        </div>
      </div>
    </main>
  );
}
