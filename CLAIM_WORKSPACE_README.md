# Claim Workspace System

## Overview

The Claim Workspace is the primary working environment within the AdjusterAssist application. It provides a unified interface for adjusters to input claim information through multiple modalities (text, voice, OCR) and receive AI-generated responses with recommended next steps.

## Core Components

### 1. **UnifiedInput** (`components/ClaimWorkspace/UnifiedInput.tsx`)

Consolidated input module supporting three input types:

**Features:**

- **Text Input**: Free-form text entry with character limit (2000)
- **Voice Input**: Record and transcribe claim details (requires @react-native-voice/voice)
- **OCR/Image**: Upload photos or capture camera images for text extraction

**Props:**

```typescript
interface UnifiedInputProps {
  onTextInput: (text: string) => void;
  onVoiceInput: (text: string, duration: number) => void;
  onImageInput: (imagePath: string, extractedText: string) => void;
  isProcessing?: boolean;
  placeholder?: string;
}
```

**Implementation Notes:**

- Image picker functionality currently shows "Coming Soon" alerts (requires expo-image-picker)
- Voice recording timer displays duration while recording
- All inputs trigger processing pipeline

### 2. **OutputPanel** (`components/ClaimWorkspace/OutputPanel.tsx`)

Displays AI-generated responses with actionable controls.

**Features:**

- Response display with word/character count
- Copy to clipboard functionality
- Share via system share sheet
- Save to drafts
- Regenerate response option
- Visual stats footer

**Props:**

```typescript
interface OutputPanelProps {
  response: string | null;
  responseType: string;
  isLoading?: boolean;
  onCopy?: (text: string) => void;
  onShare?: (text: string) => void;
  onSave?: (text: string) => void;
}
```

### 3. **NextStepRecommendation** (`components/ClaimWorkspace/NextStepRecommendation.tsx`)

AI-driven recommendations for next actions, prioritized by urgency.

**Features:**

- Priority badges (High, Medium, Low)
- Sequential step numbering
- Icon-based action indicators
- Clickable steps with callback support
- Loading state during generation

**Props:**

```typescript
interface NextStepRecommendationProps {
  nextSteps: NextStep[];
  isLoading?: boolean;
  onStepSelect?: (step: NextStep) => void;
}
```

**Priority Colors:**

