from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import json
from google import genai


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Quiz Models
class QuizOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str

class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    options: List[QuizOption]
    correct_answer: str  # The ID of the correct option

class Quiz(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic: str
    questions: List[Question]
    created_at: datetime = Field(default_factory=datetime.utcnow)

class QuizGenerateRequest(BaseModel):
    topic: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Initialize Gemini client
gemini_api_key = os.environ.get('GEMINI_API_KEY')
if gemini_api_key and gemini_api_key != 'your-gemini-api-key-here':
    genai_client = genai.Client(api_key=gemini_api_key)
else:
    genai_client = None

def parse_quiz_from_ai_response(response_text: str, topic: str) -> Quiz:
    """Parse AI response and convert to Quiz model"""
    try:
        # Try to find JSON in the response
        start_idx = response_text.find('[')
        end_idx = response_text.rfind(']') + 1
        if start_idx != -1 and end_idx > start_idx:
            json_str = response_text[start_idx:end_idx]
            questions_data = json.loads(json_str)
        else:
            raise ValueError("No JSON found in response")

        questions = []
        for q_data in questions_data:
            options = [QuizOption(text=opt) for opt in q_data['options']]
            # Find correct answer option ID
            correct_answer_text = q_data['correct_answer']
            correct_option = next((opt for opt in options if opt.text == correct_answer_text), options[0])

            question = Question(
                question=q_data['question'],
                options=options,
                correct_answer=correct_option.id
            )
            questions.append(question)

        return Quiz(topic=topic, questions=questions)

    except Exception as e:
        logger.error(f"Error parsing AI response: {e}")
        # Fallback: create a sample quiz
        return create_sample_quiz(topic)

def create_sample_quiz(topic: str) -> Quiz:
    """Create a sample quiz when AI generation fails"""
    sample_questions = []
    for i in range(10):
        options = [
            QuizOption(text=f"Option A for {topic} question {i+1}"),
            QuizOption(text=f"Option B for {topic} question {i+1}"),
            QuizOption(text=f"Option C for {topic} question {i+1}"),
            QuizOption(text=f"Option D for {topic} question {i+1}")
        ]
        question = Question(
            question=f"Sample question {i+1} about {topic}?",
            options=options,
            correct_answer=options[0].id  # First option is correct
        )
        sample_questions.append(question)

    return Quiz(topic=topic, questions=sample_questions)

@api_router.post("/quiz/generate", response_model=Quiz)
async def generate_quiz(request: QuizGenerateRequest):
    """Generate a quiz based on the provided topic"""
    try:
        if not genai_client:
            logger.warning("Gemini API not configured, using sample quiz")
            return create_sample_quiz(request.topic)

        # Create prompt for quiz generation
        prompt = f"""
        Create a quiz about "{request.topic}" with exactly 10 multiple choice questions.
        Each question should have exactly 4 options (A, B, C, D).

        Return the response as a JSON array with this exact format:
        [
          {{
            "question": "What is the first question about {request.topic}?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Option A"
          }},
          ...
        ]

        Make sure:
        - Questions are clear and educational
        - Options are plausible but only one is correct
        - The correct_answer matches exactly one of the options
        - Cover different aspects of {request.topic}
        - Questions range from basic to intermediate difficulty
        """

        # Generate content using Gemini
        response = genai_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        # Parse the response
        quiz = parse_quiz_from_ai_response(response.text, request.topic)

        # Store quiz in database
        quiz_dict = quiz.dict()
        await db.quizzes.insert_one(quiz_dict)

        return quiz

    except Exception as e:
        logger.error(f"Error generating quiz: {e}")
        # Return sample quiz as fallback
        return create_sample_quiz(request.topic)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
