'use client';
import React, { useEffect, useRef, useState } from 'react';

const QUESTIONS = [
  'Tell me about your relationship timeline. Key dates?',
  'How do you share finances and responsibilities?',
  'Describe your last trip together. When? Where?',
  'What are your typical daily routines as a couple?',
  'For employment cases: describe your job duties in detail.',
];

export default function MockInterviewPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [feedback, setFeedback] = useState<string>('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
      } catch {
        setError('Camera/Mic permission denied.');
      }
    })();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startRecording() {
    if (!stream) return;
    setFeedback('');
    setError(null);
    recordedChunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
    mr.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function submitForFeedback() {
    setPending(true);
    setError(null);
    setFeedback('');
    try {
      // Extract audio track from the recorded video by re-encoding on server (we’ll accept webm here).
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const form = new FormData();
      form.append('file', blob, 'answer.webm');
      form.append('question', QUESTIONS[currentQ]);

      const res = await fetch('/api/interview/feedback', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Feedback failed');
      setFeedback(data.feedback || '');
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-blue-900 mb-2">Mock Interview</h1>
      <p className="text-gray-600 mb-4">Practice typical USCIS interview questions with AI feedback on clarity, consistency, and credibility.</p>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Question {currentQ + 1} of {QUESTIONS.length}</h2>
        <p className="text-gray-800">{QUESTIONS[currentQ]}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div className="bg-black rounded overflow-hidden">
          <video ref={videoRef} className="w-full h-auto" playsInline muted></video>
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            {!recording ? (
              <button onClick={startRecording} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Start Recording</button>
            ) : (
              <button onClick={stopRecording} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Stop Recording</button>
            )}
            <button
              onClick={submitForFeedback}
              disabled={recording || recordedChunksRef.current.length === 0 || pending}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {pending ? 'Analyzing…' : 'Get AI Feedback'}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
              className="px-3 py-2 border rounded"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentQ((q) => Math.min(QUESTIONS.length - 1, q + 1))}
              className="px-3 py-2 border rounded"
            >
              Next
            </button>
          </div>

          {error && <p className="text-red-600">{error}</p>}
          {feedback && (
            <div className="bg-green-50 border border-green-200 rounded p-3 whitespace-pre-wrap">
              <strong>Feedback:</strong>
              <div className="mt-2">{feedback}</div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}