- **High**: Red (#E74C3C)
- **Medium**: Orange (#F39C12)
- **Low**: Blue (#3498DB)

### 4. **TimelineLog** (`components/ClaimWorkspace/TimelineLog.tsx`)

Persistent activity tracking displaying all inputs and responses.

**Features:**

- Chronological timeline of all inputs and responses
- Visual indicators for input type (text/voice/OCR)
- Word count and metadata display
- Expandable detail modal for each entry
- Delete functionality
- Refresh capability

**Props:**

```typescript
interface TimelineLogProps {
  entries: TimelineEntry[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onDeleteEntry?: (entryId: string) => void;
}
```

## Services & Utilities

### Input Consolidation Service (`lib/services/inputConsolidation.ts`)

Structures all input types into unified backend format before API submission.

**Key Functions:**

- `consolidateTextInput()`: Format text input
- `consolidateVoiceInput()`: Format voice with duration
- `consolidateOCRInput()`: Format OCR with confidence scores
- `formatForBackendSubmission()`: Prepare for API

**Output Structure:**

```typescript
type ConsolidatedInput = {
  type: "text" | "voice" | "ocr";
  rawContent: string;
  processedContent: string;
  metadata: {
    source: string;
    processingDateTime: string;
    confidence?: number; // OCR
    duration?: number; // Voice
    wordCount: number;
  };
  context?: {
    claimNumber?: string;
    clientName?: string;
    taskType?: string;
  };
};
```

### Timeline Storage Utility (`lib/utils/timelineStorage.ts`)

Local persistence for activity timeline using AsyncStorage.

**Key Functions:**

- `addTimelineEntry()`: Record new input/response
- `getTimeline()`: Retrieve all entries
- `deleteTimelineEntry()`: Remove specific entry
- `updateTimelineEntry()`: Add AI response to entry
- `clearTimeline()`: Clear all history

**Storage Limits:**

- Maximum 100 timeline entries (auto-expiration)
- JSON serialization in AsyncStorage

## Page Structure (`app/(tabs)/claim-workspace.tsx`)

Main screen orchestrating all components and managing state.

**Layout:**

1. **OutputPanel** - Top section showing AI responses
2. **NextStepRecommendation** - Recommendations section
3. **TimelineLog** - Activity history
4. **UnifiedInput** - Fixed bottom input bar (sticky)

**State Management:**

- `currentInput`: Currently processed input
- `aiResponse`: Latest AI response text
- `responseType`: Output format (file_note, email, etc.)
- `nextSteps`: Generated recommendations
- `timeline`: All historical entries

**Data Flow:**

1. User input → UnifiedInput component
2. Input processing → Input consolidation service
3. Timeline storage → Timeline entry creation
4. API call → Generate AI response
5. Update timeline → Add response to entry
6. Generate next steps → Recommendations
7. UI Update → Display panels refresh

## Integration Points

### Backend API Integration

The system expects the following API endpoint:

```typescript
generateResponse(request: GenerateResponseRequest): Promise<GenerateResponseResult>
```

**Current Mock Implementation:**

- Returns placeholder water damage response
- Can be replaced with actual backend calls
- Supports structured input/output types

### Dependencies

- `react-native`
- `expo-router` (navigation)
- `expo-linear-gradient` (UI styling)
- `@expo/vector-icons` (Material Community Icons)
- `@react-native-async-storage/async-storage` (persistence)
- `sonner-native` (toast notifications)

### Optional Dependencies (TODO)

- `@react-native-voice/voice` - Voice transcription
- `expo-image-picker` - Image selection and camera
- `expo-camera` - Direct camera capture
- Google Vision API or AWS Textract - OCR processing

## Usage Example

```typescript
import ClaimWorkspaceScreen from "@/app/(tabs)/claim-workspace";

// The component is automatically available in tab navigation
// Access via: app/(tabs)/claim-workspace
```

## Future Enhancements

1. **Voice Integration**
   - Enable @react-native-voice/voice for real transcription
   - Add recording visualization

2. **Image/OCR Support**
   - Integrate expo-image-picker
   - Connect to OCR API (Google Vision, AWS Textract, or Tesseract.js)

3. **AI Integration**
   - Replace mock responses with actual backend API
   - Support multiple output types (email, file note, etc.)
   - Implement response regeneration

4. **Persistence Enhancements**
   - Sync timeline to cloud backend
   - Archive old entries
   - Export timeline as PDF/CSV

5. **Advanced Features**
   - Drag-to-reorder timeline entries
   - Batch process multiple inputs
   - Save response templates
   - Integration with email/SMS export

## File Structure

```
components/ClaimWorkspace/
├── UnifiedInput.tsx           # Text + Voice + OCR input module
├── OutputPanel.tsx            # AI response display
├── NextStepRecommendation.tsx # Priority-based next steps
└── TimelineLog.tsx            # Activity timeline

lib/
├── services/
│   └── inputConsolidation.ts  # Input structuring
└── utils/
    └── timelineStorage.ts     # Timeline persistence

app/(tabs)/
└── claim-workspace.tsx        # Main page orchestrator
```

## Configuration

### Constants

- Max timeline entries: 100
- Text input limit: 2000 characters
- Default response type: 'file_note'

### Styling

- Primary color: #276bbd
- Success: #10B981
- Warning: #F39C12
- Error: #E74C3C

## Accessibility

All components include:

- WCAG 2.1 compliant touch targets (minimum 48px)
- Color contrast ratios ≥ 4.5:1
- Semantic labels for screen readers
- Clear focus states

## Performance Considerations

1. **TimelineLog**: Flattens on scroll to prevent lag
2. **OutputPanel**: Memoized response text to prevent re-renders
3. **UnifiedInput**: Debounced character count updates
4. **Image Processing**: Runs on separate thread (simulated)

---

**Last Updated:** April 2026
**Version:** 1.0.0
