import { KEYWORDS } from '../../lib/keywords';
import formidable from 'formidable';
import fs from 'fs';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import pdfParse from 'pdf-parse';

export const config = {
  api: {
    bodyParser: false,
  },
};

function searchKeywordsWithScore(text, keywordsList) {
  const textLower = text.toLowerCase();
  const found = [];

  for (const { keyword, score } of keywordsList) {
    if (textLower.includes(keyword.toLowerCase())) {
      found.push({ keyword, score });
    }
  }

  return found;
}

function removeIgnored(text, ignoreList) {
  let cleaned = text;
  ignoreList.forEach(ignore => {
    const regex = new RegExp(ignore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  return cleaned;
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
    if (!docs) return res.status(400).json({ error: 'No files uploaded' });
    if (!Array.isArray(docs)) docs = [docs];

    const ignoreText = fields.ignoreText || '';
    const ignoreLines = ignoreText.split('\n').map(l => l.trim()).filter(Boolean);

    const results = {};

    for (const file of docs) {
      const filePath = file.filepath;
      const fileName = file.originalFilename || 'unknown';
      const ext = (fileName.split('.').pop() || '').toLowerCase();

      let docAnalysis = [];
      let totalScore = 0;
      let sectionCount = 0;

      try {
        if (ext === 'pdf') {
          const dataBuffer = fs.readFileSync(filePath);
          const pdfData = await pdfParse(dataBuffer);
          const cleanedText = removeIgnored(pdfData.text, ignoreLines);

          const matches = searchKeywordsWithScore(cleanedText, KEYWORDS);
          totalScore = matches.reduce((sum, k) => sum + k.score, 0);
          const numPages = pdfData.numpages || 1;

          if (matches.length > 0) {
            docAnalysis.push({
              section: 'Full PDF Text',
              keywords_found: matches.map(k => k.keyword),
              sensitivity_score: +(totalScore / numPages).toFixed(2),
            });
          }

        } else if (ext === 'docx' || ext === 'doc') {
          const result = await mammoth.extractRawText({ path: filePath });
          const cleanedText = removeIgnored(result.value, ignoreLines);

          const matches = searchKeywordsWithScore(cleanedText, KEYWORDS);
          totalScore = matches.reduce((sum, k) => sum + k.score, 0);

          if (matches.length > 0) {
            docAnalysis.push({
              section: 'Full DOCX',
              keywords_found: matches.map(k => k.keyword),
              sensitivity_score: totalScore,
            });
          }

        } else if (ext === 'xlsx' || ext === 'xls') {
          const workbook = xlsx.readFile(filePath);
          workbook.SheetNames.forEach(sheetName => {
            const ws = workbook.Sheets[sheetName];
            const csvData = removeIgnored(xlsx.utils.sheet_to_csv(ws), ignoreLines);
            const matches = searchKeywordsWithScore(csvData, KEYWORDS);
            if (matches.length > 0) {
              const sheetScore = matches.reduce((sum, k) => sum + k.score, 0);
              totalScore += sheetScore;
              sectionCount++;
              docAnalysis.push({
                sheet: sheetName,
                keywords_found: matches.map(k => k.keyword),
                sensitivity_score: sheetScore,
              });
            }
          });

        } else if (ext === 'txt') {
          const rawText = fs.readFileSync(filePath, 'utf-8');
          const cleanedText = removeIgnored(rawText, ignoreLines);
          const matches = searchKeywordsWithScore(cleanedText, KEYWORDS);
          totalScore = matches.reduce((sum, k) => sum + k.score, 0);

          if (matches.length > 0) {
            docAnalysis.push({
              section: 'Full TXT',
              keywords_found: matches.map(k => k.keyword),
              sensitivity_score: totalScore,
            });
          }

        } else {
          docAnalysis.push({ error: 'Unsupported file type' });
        }
      } catch (err) {
        docAnalysis.push({ error: err.message });
      }

      results[fileName] = docAnalysis;
    }

    return res.status(200).json({ results });

  } catch (error) {
    console.error('Error parsing files:', error);
    res.status(500).json({ error: error.message });
  }
}
