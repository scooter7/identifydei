import { KEYWORDS } from '../../lib/keywords';
import formidable from 'formidable';
import fs from 'fs';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// ✅ Disable Next.js body parsing to allow file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// 🔍 Helper to find keywords in text
function searchKeywords(text, keywords) {
  const found = [];
  const textLower = text.toLowerCase();
  for (const kw of keywords) {
    if (textLower.includes(kw.toLowerCase())) {
      found.push(kw);
    }
  }
  return [...new Set(found)];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm();

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    let docs = files.docs;
    if (!docs) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (!Array.isArray(docs)) {
      docs = [docs];
    }

    const results = {};

    for (const file of docs) {
      const filePath = file.filepath;
      const fileName = file.originalFilename || 'unknown';
      const ext = (fileName.split('.').pop() || '').toLowerCase();

      let docAnalysis = [];

      try {
        if (ext === 'pdf') {
          const dataBuffer = fs.readFileSync(filePath);
          const uint8Array = new Uint8Array(dataBuffer);
          const pdfDocument = await pdfjsLib.getDocument({ data: uint8Array }).promise;
          const numPages = pdfDocument.numPages;

          for (let i = 1; i <= numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            const found = searchKeywords(pageText, KEYWORDS);
            if (found.length > 0) {
              docAnalysis.push({ page: i, keywords_found: found });
            }
          }
        } else if (ext === 'docx' || ext === 'doc') {
          const result = await mammoth.extractRawText({ path: filePath });
          const text = result.value;
          const found = searchKeywords(text, KEYWORDS);
          if (found.length > 0) {
            docAnalysis.push({ section: 'Full DOCX', keywords_found: found });
          }
        } else if (ext === 'xlsx' || ext === 'xls') {
          const workbook = xlsx.readFile(filePath);
          workbook.SheetNames.forEach(sheetName => {
            const ws = workbook.Sheets[sheetName];
            const csvData = xlsx.utils.sheet_to_csv(ws);
            const found = searchKeywords(csvData, KEYWORDS);
            if (found.length > 0) {
              docAnalysis.push({ sheet: sheetName, keywords_found: found });
            }
          });
        } else if (ext === 'txt') {
          const txtData = fs.readFileSync(filePath, 'utf-8');
          const found = searchKeywords(txtData, KEYWORDS);
          if (found.length > 0) {
            docAnalysis.push({ section: 'Full TXT', keywords_found: found });
          }
        } else {
          docAnalysis.push({ error: 'Unsupported file type' });
        }
      } catch (parseErr) {
        docAnalysis.push({ error: parseErr.message });
      }

      results[fileName] = docAnalysis;
    }

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Error in file upload/parsing:', error);
    return res.status(500).json({ error: error.message });
  }
}
