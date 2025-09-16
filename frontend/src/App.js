import React, { useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import QuizApp from "./components/QuizApp.jsx";

const API_BASE = process.env.REACT_APP_API_URL || 'https://8001-i2x3zbtnb3mgu11h749ho.e2b.app';
const API = `${API_BASE}/api`;

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🧠 AI Quiz Generator
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Generate instant quizzes on any topic to test your knowledge.
            Powered by AI to create engaging, educational questions.
          </p>
        </header>
        <QuizApp apiBase={API} />
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />}>
            <Route index element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
