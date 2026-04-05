import React, { useState, useCallback } from 'react';
import SutraSelection from '../components/sutra/SutraSelection';
import SutraDedication from '../components/sutra/SutraDedication';
import SutraWriter from '../components/sutra/SutraWriter';
import SutraCompletion from '../components/sutra/SutraCompletion';
import { saveSutraProgress } from '../utils/sutraProgress';
import { clearStrokes } from '../utils/sutraDb';
import { getSutraById } from '../data/sutras/index';

// Stages: select → dedicate → write → complete
export default function Sutra() {
  const [stage, setStage] = useState('select');
  const [sutraId, setSutraId] = useState(null);
  const [dedication, setDedication] = useState('');
  const [completionStats, setCompletionStats] = useState(null);

  const handleSelect = useCallback((id, { completed, inProgress }) => {
    setSutraId(id);
    if (inProgress) {
      // Resume writing — skip dedication
      setStage('write');
    } else {
      if (completed) {
        // Reset progress for re-copy, clear old strokes
        saveSutraProgress(id, 0);
        clearStrokes(id).catch(() => {});
      }
      setStage('dedicate');
    }
  }, []);

  const handleStartWriting = useCallback((dedicationText) => {
    setDedication(dedicationText);
    setStage('write');
  }, []);

  const handleWritingComplete = useCallback(({ duration, chars }) => {
    setCompletionStats({ duration, chars });
    setStage('complete');
  }, []);

  const handleExit = useCallback(() => {
    setSutraId(null);
    setDedication('');
    setStage('select');
  }, []);

  const handleDone = useCallback(() => {
    setSutraId(null);
    setDedication('');
    setCompletionStats(null);
    setStage('select');
  }, []);

  switch (stage) {
    case 'select':
      return <SutraSelection onSelect={handleSelect} />;
    case 'dedicate':
      return (
        <SutraDedication
          sutraId={sutraId}
          onStart={handleStartWriting}
          onBack={handleExit}
        />
      );
    case 'write':
      return (
        <SutraWriter
          sutraId={sutraId}
          onComplete={handleWritingComplete}
          onExit={handleExit}
        />
      );
    case 'complete':
      return (
        <SutraCompletion
          sutraId={sutraId}
          dedication={dedication}
          stats={completionStats}
          onDone={handleDone}
        />
      );
    default:
      return <SutraSelection onSelect={handleSelect} />;
  }
}
