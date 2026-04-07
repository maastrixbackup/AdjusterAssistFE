/**
 * Input Consolidation Service
 * Structures all input types (text, voice, OCR) into a unified backend format
 */

export type ConsolidatedInput = {
  type: "text" | "voice" | "ocr";
  rawContent: string;
  processedContent: string;
  metadata: {
    source: string;
    processingDateTime: string;
    confidence?: number; // For OCR
    duration?: number; // For voice
    wordCount: number;
  };
  context?: {
    claimNumber?: string;
    clientName?: string;
    taskType?: string;
  };
};

/**
 * Consolidate text input into structured format
 */
export function consolidateTextInput(
  content: string,
  context?: ConsolidatedInput["context"],
): ConsolidatedInput {
  return {
    type: "text",
    rawContent: content,
    processedContent: content.trim(),
    metadata: {
      source: "manual_text_input",
      processingDateTime: new Date().toISOString(),
      wordCount: content.trim().split(/\s+/).length,
    },
    context,
  };
}

/**
 * Consolidate voice input into structured format
 */
export function consolidateVoiceInput(
  content: string,
  duration: number,
  context?: ConsolidatedInput["context"],
): ConsolidatedInput {
  return {
    type: "voice",
    rawContent: content,
    processedContent: content.trim(),
    metadata: {
      source: "voice_to_text",
      processingDateTime: new Date().toISOString(),
      duration,
      wordCount: content.trim().split(/\s+/).length,
    },
    context,
  };
}

/**
 * Consolidate OCR input into structured format
 */
export function consolidateOCRInput(
  extractedText: string,
  imageName: string,
  confidence: number = 0.95,
  context?: ConsolidatedInput["context"],
): ConsolidatedInput {
  return {
    type: "ocr",
    rawContent: extractedText,
    processedContent: cleanOCRText(extractedText),
    metadata: {
      source: "image_ocr",
      processingDateTime: new Date().toISOString(),
      confidence,
      wordCount: extractedText.trim().split(/\s+/).length,
    },
    context,
  };
}

/**
 * Clean OCR extracted text (handle common OCR artifacts)
 */
function cleanOCRText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters
    .replace(/\n\s*\n/g, "\n") // Remove multiple blank lines
    .trim();
}

/**
 * Format consolidated input for backend API submission
 */
export function formatForBackendSubmission(
  consolidatedInput: ConsolidatedInput,
  outputType: string,
  fileId?: number,
): {
  userInput: string;
  inputType: string;
  metadata: Record<string, unknown>;
  context: Record<string, unknown>;
  fileId?: number;
} {
  return {
    userInput: consolidatedInput.processedContent,
    inputType: consolidatedInput.type,
    metadata: consolidatedInput.metadata,
    context: consolidatedInput.context || {},
    fileId,
  };
}
