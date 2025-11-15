# 📝 Notes Feature - Quick Start Guide

## How to Use the Store Important Notes Feature

### 💾 Saving Notes from Chat

1. **Start a conversation** with the AI in the Chat page
2. **Wait for AI response** - The AI will provide helpful information
3. **Look for the bookmark icon** 🔖 next to any AI message
4. **Click the bookmark** to save the response as a note
5. **See confirmation** - You'll get an alert: "✅ Note saved successfully!"

### 📚 Viewing Your Notes

#### Option 1: From Chat Sidebar
1. Look at the left sidebar in Chat page
2. Click on **"My Notes"** (bookmark icon)
3. You'll be taken to the Notes page

#### Option 2: Direct Navigation
1. Navigate to: `http://localhost:5173/notes`
2. Or use the navigation bar at the top

### 🔍 Managing Notes

#### Search Notes
- Use the search bar at the top
- Type keywords from your note content
- Results filter in real-time

#### View Full Note
1. Click **"View Full"** on any note card
2. A modal opens with complete content
3. Click X or click outside to close

#### Edit Note
1. Click the **edit icon** (pencil) on a note card
2. Modify the text in the textarea
3. Click **"Save"** to update
4. Click **"Cancel"** to discard changes

#### Delete Note
1. Click the **delete icon** (trash) on a note card
2. Confirmation modal appears
3. Click **"Delete"** to permanently remove
4. Click **"Cancel"** to keep the note

### 🎯 Features at a Glance

| Feature | Status | Description |
|---------|--------|-------------|
| 💾 Save from Chat | ✅ Working | One-click save with bookmark icon |
| 📋 View All Notes | ✅ Working | Grid layout with previews |
| 🔍 Search | ✅ Working | Real-time content filtering |
| ✏️ Edit | ✅ Working | Inline editing in note cards |
| 🗑️ Delete | ✅ Working | With confirmation modal |
| 📱 Responsive | ✅ Working | Mobile-friendly grid |
| 🔗 Chat Linking | ✅ Working | Shows which notes came from chats |
| ⏰ Timestamps | ✅ Working | "2h ago" or "Nov 15" format |

### 🖥️ Testing Steps

1. **Backend**: Ensure running on http://localhost:8000
   ```bash
   cd backend
   python main.py
   ```

2. **Frontend**: Ensure running on http://localhost:5173
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Flow**:
   - Go to http://localhost:5173
   - Sign in or use anonymous mode
   - Navigate to Chat page
   - Send message: "Explain the Pythagorean theorem"
   - Wait for AI response
   - Click bookmark icon on AI response
   - Click "My Notes" in sidebar
   - Verify note appears in grid
   - Try search, edit, delete operations

### 🎨 Visual Guide

```
Chat Page Layout:
┌─────────────────────────────────────────────────────┐
│ Sidebar                                             │
│ ┌─────────┐                                        │
│ │ 🔖 My    │  ← Click here to view notes          │
│ │   Notes  │                                        │
│ └─────────┘                                        │
│                                                     │
│ Chat Messages:                                      │
│ ┌──────────────────────────────────────┐          │
│ │ User: Explain Pythagorean theorem    │          │
│ └──────────────────────────────────────┘          │
│                                                     │
│ ┌──────────────────────────────────────┐          │
│ │ AI: The Pythagorean theorem states   │          │
│ │ that a² + b² = c²...                 │          │
│ │ 📋 🔖 ← Save as Note button          │          │
│ └──────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘

Notes Page Layout:
┌─────────────────────────────────────────────────────┐
│ Navigation: Dashboard | AI Chat | My Notes          │
├─────────────────────────────────────────────────────┤
│ 🔍 Search notes...                                  │
├─────────────────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│ │ Note 1   │  │ Note 2   │  │ Note 3   │         │
│ │ Content  │  │ Content  │  │ Content  │         │
│ │ preview  │  │ preview  │  │ preview  │         │
│ │ ...      │  │ ...      │  │ ...      │         │
│ │          │  │          │  │          │         │
│ │ 2h ago   │  │ 5h ago   │  │ Nov 15   │         │
│ │ View│✏️│🗑│  │View│✏️│🗑│  │View│✏️│🗑│         │
│ └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
```

### 🚀 API Endpoints Used

The Notes feature uses these backend endpoints:

```
POST   /api/notes                  - Save new note
GET    /api/notes/{note_id}        - Get specific note
GET    /api/users/{user_id}/notes  - Get all user notes
PATCH  /api/notes/{note_id}        - Update note
DELETE /api/notes/{note_id}        - Delete note
```

### 💡 Tips

1. **Save often**: Don't lose important AI explanations
2. **Use search**: Quickly find notes by keywords
3. **Edit as needed**: Update notes with your own insights
4. **Review regularly**: Visit Notes page to review saved content
5. **Context matters**: Notes show when they were saved and link to chats

### 🐛 Troubleshooting

**Problem**: Bookmark button not appearing
- **Solution**: Make sure you're looking at AI messages, not user messages
- AI messages have gray background
- User messages have red background

**Problem**: "Failed to save note" error
- **Solution**: Check backend is running on port 8000
- Check MongoDB connection is active
- Look at browser console for detailed error

**Problem**: Notes not loading
- **Solution**: Check you're signed in with valid user ID
- Refresh the page
- Check backend logs for errors

**Problem**: Search not working
- **Solution**: Type exact words from note content
- Search is case-insensitive
- Clear search to see all notes again

### 📊 MongoDB Collection

Notes are stored in MongoDB with this structure:

```javascript
{
  "_id": "note_abc123def456",
  "id": "note_abc123def456",
  "user_id": "user_789xyz",
  "content": "The Pythagorean theorem states...",
  "chat_id": "chat_123abc",
  "pdf_name": null,
  "tags": [],
  "created_at": "2025-11-15T12:47:45.123Z",
  "updated_at": "2025-11-15T12:47:45.123Z"
}
```

### 🎓 Learning Tips

Use notes to:
- 📌 Bookmark key concepts
- 📝 Save formulas and definitions
- 💡 Keep important examples
- 🔍 Build personal knowledge base
- 📚 Study for exams
- 🧠 Review difficult topics

---

## Next Steps

After mastering the Notes feature, explore:
- Dashboard for progress tracking
- Exam generation from chat
- History view for past conversations
- Google OAuth login (when configured)

For detailed technical documentation, see `NOTES_FEATURE.md`

**Happy learning! 🎉**
