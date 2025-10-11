# Database Schema Documentation

## Overview
This document describes the MongoDB database schema for the Cultural Translation Agent application. The application uses three main collections to store user memories, agent logs, and legacy translations.

## Environment Configuration

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
FIREWORKS_API_KEY=your_fireworks_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Collections

### 1. `user_memories`

**Purpose**: Stores learned preferences and interaction history for each user across different languages.

**Schema**:
```typescript
{
  userId: string;              // User identifier (e.g., "demo-user")
  preferences: {
    [languagePair: string]: {  // Key format: "English-Spanish"
      formality: number;        // Range: 0-1 (0=very casual, 1=very formal)
      directness: number;       // Range: 0-1 (0=indirect, 1=direct)
      interactionCount: number; // Number of translations for this language pair
      lastUpdated: Date;        // Timestamp of last update
    }
  };
  evolution: Array<{
    timestamp: Date;            // When this preference was recorded
    formality: number;          // Historical formality value
    directness: number;         // Historical directness value
  }>;
  feedbackStats: {
    consecutiveNegative: number;  // Tracks negative feedback streak
    totalPositive: number;        // Lifetime positive feedback count
    totalNegative: number;        // Lifetime negative feedback count
    lastFeedbackTimestamp: Date;  // When feedback was last received
  };
}
```

**Indexes**:
```javascript
db.user_memories.createIndex({ userId: 1 }, { unique: true });
db.user_memories.createIndex({ "preferences.lastUpdated": -1 });
```

**Example Document**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "demo-user",
  "preferences": {
    "English-Spanish": {
      "formality": 0.75,
      "directness": 0.65,
      "interactionCount": 5,
      "lastUpdated": "2025-10-11T10:30:00.000Z"
    },
    "English-Japanese": {
      "formality": 0.90,
      "directness": 0.45,
      "interactionCount": 3,
      "lastUpdated": "2025-10-10T14:20:00.000Z"
    }
  },
  "evolution": [
    {
      "timestamp": "2025-10-09T09:00:00.000Z",
      "formality": 0.70,
      "directness": 0.60
    },
    {
      "timestamp": "2025-10-10T15:00:00.000Z",
      "formality": 0.75,
      "directness": 0.65
    }
  ],
  "feedbackStats": {
    "consecutiveNegative": 0,
    "totalPositive": 8,
    "totalNegative": 2,
    "lastFeedbackTimestamp": "2025-10-11T10:35:00.000Z"
  }
}
```

**Update Logic**:
- **After Translation**: Increment `interactionCount`, record in `evolution` array
- **After Feedback**:
  - Positive: Reinforce current preferences slightly (+0.05)
  - Negative: Adjust preferences in opposite direction (-0.10)
  - Update `feedbackStats`

---

### 2. `agent_logs`

**Purpose**: Stores detailed logs of every translation request, including reasoning and feedback.

**Schema**:
```typescript
{
  _id: ObjectId;                // Auto-generated MongoDB ID
  userId: string;               // User who made the request
  timestamp: Date;              // When translation occurred
  originalText: string;         // Input text
  translation: string;          // Output translation
  targetLanguage: string;       // Target language (e.g., "Spanish")
  reasoning: string[];          // Array of reasoning steps
  confidence: number;           // Range: 0-1
  memoryUsed: boolean;          // Whether user memory was available
  preferences?: {               // Optional user-provided preferences
    formality: number;
    context: string;
  };
  feedback?: 'positive' | 'negative';  // User feedback (null initially)
  feedbackReason?: string;      // Optional reason for negative feedback
  feedbackTimestamp?: Date;     // When feedback was given
}
```

**Indexes**:
```javascript
db.agent_logs.createIndex({ userId: 1, timestamp: -1 });
db.agent_logs.createIndex({ _id: 1 }); // For messageId lookup
db.agent_logs.createIndex({ feedback: 1 });
db.agent_logs.createIndex({ timestamp: -1 });
```

**Example Document**:
```json
{
  "_id": "68eab7e5d19b26bd62d7d0a0",
  "userId": "demo-user",
  "timestamp": "2025-10-11T10:30:00.000Z",
  "originalText": "I need to schedule a professional meeting.",
  "translation": "Necesito programar una reunión profesional.",
  "targetLanguage": "Spanish",
  "reasoning": [
    "Detected formal tone, business context, neutral sentiment",
    "Found 5 previous interactions for English-Spanish",
    "Applied learned formality: 0.75, directness: 0.65"
  ],
  "confidence": 0.82,
  "memoryUsed": true,
  "feedback": "positive",
  "feedbackTimestamp": "2025-10-11T10:35:00.000Z"
}
```

**Analytics Queries**:
```javascript
// Average confidence by user
db.agent_logs.aggregate([
  { $group: {
    _id: "$userId",
    avgConfidence: { $avg: "$confidence" },
    totalTranslations: { $sum: 1 }
  }}
]);

