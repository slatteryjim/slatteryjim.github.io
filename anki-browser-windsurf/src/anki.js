import axios from 'axios';

const ANKICONNECT_URL = 'http://localhost:8765';

export async function getDeckNames() {
  const res = await axios.post(ANKICONNECT_URL, {
    action: 'deckNames',
    version: 6
  });
  return res.data.result;
}

export async function findCards(deck) {
  const res = await axios.post(ANKICONNECT_URL, {
    action: 'findCards',
    version: 6,
    params: { query: `deck:\"${deck}\"` }
  });
  return res.data.result;
}

export async function getCardsInfo(cardIds) {
  const res = await axios.post(ANKICONNECT_URL, {
    action: 'cardsInfo',
    version: 6,
    params: { cards: cardIds }
  });
  return res.data.result;
}

export async function reviewCard(cardId, ease) {
  // ease: 1=Again, 2=Hard, 3=Good, 4=Easy
  return axios.post(ANKICONNECT_URL, {
    action: 'answerCards',
    version: 6,
    params: { answers: [{ cardId, ease }] }
  });
}
