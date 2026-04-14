const fs = require('fs');

function escapeCSV(str) {
  if (typeof str !== 'string') return '';
  if (str.includes(',') || str.includes('\"') || str.includes('\n')) {
    return `\"${str.replace(/\"/g, '\"\"')}\"`;
  }
  return str;
}

const content = fs.readFileSync('csv_data/questions_with_audio_mapping.txt', 'utf8');
const blocks = content.split('---').map(b => b.trim()).filter(b => b.length > 0);

const csvRows = [];
const headers = ['testTypeId','questionText','optionA','optionB','optionC','optionD','correctAnswer','explanation','cefrLevel','difficulty','testSetId','conversation','article','audioUrl','transcript'];
csvRows.push(headers.join(','));

blocks.forEach((block, index) => {
  const lines = block.split('\n').map(l => l.trim());
  let audioUrl = '';
  let transcript = [];
  let questionText = '';
  let options = [];
  let correctAnswer = '';
  let explanation = '';

  let state = 'init';

  for (let line of lines) {
    if (state === 'init') {
      if (line.match(/^\[(Q\d+)\] = (.*?\.mp3)/)) {
        const m = line.match(/^\[(Q\d+)\] = (.*?\.mp3)/);
        audioUrl = '/audio/' + m[2]; 
      }
      else if (line === 'Script:') {
        state = 'script';
      }
    } else if (state === 'script') {
      if (line.startsWith('Question:')) {
        questionText = line.substring(9).trim();
        state = 'options';
      } else if (line !== '') {
        transcript.push(line);
      }
    } else if (state === 'options') {
      if (line.startsWith('- A ')) options[0] = line.substring(4).trim();
      else if (line.startsWith('- B ')) options[1] = line.substring(4).trim();
      else if (line.startsWith('- C ')) options[2] = line.substring(4).trim();
      else if (line.startsWith('- D ')) options[3] = line.substring(4).trim();
      else if (line.startsWith('Correct Answer:')) correctAnswer = line.substring(15).trim();
      else if (line.startsWith('Explanation:')) explanation = line.substring(12).trim();
    }
  }

  const transcriptStr = transcript.join('\\n');
  const testSetId = String(index < 19 ? 34 : 35);

  csvRows.push([
    'listening',
    questionText,
    options[0] || '',
    options[1] || '',
    options[2] || '',
    options[3] || '',
    correctAnswer, 
    explanation, 
    'A2', // cefrLevel defaults to A2
    'medium', // difficulty
    testSetId, // testSetId
    '', // conversation
    '', // article
    audioUrl, // audioUrl 
    transcriptStr
  ].map(escapeCSV).join(','));
});

fs.writeFileSync('csv_data/formatted-listening.csv', csvRows.join('\n'), 'utf8');
console.log('Successfully generated csv_data/formatted-listening.csv with ' + (csvRows.length - 1) + ' questions.');
