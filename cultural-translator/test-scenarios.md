# Test Scenarios for Cultural Translation Agent

This document provides comprehensive test scenarios to validate the translation agent's functionality, error handling, and cultural adaptation capabilities.

## 1. Formal Business Context

### Input Text:
```
I need to schedule a professional meeting with our international clients to discuss the quarterly business report and upcoming proposals.
```

### Target Language: Japanese

### Expected Reasoning Steps:
1. **ANALYZING**: Detected formal tone, business context, neutral sentiment
2. **REMEMBERING**: Memory status (varies - either "No previous interactions" or user preferences)
3. **ADAPTING**: Applied formal formality, business terminology

### Expected Confidence Range: 70-85%
- Higher if user has interaction history (75-85%)
- Lower for first-time users (70-75%)

### Cultural Notes:
- Should use formal Japanese business language (敬語 - keigo)
- Adapt "meeting" to culturally appropriate business meeting term
- Maintain professional distance in translation

---

## 2. Casual Friendly Context

### Input Text:
```
Hey buddy! Thanks for helping me out yesterday. You're awesome! Let's hang out this weekend and grab some coffee.
```

### Target Language: Spanish

### Expected Reasoning Steps:
1. **ANALYZING**: Detected casual tone, personal context, positive sentiment
2. **REMEMBERING**: User preferences (if available)
3. **ADAPTING**: Applied informal/casual formality, personal communication style

### Expected Confidence Range: 75-90%
- Casual text is generally easier to translate
- High confidence due to straightforward sentiment

### Cultural Notes:
- Should use informal Spanish (tú/vos forms)
- Adapt "buddy" to culturally appropriate Spanish equivalent (amigo, tío, etc.)
- Maintain friendly, relaxed tone

---

## 3. Technical Context

### Input Text:
```
The API endpoint is returning a 500 error. We need to debug the database connection and implement better error handling in the server code.
```

### Target Language: German

### Expected Reasoning Steps:
1. **ANALYZING**: Detected neutral tone, technical context, neutral sentiment
2. **REMEMBERING**: User preferences (if available)
3. **ADAPTING**: Applied technical terminology, neutral but precise formality

### Expected Confidence Range: 70-80%
- Technical terms may reduce confidence slightly
- Some English technical terms might be preserved

### Cultural Notes:
- Technical English terms (API, debug, server) may be kept or adapted
- Should use appropriate German technical language
- Maintain clarity and precision

---

## 4. Idioms and Cultural References

### Input Text:
```
Don't worry, it's a piece of cake! Just break the ice with a friendly joke and you'll hit the nail on the head.
```

### Target Language: French

### Expected Reasoning Steps:
1. **ANALYZING**: Detected casual tone, general context, positive sentiment, **contains idioms**
2. **REMEMBERING**: User preferences (if available)
3. **ADAPTING**: Applied idiom localization, casual formality

### Expected Confidence Range: 50-65%
- **Lower confidence expected** due to idioms
- Idioms should be adapted to French equivalents, not literal translations

### Cultural Notes:
- "piece of cake" → French equivalent (e.g., "c'est du gâteau" or "c'est simple comme bonjour")
- "break the ice" → French equivalent (e.g., "briser la glace")
- "hit the nail on the head" → French equivalent (e.g., "mettre dans le mille")

---

## 5. Questions and Polite Requests

### Input Text:
```
Could you please send me the document by tomorrow? I would really appreciate it if you could prioritize this request.
```

### Target Language: Korean

### Expected Reasoning Steps:
1. **ANALYZING**: Detected formal tone, business/general context, positive/polite sentiment
2. **REMEMBERING**: User preferences (if available)
3. **ADAPTING**: Applied formal formality, polite communication style

### Expected Confidence Range: 75-85%
- Polite requests are common in translations
- High confidence for straightforward request

### Cultural Notes:
- Should use Korean honorific system appropriately (존댓말 - jondaetmal)
- Adapt politeness levels to Korean cultural norms
- "please" and "appreciate" should reflect Korean politeness structures

---

## Edge Cases to Test

### 1. Very Long Text (Near Limit)
- **Input**: 450+ character text
- **Expected**: Warning at 400+ characters ("Getting long"), error at 500+
- **Should**: Show character count warnings progressively

### 2. Special Characters
- **Input**: "¡Hola! ¿Cómo estás? 你好 #hashtag @mention"
- **Expected**: Warning about special characters if ratio > 50%
- **Should**: Handle gracefully, translate what's translatable

### 3. Same Text Twice
- **Input**: Translate identical text in two requests
- **Expected**: Second translation should show improved confidence
- **Reasoning**: "3 interactions" message after 3rd translation

### 4. Empty or Too Short
- **Input**: "" or "a"
- **Expected**: Client-side validation error
- **Message**: "Text must be at least 2 characters long"

### 5. Mixed Languages
- **Input**: "I want to say gracias to you for your help"
- **Expected**: Should handle mixed language input
- **Confidence**: May be slightly lower (65-75%)

---

## Error Scenarios to Test

### 1. API Timeout
- **Simulate**: Very long/complex text or slow network
- **Expected**: "Agent is thinking deeply..." after 5 seconds
- **Expected Error**: "Translation request took too long" after 30 seconds

### 2. Database Connection Failure
- **Expected Behavior**: Graceful degradation
- **Message**: "Database unavailable - proceeding with contextual inference"
- **Result**: Translation still completes without memory

### 3. Invalid API Key
- **Expected Error**: "Translation service is not properly configured"
- **User Action**: Contact support

### 4. Rate Limiting
- **Expected Error**: "Too many requests. Please wait a moment and try again"
- **Retry**: Should work after 2-3 retry attempts with backoff

### 5. Network Failure
- **Expected Error**: "Network error. Please check your connection and try again"
- **Should**: Trigger error shake animation

---

## Success Indicators

### Visual Feedback:
1. ✅ **Confetti animation** on high confidence (≥70%)
2. 🧠 **Memory badge** changes from "No Memory Yet" to "Memory Used"
3. ⚠️ **Low confidence warning** appears when confidence <60%
4. 🎯 **Milestone messages** at 3, 5, 10 translations

### Expected User Experience:
- Smooth animations throughout
- Clear error messages
- Helpful guidance for edge cases
- Learning progression visible over multiple translations

---

## Validation Checklist

- [ ] All 5 test scenarios translate successfully
- [ ] Confidence ranges match expectations
- [ ] Reasoning steps appear in correct order
- [ ] Cultural adaptations are appropriate
- [ ] Idioms are localized (not literal)
- [ ] Error handling gracefully degrades
- [ ] Client-side validation prevents invalid inputs
- [ ] Timeout handling works correctly
- [ ] Memory system learns from interactions
- [ ] Visual feedback (confetti, warnings) displays correctly