// Feedback distribution
db.agent_logs.aggregate([
  { $match: { feedback: { $exists: true } } },
  { $group: {
    _id: "$feedback",
    count: { $sum: 1 }
  }}
]);

// Daily translation volume
db.agent_logs.aggregate([
  { $group: {
    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
    count: { $sum: 1 }
  }},
  { $sort: { _id: -1 } }
]);
```

---

### 3. `translations` (Legacy)

**Purpose**: Legacy collection for backward compatibility with old translation API.

**Schema**:
```typescript
{
  _id: ObjectId;
  originalText: string;
  translatedText: string;
  sourceCulture: string;
  targetCulture: string;
  context?: string;
  timestamp: Date;
}
```

**Note**: This collection is maintained for backward compatibility but is not actively used by the new agent-based system.

---

## Data Flow Diagrams

### Translation Flow
```
User Input
    ↓
[Agent-Translate API]
    ↓
Check user_memories → Apply preferences if found
    ↓
Call Fireworks AI with context
    ↓
Generate translation + reasoning
    ↓
Save to agent_logs
    ↓
Update user_memories (increment interactionCount)
    ↓
Return to User
```

### Feedback Flow
```
User Submits Feedback
    ↓
[Feedback API]
    ↓
Update agent_logs (add feedback field)
    ↓
Retrieve user_memories
    ↓
Adjust preferences based on feedback:
  - Positive: +5% formality
  - Negative: -10% formality
    ↓
Update feedbackStats
    ↓
Save updated user_memories
    ↓
Return success
```

### Memory Learning Algorithm
```javascript
// Pseudo-code for preference adjustment
if (feedback === 'positive') {
  formality = Math.min(1.0, formality + 0.05);
  directness = Math.min(1.0, directness + 0.05);
  consecutiveNegative = 0;
} else if (feedback === 'negative') {
  formality = Math.max(0.0, formality - 0.10);
  directness = Math.max(0.0, directness - 0.10);
  consecutiveNegative += 1;

  if (consecutiveNegative >= 3) {
    // Significant adjustment needed
    formality = 0.5; // Reset to neutral
    directness = 0.5;
  }
}
```

---

## API Endpoints & Database Operations

### POST `/api/agent-translate`
**Database Operations**:
1. Read from `user_memories` (userId)
2. Write to `agent_logs` (new document)
3. Update `user_memories` (increment interactionCount)

### POST `/api/feedback`
**Database Operations**:
1. Update `agent_logs` (add feedback field)
2. Read from `user_memories` (userId)
3. Update `user_memories` (adjust preferences, update feedbackStats)

### GET `/api/memory?userId=X&language=Y`
**Database Operations**:
1. Read from `user_memories` (userId)
2. Filter preferences by language

### GET `/api/dashboard?userId=X`
**Database Operations**:
1. Read from `user_memories` (userId)
2. Aggregate from `agent_logs` (userId, last 30 days)

---

## Performance Considerations

### Indexing Strategy
```javascript
// Essential indexes for production
db.user_memories.createIndex({ userId: 1 }, { unique: true });
db.agent_logs.createIndex({ userId: 1, timestamp: -1 });
db.agent_logs.createIndex({ _id: 1 });
```

### Query Optimization
- Use projection to limit returned fields
- Implement pagination for large result sets
- Cache frequently accessed user memories

### Example Optimized Query
```javascript
// Instead of returning full document
db.user_memories.find({ userId: "demo-user" });

