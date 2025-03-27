import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [urlInput, setUrlInput] = useState('');
  const [urlResults, setUrlResults] = useState(null);
  const [fileResults, setFileResults] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [revisionInput, setRevisionInput] = useState('');
  const [revisionOutput, setRevisionOutput] = useState('');

  const handleAnalyzeUrls = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/analyze-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: urlInput }),
    });
    const data = await res.json();
    setUrlResults(data.results);
  };

  const handleFileChange = (e) => {
    setSelectedFiles(e.target.files);
  };

  const handleAnalyzeFiles = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('docs', selectedFiles[i]);
    }

    const res = await fetch('/api/analyze-doc', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setFileResults(data.results);
  };

  const handleReviseText = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/revise-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: revisionInput }),
    });
    const data = await res.json();
    setRevisionOutput(data.revised);
  };

  return (
    <>
      <Head>
        <title>DEI Keyword Analyzer</title>
      </Head>

      <main className="min-h-screen bg-neutral p-8 text-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">🧾 DEI Keyword Analyzer</h1>
            <img
              src="https://carnegiehighered.com/wp-content/uploads/2021/04/cd-logo-red.png"
              alt="Carnegie Logo"
              className="h-12"
            />
          </div>

          {/* Analyze URLs */}
          <section className="bg-white p-6 rounded-lg shadow-lg mb-6 border-l-[8px] border-primary">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">🔗 Analyze URLs</h2>
            <form onSubmit={handleAnalyzeUrls}>
              <textarea
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter comma-separated URLs"
                className="w-full p-3 border-2 border-primary rounded-lg mb-4 resize-none shadow-sm"
                rows={4}
              />
              <button
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-red-900 transition"
              >
                Analyze URLs
              </button>
            </form>
            {urlResults && (
              <div className="mt-4 space-y-3">
                {urlResults.map((res, idx) => (
                  <div key={idx} className="p-3 bg-neutral rounded-md shadow-sm">
                    <p className="font-medium text-primary">{res.url}</p>
                    <p className="text-sm">Keywords found: {res.keywords_found.join(', ')}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Analyze Documents */}
          <section className="bg-white p-6 rounded-lg shadow-lg mb-6 border-l-[8px] border-primary">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">📁 Analyze Documents</h2>
            <input type="file" multiple onChange={handleFileChange} className="mb-4" />
            <br />
            <button
              onClick={handleAnalyzeFiles}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-red-900 transition"
            >
              Analyze Files
            </button>
            {fileResults && (
              <div className="mt-4 space-y-4">
                {Object.entries(fileResults).map(([fileName, analysis], idx) => (
                  <div key={idx} className="p-4 bg-neutral rounded-md shadow">
                    <p className="font-bold text-primary">{fileName}</p>
                    <ul className="list-disc list-inside text-sm">
                      {analysis.map((entry, i) => (
                        <li key={i}>
                          {entry.page ? `Page ${entry.page}` : entry.sheet || entry.section}:
                          <span className="ml-2">{entry.keywords_found?.join(', ') || entry.error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Text Revision */}
          <section className="bg-white p-6 rounded-lg shadow-lg border-l-[8px] border-primary">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">✏️ Text Revision Suggestions</h2>
            <form onSubmit={handleReviseText}>
              <textarea
                value={revisionInput}
                onChange={(e) => setRevisionInput(e.target.value)}
                placeholder="Paste problematic text here..."
                className="w-full p-3 border-2 border-primary rounded-lg mb-4 resize-none shadow-sm"
                rows={4}
              />
              <button
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-red-900 transition"
              >
                Suggest Revisions
              </button>
            </form>
            {revisionOutput && (
              <div className="mt-4 p-4 bg-neutral rounded-md">
                <h4 className="text-primary font-semibold mb-2">Revised Text:</h4>
                <p className="text-sm">{revisionOutput}</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
