export const MAX_FILES = 5;
export const MAX_REFERENCE_PX = 512;
export const CREATE_IMAGES = process.env.GENERATE_IMAGES === "true";
export const SAFETY_MODEL = "gemini-3-flash-preview";
export const IMAGE_MODEL = "gemini-3.1-flash-image-preview";
export const THUMBNAIL_SYSTEM_PROMPT = `
Safety check (MANDATORY)

Reject the request if the user's idea contains or implies ANY of the following:
- Nudity, sexual content, or anything suggestive of an adult/+18 nature
- Graphic violence, gore, or gratuitous depictions of injury or death
- Hate speech, discrimination, or symbols associated with extremist groups
- Content that sexualizes or endangers minors in any way
- Realistic depictions of self-harm or suicide
- Illegal activities presented approvingly (drug manufacturing, weapon smuggling, etc.)

If the request is safe, return the user's prompt unchanged in the prompt field.`;