// Project only needed fields
db.user_memories.find(
  { userId: "demo-user" },
  { preferences: 1, feedbackStats: 1, _id: 0 }
);
```

---

## Migration Scripts

### Initial Setup
```javascript
// Run this to initialize collections with proper validation
db.createCollection("user_memories", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "preferences"],
      properties: {
        userId: { bsonType: "string" },
        preferences: { bsonType: "object" },
        evolution: { bsonType: "array" },
        feedbackStats: { bsonType: "object" }
      }
    }
  }
});

db.createCollection("agent_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "timestamp", "originalText", "translation", "reasoning", "confidence"],
      properties: {
        userId: { bsonType: "string" },
        timestamp: { bsonType: "date" },
        originalText: { bsonType: "string" },
        translation: { bsonType: "string" },
        reasoning: { bsonType: "array" },
        confidence: {
          bsonType: "double",
          minimum: 0,
          maximum: 1
        }
      }
    }
  }
});
```

### Data Cleanup
```javascript
// Remove logs older than 90 days
db.agent_logs.deleteMany({
  timestamp: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
});

// Clean up orphaned memories (users with no logs in 30 days)
const activeUsers = db.agent_logs.distinct("userId", {
  timestamp: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
});

db.user_memories.deleteMany({
  userId: { $nin: activeUsers }
});
```

---

## Backup & Recovery

### Backup Strategy
```bash
# Daily backup
mongodump --uri="$MONGODB_URI" --out=/backups/$(date +%Y%m%d)

# Weekly full backup
mongodump --uri="$MONGODB_URI" --gzip --archive=/backups/weekly_$(date +%Y%m%d).gz
```

### Restore
```bash
# Restore specific collection
mongorestore --uri="$MONGODB_URI" --nsInclude="cultural_translator.user_memories" /backups/20251011

# Full restore
mongorestore --uri="$MONGODB_URI" --gzip --archive=/backups/weekly_20251011.gz
```

---

## Security Best Practices

1. **Connection Security**
   - Use SSL/TLS for all connections
   - Store credentials in environment variables
   - Rotate API keys regularly

2. **Access Control**
   - Create read-only users for analytics
   - Limit write access to application service accounts
   - Enable MongoDB authentication

3. **Data Privacy**
   - Don't store PII without encryption
   - Implement data retention policies
   - Allow users to delete their data (GDPR compliance)

---

## Troubleshooting

### Common Issues

**Issue**: Memory not persisting
```javascript
// Check if document exists
db.user_memories.findOne({ userId: "demo-user" });

// Verify connection
db.adminCommand({ ping: 1 });
```

**Issue**: Slow queries
```javascript
// Analyze query performance
db.agent_logs.find({ userId: "demo-user" }).explain("executionStats");

// Check index usage
db.agent_logs.aggregate([{ $indexStats: {} }]);
```

**Issue**: Duplicate user memories
```javascript
// Find duplicates
db.user_memories.aggregate([
  { $group: { _id: "$userId", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
]);

// Remove duplicates (keep newest)
// Manual intervention required
```

---

## Future Enhancements

1. **Sharding Strategy**
   - Shard key: `userId` (for horizontal scaling)
   - Enable sharding when user base exceeds 100K

2. **Time-Series Data**
   - Consider MongoDB time-series collections for `agent_logs`
   - Optimize for time-based queries and analytics

3. **Real-time Analytics**
   - Implement change streams for live dashboards
   - Use aggregation pipelines for materialized views

4. **Caching Layer**
   - Implement Redis for frequently accessed user memories
   - Cache user preferences for 5-10 minutes

---

## Contact & Support

For database-related issues or questions, please refer to:
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose ODM Docs](https://mongoosejs.com/)
- Project GitHub Issues
