import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const AnkiBrowser = () => {
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [decks, setDecks] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedDecks, setSelectedDecks] = useState(new Set());
  const [selectedModel, setSelectedModel] = useState(null);
  const [notes, setNotes] = useState([]);
  const [modelFields, setModelFields] = useState([]);
  const [stats, setStats] = useState({ deckCounts: {}, modelCounts: {} });

  // AnkiConnect API helper
  const invokeAnkiConnect = async (action, params = {}) => {
    try {
      const response = await fetch('http://localhost:8765', {
        method: 'POST',
        body: JSON.stringify({ action, version: 6, params }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.result;
    } catch (error) {
      console.error(`AnkiConnect ${action} failed:`, error);
      throw error;
    }
  };

  // Check connection and load initial data
  useEffect(() => {
    const initialize = async () => {
      try {
        await invokeAnkiConnect('version');
        setConnectionStatus('connected');
        
        // Load decks
        const deckNames = await invokeAnkiConnect('deckNames');
        const deckStats = {};
        for (const deck of deckNames) {
          const count = await invokeAnkiConnect('findNotes', {
            query: `deck:"${deck}"`
          });
          deckStats[deck] = count.length;
        }
        setDecks(deckNames);
        
        // Load models (note types)
        const modelNames = await invokeAnkiConnect('modelNames');
        const modelStats = {};
        for (const model of modelNames) {
          const count = await invokeAnkiConnect('findNotes', {
            query: `note:"${model}"`
          });
          modelStats[model] = count.length;
        }
        setModels(modelNames);
        
        setStats({ deckCounts: deckStats, modelCounts: modelStats });
      } catch (error) {
        setConnectionStatus('failed');
      }
    };
    
    initialize();
  }, []);

  // Update notes when filters change
  useEffect(() => {
    const loadNotes = async () => {
      if (!selectedModel) return;
      
      try {
        let query = `note:"${selectedModel}"`;
        if (selectedDecks.size > 0) {
          const deckFilter = Array.from(selectedDecks)
            .map(deck => `deck:"${deck}"`)
            .join(' OR ');
          query += ` (${deckFilter})`;
        }
        
        const noteIds = await invokeAnkiConnect('findNotes', { query });
        const noteData = await invokeAnkiConnect('notesInfo', { notes: noteIds });
        setNotes(noteData);
        
        // Get model fields
        const modelFields = await invokeAnkiConnect('modelFieldNames', { modelName: selectedModel });
        setModelFields(['Deck', ...modelFields]);
        
        // Update deck counts for filtered notes
        const filteredDeckStats = {};
        for (const deck of decks) {
          const deckNoteIds = await invokeAnkiConnect('findNotes', {
            query: `note:"${selectedModel}" deck:"${deck}"`
          });
          filteredDeckStats[deck] = deckNoteIds.length;
        }
        setStats(prev => ({
          ...prev,
          deckCounts: filteredDeckStats
        }));
      } catch (error) {
        console.error('Failed to load notes:', error);
      }
    };
    
    loadNotes();
  }, [selectedModel, selectedDecks]);

  const toggleDeck = (deck) => {
    const newSelection = new Set(selectedDecks);
    if (newSelection.has(deck)) {
      newSelection.delete(deck);
    } else {
      newSelection.add(deck);
    }
    setSelectedDecks(newSelection);
  };

  if (connectionStatus === 'checking') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2">Connecting to AnkiConnect...</span>
      </div>
    );
  }

  if (connectionStatus === 'failed') {
    return (
      <Alert variant="destructive" className="m-4">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to connect to AnkiConnect. Please ensure Anki is running and AnkiConnect is installed.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Alert className="mb-4">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertDescription>Connected to AnkiConnect</AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Decks */}
        <Card>
          <CardHeader>
            <CardTitle>Decks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {decks.map(deck => (
                <div
                  key={deck}
                  className={`p-2 rounded cursor-pointer flex justify-between items-center ${
                    selectedDecks.has(deck) ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => toggleDeck(deck)}
                >
                  <span>{deck}</span>
                  <span className="text-gray-500">{stats.deckCounts[deck] || 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Models */}
        <Card>
          <CardHeader>
            <CardTitle>Note Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {models.map(model => (
                <div
                  key={model}
                  className={`p-2 rounded cursor-pointer flex justify-between items-center ${
                    selectedModel === model ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedModel(model)}
                >
                  <span>{model}</span>
                  <span className="text-gray-500">{stats.modelCounts[model] || 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Notes {selectedModel ? `(${selectedModel})` : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedModel ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {modelFields.map(field => (
                        <th key={field} className="text-left p-2 bg-gray-100">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {notes.map(note => (
                      <tr key={note.noteId} className="border-b hover:bg-gray-50">
                        <td className="p-2">{note.cards[0]?.deck || ''}</td>
                        {Object.values(note.fields).map((field, index) => (
                          <td key={index} className="p-2">
                            {field.value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                Select a note type to view notes
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnkiBrowser;