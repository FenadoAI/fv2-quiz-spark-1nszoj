#!/usr/bin/env python3
"""
Test script for quiz generation API
"""
import requests
import json

# Backend URL - adjust if needed
API_BASE = "http://localhost:8001"  # Based on the instructions
API_URL = f"{API_BASE}/api"

def test_quiz_generation():
    """Test the quiz generation endpoint"""
    print("Testing quiz generation API...")

    # Test data
    test_topics = [
        "Python Programming",
        "World History",
        "Mathematics"
    ]

    for topic in test_topics:
        print(f"\nTesting topic: {topic}")

        try:
            response = requests.post(
                f"{API_URL}/quiz/generate",
                json={"topic": topic},
                timeout=30
            )

            if response.status_code == 200:
                quiz_data = response.json()
                print(f"✅ Success! Generated quiz with {len(quiz_data.get('questions', []))} questions")
                print(f"Quiz ID: {quiz_data.get('id')}")
                print(f"Topic: {quiz_data.get('topic')}")

                # Show first question as example
                if quiz_data.get('questions'):
                    first_question = quiz_data['questions'][0]
                    print(f"Sample question: {first_question.get('question')}")
                    print(f"Options: {[opt['text'] for opt in first_question.get('options', [])]}")
            else:
                print(f"❌ Error: {response.status_code} - {response.text}")

        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")

def test_root_endpoint():
    """Test the root API endpoint"""
    print("Testing root endpoint...")

    try:
        response = requests.get(f"{API_URL}/")
        if response.status_code == 200:
            print("✅ Root endpoint working")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Root endpoint error: {response.status_code}")
    except Exception as e:
        print(f"❌ Root endpoint failed: {e}")

if __name__ == "__main__":
    print("🚀 Starting API tests...")
    test_root_endpoint()
    test_quiz_generation()
    print("\n✨ Testing complete!")