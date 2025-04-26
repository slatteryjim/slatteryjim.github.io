import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Select, MenuItem, Button, Card, CardContent, CircularProgress } from '@mui/material';
import axios from 'axios';

const ANKICONNECT_URL = 'http://localhost:8765';

function App() {
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState('');
  const [cards, setCards] = useState([]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch decks on load
  useEffect(() => {
    async function fetchDecks() {
      setLoading(true);
      try {
        const res = await axios.post(ANKICONNECT_URL, {
          action: 'deckNames',
          version: 6
        });
        setDecks(res.data.result);
      } catch (e) {
        setDecks([]);
      }
      setLoading(false);
    }
    fetchDecks();
  }, []);

  // Fetch cards when deck changes
  useEffect(() => {
    if (!selectedDeck) return;
    async function fetchCards() {
      setLoading(true);
      setShowAnswer(false);
      setCurrentCardIdx(0);
      try {
        // Get card IDs
        const res = await axios.post(ANKICONNECT_URL, {
          action: 'findCards',
          version: 6,
          params: { query: `deck:\"${selectedDeck}\"` }
        });
        const cardIds = res.data.result;
        if (!cardIds.length) {
          setCards([]);
          setLoading(false);
          return;
        }
        // Get card info
        const infoRes = await axios.post(ANKICONNECT_URL, {
          action: 'cardsInfo',
          version: 6,
          params: { cards: cardIds }
        });
        setCards(infoRes.data.result);
      } catch (e) {
        setCards([]);
      }
      setLoading(false);
    }
    fetchCards();
  }, [selectedDeck]);

  const handleShowAnswer = () => setShowAnswer(true);
  const handleNextCard = () => {
    setShowAnswer(false);
    setCurrentCardIdx((idx) => Math.min(idx + 1, cards.length - 1));
  };

  const handleDeckChange = (e) => {
    setSelectedDeck(e.target.value);
  };

  const currentCard = cards[currentCardIdx];

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>Anki Browser</Typography>
      <Box sx={{ mb: 3 }}>
        <Select
          value={selectedDeck}
          onChange={handleDeckChange}
          displayEmpty
          fullWidth
        >
          <MenuItem value=""><em>Select Deck</em></MenuItem>
          {decks.map((deck) => (
            <MenuItem key={deck} value={deck}>{deck}</MenuItem>
          ))}
        </Select>
      </Box>
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>}
      {!loading && selectedDeck && !cards.length && (
        <Typography align="center">No cards found in this deck.</Typography>
      )}
      {!loading && currentCard && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">Question</Typography>
            <div dangerouslySetInnerHTML={{ __html: currentCard.question }} />
            {showAnswer && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6">Answer</Typography>
                <div dangerouslySetInnerHTML={{ __html: currentCard.answer }} />
              </Box>
            )}
          </CardContent>
        </Card>
      )}
      {!loading && currentCard && (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          {!showAnswer ? (
            <Button variant="contained" onClick={handleShowAnswer}>Show Answer</Button>
          ) : (
            <Button variant="contained" onClick={handleNextCard} disabled={currentCardIdx === cards.length - 1}>Next Card</Button>
          )}
        </Box>
      )}
      {!loading && currentCard && (
        <Typography align="center" sx={{ mt: 2 }}>
          Card {currentCardIdx + 1} of {cards.length}
        </Typography>
      )}
    </Container>
  );
}

export default App;
