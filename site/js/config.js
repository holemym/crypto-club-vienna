// Site settings the club can change without touching layout code.
export const CONFIG = {
  instagram: 'https://www.instagram.com/cryptoclubvienna/',
  // POST endpoint for the join form (e.g. Formspree, Basin, a Vercel function). Empty = form points people to Instagram.
  formEndpoint: '',
  // Partners as listed on cryptoclubvienna.com ("Brands Who Work With Us", 2026-10-05). Webskill is left out until the club confirms (R4-BRAND.md, question 22).
  partners: [
    { name: 'Bybit EU', role: 'Exchange partner' },
    { name: 'Startup House by Lumia', role: 'Venue for Event Nº2 and Going Onchain' },
    { name: 'WU Vienna', role: 'Supports the club' },
  ],
  // "Ask the club" typewriter in the hero, in the style of Xelantum's AI chat.
  // Labels for the Ask card: it replays common questions; it is not a live chatbot.
  askLabels: { placeholder: 'Questions people ask us', scanning: 'From the club FAQ', thinking: 'Typing', subtitle: 'Student Web3 community', footer: 'Student-driven · Wien · since 2025' },
  ask: [
    // id 'next': the answer is filled from data/events.json (main.js), this text is the fallback
    { id: 'next', q: 'When is the next meetup?', a: 'New dates go up on Instagram at @cryptoclubvienna and on Luma.' },
    { q: 'What is Crypto Club Vienna?', a: 'A Web3 community in Vienna, built by WU students and open to everyone. We make crypto and blockchain more accessible and practical, through meetups, talks and people who explain things plainly.' },
    { q: 'What do you actually learn?', a: 'Three areas. Blockchain and Web3 basics, crypto market structure and risk, and applied Web3 projects. We focus on fundamentals and risk.' },
    { q: 'Who comes to the meetups?', a: 'Students, founders and Web3 investors. Our Crypto Summit 360° sold out at 200 people.' },
  ],
};
