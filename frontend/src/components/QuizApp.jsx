import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, XCircle, Brain, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const QuizApp = ({ apiBase }) => {
  const [topic, setTopic] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateQuiz = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${apiBase}/quiz/generate`, {
        topic: topic.trim()
      });

      setQuiz(response.data);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setSelectedAnswer('');
      setShowResult(false);
    } catch (err) {
      setError('Failed to generate quiz. Please try again.');
      console.error('Quiz generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionId) => {
    setSelectedAnswer(optionId);
  };

  const submitAnswer = () => {
    if (!selectedAnswer) {
      setError('Please select an answer');
      return;
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;

    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: {
        selected: selectedAnswer,
        correct: currentQuestion.correct_answer,
        isCorrect
      }
    }));

    setShowResult(true);
    setError('');
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
      setShowResult(false);
    }
  };

  const resetQuiz = () => {
    setQuiz(null);
    setTopic('');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedAnswer('');
    setShowResult(false);
    setError('');
  };

  const getScore = () => {
    const correctAnswers = Object.values(answers).filter(answer => answer.isCorrect).length;
    return { correct: correctAnswers, total: Object.keys(answers).length };
  };

  const isQuizCompleted = () => {
    return Object.keys(answers).length === quiz?.questions?.length;
  };

  if (!quiz) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Brain className="w-6 h-6" />
              Generate Your Quiz
            </CardTitle>
            <CardDescription>
              Enter any topic and we'll create a personalized quiz for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Input
                placeholder="Enter a topic (e.g., 'Python Programming', 'World History')"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={loading}
                onKeyPress={(e) => e.key === 'Enter' && generateQuiz()}
                className="text-lg py-3"
              />
            </div>

            <Button
              onClick={generateQuiz}
              disabled={loading || !topic.trim()}
              className="w-full py-3 text-lg"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                'Generate Quiz'
              )}
            </Button>

            <div className="text-center text-sm text-gray-500 mt-4">
              <p>Example topics: Mathematics, Science, History, Programming, Geography</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const score = getScore();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6" />
                {quiz.topic}
              </CardTitle>
              <CardDescription>
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </CardDescription>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-lg px-3 py-1">
                Score: {score.correct}/{score.total}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option.id;
              const isCorrect = option.id === currentQuestion.correct_answer;
              const showCorrectAnswer = showResult && isCorrect;
              const showWrongAnswer = showResult && isSelected && !isCorrect;

              return (
                <button
                  key={option.id}
                  onClick={() => !showResult && handleAnswerSelect(option.id)}
                  disabled={showResult}
                  className={`
                    p-4 text-left border-2 rounded-lg transition-all duration-200
                    ${!showResult && 'hover:bg-gray-50 cursor-pointer'}
                    ${isSelected && !showResult ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                    ${showCorrectAnswer ? 'border-green-500 bg-green-50' : ''}
                    ${showWrongAnswer ? 'border-red-500 bg-red-50' : ''}
                    ${showResult ? 'cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {String.fromCharCode(65 + index)}. {option.text}
                    </span>
                    {showCorrectAnswer && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                    {showWrongAnswer && (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={resetQuiz}
            >
              New Quiz
            </Button>

            <div className="space-x-2">
              {!showResult ? (
                <Button
                  onClick={submitAnswer}
                  disabled={!selectedAnswer}
                >
                  Submit Answer
                </Button>
              ) : (
                <>
                  {currentQuestionIndex < quiz.questions.length - 1 ? (
                    <Button onClick={nextQuestion}>
                      Next Question
                    </Button>
                  ) : (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-600">
                        Quiz Complete! Final Score: {score.correct}/{quiz.questions.length}
                      </p>
                      <p className="text-gray-600">
                        ({Math.round((score.correct / quiz.questions.length) * 100)}%)
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%`
          }}
        ></div>
      </div>
    </div>
  );
};

export default QuizApp;