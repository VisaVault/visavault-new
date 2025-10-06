'use client';
import { useState } from 'react';

export default function TranslationUpsell() {
  const [doc, setDoc] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!doc) return;
    alert('Translation coming soon! Jukelingo API not yet configured.');
    // When API is ready:
    // const formData = new FormData();
    // formData.append('file', doc);
    // const res = await fetch('https://api.jukelingo.com/translate', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${process.env.JUKELINGO_API_KEY}` },
    //   body: formData,
    // });
    // const data = await res.json();
    // alert(`Translation: ${data.translatedText}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4">Translate Documents ($49)</h3>
      <input type="file" onChange={(e) => setDoc(e.target.files?.[0] || null)} className="mb-4" />
      <button onClick={handleUpload} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        Translate with Jukelingo
      </button>
    </div>
  );
}