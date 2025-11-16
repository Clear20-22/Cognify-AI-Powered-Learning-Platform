"""
AI Service - Handles AI/ML operations with Groq and Gemini
"""

import os
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class AIService:
    """
    AI Service supporting both Groq and Gemini for educational content generation.
    Provides intelligent responses, content generation, and adaptive learning.
    Groq is primary, Gemini is fallback.
    """
    
    def __init__(self):
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.groq_client = None
        self.gemini_model = None
        self.groq_model_name = "llama-3.3-70b-versatile"
        self.gemini_model_name = "gemini-2.0-flash-exp"
        self.active_provider = None
        self._initialize()
    
    def _initialize(self) -> None:
        """Initialize AI clients (Groq primary, Gemini fallback)."""
        # Try Groq first
        if self.groq_key:
            try:
                from groq import Groq
                self.groq_client = Groq(api_key=self.groq_key)
                self.active_provider = "groq"
                logger.info(f"✅ Groq AI initialized successfully (Model: {self.groq_model_name})")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Groq AI: {e}")
        
        # Try Gemini as fallback
        if self.gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_key)
                self.gemini_model = genai.GenerativeModel(self.gemini_model_name)
                if not self.active_provider:
                    self.active_provider = "gemini"
                logger.info(f"✅ Gemini AI initialized successfully (Model: {self.gemini_model_name})")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Gemini AI: {e}")
        
        if not self.active_provider:
            logger.warning("⚠️  No AI API keys found. Using demo mode.")
            logger.warning("⚠️  Add GROQ_API_KEY or GEMINI_API_KEY to .env file")
    
    def generate_response(self, prompt: str, context: Optional[str] = None) -> str:
        """Generate AI response to a prompt."""
        if not self.active_provider:
            return self._demo_response(prompt)
        
        full_prompt = self._build_prompt(prompt, context)
        
        # Try Groq first
        if self.groq_client:
            try:
                response = self.groq_client.chat.completions.create(
                    model=self.groq_model_name,
                    messages=[
                        {"role": "system", "content": "You are an expert educational AI assistant for Cognify."},
                        {"role": "user", "content": full_prompt}
                    ],
                    temperature=0.7,
                    max_tokens=2000
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.error(f"Groq AI error, trying Gemini fallback: {e}")
        
        # Fallback to Gemini
        if self.gemini_model:
            try:
                response = self.gemini_model.generate_content(full_prompt)
                return response.text
            except Exception as e:
                logger.error(f"Gemini AI error: {e}")
                return f"I apologize, but I encountered an error: {str(e)}"
        
        return self._demo_response(prompt)
    
    def _build_prompt(self, prompt: str, context: Optional[str] = None) -> str:
        """Build a comprehensive prompt for the AI."""
        system_context = """You are an expert educational AI assistant for Cognify, a modern learning platform.

Your role:
- Provide clear, accurate, and engaging educational content
- Adapt explanations to the user's level
- Use examples and analogies to clarify concepts
- Encourage critical thinking
- Be patient and supportive

Always:
- Break down complex topics into digestible parts
- Use markdown formatting for better readability
- Provide practical examples
- Encourage questions and deeper exploration
"""
        
        if context:
            return f"{system_context}\n\nContext: {context}\n\nUser Question: {prompt}"
        return f"{system_context}\n\nUser Question: {prompt}"
    
    def _demo_response(self, prompt: str) -> str:
        """Provide demo response when AI is not available."""
        return f"""🤖 **Demo Mode Response**

You asked: *{prompt}*

**Note:** This is a demo response. To enable real AI-powered responses:
1. Get a Groq API key from: https://console.groq.com/keys
   OR
2. Get a Gemini API key from: https://makersuite.google.com/app/apikey
3. Add to your `.env` file:
   - `GROQ_API_KEY=your_key_here` (Primary)
   - `GEMINI_API_KEY=your_key_here` (Fallback)
4. Restart the backend server

**Features available with real AI:**
- Intelligent, context-aware responses
- Personalized learning paths
- Adaptive difficulty adjustment
- Custom exam generation
- Detailed explanations with examples

Ready to unlock the full potential of Cognify! 🚀"""
    
    def generate_chat_conversation(
        self,
        topic: str,
        difficulty: str = "intermediate",
        num_exchanges: int = 3
    ) -> List[Dict[str, str]]:
        """Generate an educational chat conversation on a topic."""
        if not self.active_provider:
            return self._demo_conversation(topic, difficulty)
        
        prompt = f"""Generate an educational conversation about {topic} at {difficulty} difficulty level.

Create {num_exchanges} question-answer exchanges that:
1. Start with fundamentals and build up complexity
2. Include practical examples
3. Encourage deeper understanding
4. Are engaging and conversational

Format each exchange as:
Q: [Student question]
A: [Expert answer]

Make it natural and educational."""
        
        # Try Groq first
        if self.groq_client:
            try:
                response = self.groq_client.chat.completions.create(
                    model=self.groq_model_name,
                    messages=[
                        {"role": "system", "content": "You are an expert educational AI assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.8,
                    max_tokens=2000
                )
                return self._parse_conversation(response.choices[0].message.content)
            except Exception as e:
                logger.error(f"Groq conversation error, trying Gemini: {e}")
        
        # Fallback to Gemini
        if self.gemini_model:
            try:
                response = self.gemini_model.generate_content(prompt)
                return self._parse_conversation(response.text)
            except Exception as e:
                logger.error(f"Gemini conversation error: {e}")
        
        return self._demo_conversation(topic, difficulty)
    
    def _parse_conversation(self, text: str) -> List[Dict[str, str]]:
        """Parse AI-generated conversation into structured format."""
        messages = []
        lines = text.split('\n')
        current_q = None
        current_a = []
        
        for line in lines:
            line = line.strip()
            if line.startswith('Q:'):
                if current_q and current_a:
                    messages.append({
                        "role": "user",
                        "content": current_q
                    })
                    messages.append({
                        "role": "assistant",
                        "content": ' '.join(current_a)
                    })
                    current_a = []
                current_q = line[2:].strip()
            elif line.startswith('A:'):
                current_a.append(line[2:].strip())
            elif current_q and line:
                current_a.append(line)
        
        # Add last exchange
        if current_q and current_a:
            messages.append({"role": "user", "content": current_q})
            messages.append({"role": "assistant", "content": ' '.join(current_a)})
        
        return messages if messages else self._demo_conversation("the topic", "intermediate")
    
    def _demo_conversation(self, topic: str, difficulty: str) -> List[Dict[str, str]]:
        """Generate demo conversation."""
        return [
            {
                "role": "user",
                "content": f"Can you explain {topic} to me?"
            },
            {
                "role": "assistant",
                "content": f"I'd be happy to explain {topic}! This is a demo conversation. Enable AI for detailed, personalized explanations."
            },
            {
                "role": "user",
                "content": f"What are the key concepts in {topic}?"
            },
            {
                "role": "assistant",
                "content": f"The key concepts would be explained here with real AI. Get your Groq API key to unlock full features!"
            }
        ]
    
    def generate_exam_questions(
        self,
        topic: str,
        difficulty: str = "intermediate",
        num_questions: int = 5
    ) -> List[Dict[str, Any]]:
        """Generate exam questions on a topic."""
        if not self.active_provider:
            return self._demo_exam(topic, num_questions)
        
        prompt = f"""Create {num_questions} {difficulty} level exam questions about {topic}.

For each question provide:
1. Question text
2. Four answer options (A, B, C, D)
3. Correct answer
4. Brief explanation

Format as JSON-like structure:
Question 1: [text]
A) [option]
B) [option]
C) [option]
D) [option]
Correct: [letter]
Explanation: [text]"""
        
        # Try Groq first
        if self.groq_client:
            try:
                response = self.groq_client.chat.completions.create(
                    model=self.groq_model_name,
                    messages=[
                        {"role": "system", "content": "You are an expert exam creator for educational purposes."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=2000
                )
                return self._parse_exam_questions(response.choices[0].message.content)
            except Exception as e:
                logger.error(f"Groq exam error, trying Gemini: {e}")
        
        # Fallback to Gemini
        if self.gemini_model:
            try:
                response = self.gemini_model.generate_content(prompt)
                return self._parse_exam_questions(response.text)
            except Exception as e:
                logger.error(f"Gemini exam error: {e}")
        
        return self._demo_exam(topic, num_questions)
    
    def _parse_exam_questions(self, text: str) -> List[Dict[str, Any]]:
        """Parse AI-generated exam questions."""
        # Simplified parsing - in production, use more robust parsing
        questions = []
        current = {}
        
        for line in text.split('\n'):
            line = line.strip()
            if line.startswith('Question'):
                if current:
                    questions.append(current)
                current = {"question": line.split(':', 1)[1].strip() if ':' in line else line, "options": []}
            elif line.startswith(('A)', 'B)', 'C)', 'D)')):
                current.get("options", []).append(line[2:].strip())
            elif line.startswith('Correct:'):
                current["correct"] = line.split(':', 1)[1].strip()
            elif line.startswith('Explanation:'):
                current["explanation"] = line.split(':', 1)[1].strip()
        
        if current:
            questions.append(current)
        
        return questions if questions else self._demo_exam("the topic", 3)
    
    def _demo_exam(self, topic: str, num_questions: int) -> List[Dict[str, Any]]:
        """Generate demo exam questions."""
        return [
            {
                "question": f"Sample question {i+1} about {topic}?",
                "options": [
                    "Option A (Demo)",
                    "Option B (Demo)",
                    "Option C (Demo)",
                    "Option D (Demo)"
                ],
                "correct": "A",
                "explanation": "This is a demo question. Enable AI for real adaptive exams!"
            }
            for i in range(min(num_questions, 3))
        ]
    
    async def generate_study_notes(self, text: str) -> str:
        """Generate structured study notes from text content."""
        prompt = f"""Generate comprehensive study notes from the following content. 
Structure the notes with:
- Main topics and subtopics
- Key concepts and definitions
- Important points to remember
- Examples where applicable

Content:
{text[:3000]}

Format the notes in a clear, organized manner suitable for studying."""
        
        return self.generate_response(prompt)
    
    async def generate_summary(self, text: str) -> str:
        """Generate a concise summary of the text content."""
        prompt = f"""Provide a clear and concise summary of the following content. 
Highlight the main ideas and key takeaways.

Content:
{text[:3000]}

Summary:"""
        
        return self.generate_response(prompt)
