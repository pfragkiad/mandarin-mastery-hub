export type Word = { id: string; hanzi: string; pinyin: string; meaning: string; type: string; collection: string; level: string; sentence: string; translation: string };
export const words: Word[] = [
  { id: 'wo', hanzi: '我', pinyin: 'wǒ', meaning: 'I · me', type: 'Pronoun', collection: 'Everyday essentials', level: 'Sample', sentence: '我是学生。', translation: 'I am a student.' },
  { id: 'nihao', hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'Hello', type: 'Greeting', collection: 'Everyday essentials', level: 'Sample', sentence: '你好，很高兴认识你。', translation: 'Hello, nice to meet you.' },
  { id: 'zhongguo', hanzi: '中国', pinyin: 'Zhōng guó', meaning: 'China', type: 'Proper noun', collection: 'Places & travel', level: 'Sample', sentence: '我想去中国。', translation: 'I want to go to China.' },
  { id: 'xuesheng', hanzi: '学生', pinyin: 'xué sheng', meaning: 'Student', type: 'Noun', collection: 'School & learning', level: 'Sample', sentence: '她是学生。', translation: 'She is a student.' },
  { id: 'ai', hanzi: '爱', pinyin: 'ài', meaning: 'Love', type: 'Verb', collection: 'Everyday essentials', level: 'HSK 1', sentence: '我爱我的家。', translation: 'I love my family.' },
  { id: 'ba', hanzi: '八', pinyin: 'bā', meaning: 'Eight', type: 'Number', collection: 'Numbers & time', level: 'HSK 1', sentence: '现在八点。', translation: 'It is eight o’clock now.' },
  { id: 'xiexie', hanzi: '谢谢', pinyin: 'xiè xie', meaning: 'Thank you', type: 'Expression', collection: 'Everyday essentials', level: 'HSK 1', sentence: '谢谢你的帮助。', translation: 'Thank you for your help.' },
  { id: 'shui', hanzi: '水', pinyin: 'shuǐ', meaning: 'Water', type: 'Noun', collection: 'Everyday essentials', level: 'HSK 1', sentence: '我想喝水。', translation: 'I would like to drink water.' },
  { id: 'mingtian', hanzi: '明天', pinyin: 'míng tiān', meaning: 'Tomorrow', type: 'Noun', collection: 'Numbers & time', level: 'HSK 1', sentence: '明天见！', translation: 'See you tomorrow!' },
  { id: 'laoshi', hanzi: '老师', pinyin: 'lǎo shī', meaning: 'Teacher', type: 'Noun', collection: 'School & learning', level: 'HSK 1', sentence: '我的老师很好。', translation: 'My teacher is very nice.' },
  { id: 'beijing', hanzi: '北京', pinyin: 'Běi jīng', meaning: 'Beijing', type: 'Proper noun', collection: 'Places & travel', level: 'HSK 1', sentence: '我住在北京。', translation: 'I live in Beijing.' },
  { id: 'jin', hanzi: '今天', pinyin: 'jīn tiān', meaning: 'Today', type: 'Noun', collection: 'Numbers & time', level: 'HSK 1', sentence: '今天天气很好。', translation: 'The weather is lovely today.' },
];
export const collections = ['Everyday essentials', 'School & learning', 'Places & travel', 'Numbers & time'];
export function filterWords(items: Word[], query: string, collection = 'All collections', level = 'All levels', status = 'All words', saved: string[] = []) {
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = normalize(query.trim());
  return items.filter(w => normalize(`${w.hanzi} ${w.pinyin} ${w.meaning} ${w.type}`).includes(q) && (collection === 'All collections' || w.collection === collection) && (level === 'All levels' || w.level === level) && (status === 'All words' || saved.includes(w.id)));
}
export function speak(text: string, slow = false) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = slow ? 0.55 : 0.8;
  const voice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('zh'));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}
export const pageHead = (title: string, description: string) => ({ meta: [{ title: `${title} · Mandarin Tutor` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} · Mandarin Tutor` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] });
