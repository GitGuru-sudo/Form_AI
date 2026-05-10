# Hugging Face Integration

FormAI uses a Hugging Face-hosted model workflow to turn user prompts into structured form definitions.

## Model Overview

Model repo:

```text
https://huggingface.co/saksham0510/formai-tinyllama
```

`formai-tinyllama` is the FormAI model artifact. It should be served through a deployed inference endpoint or Hugging Face Space before the backend can call it from production.

## Purpose

The model is used for one job: generate a valid form draft from a user prompt.

Example prompt:

```text
Create a customer satisfaction survey for a restaurant.
```

The expected output is a JSON form with a title, description, and questions that the frontend can edit and publish.

## Model Repo vs API Endpoint

This URL is the model page:

```text
https://huggingface.co/saksham0510/formai-tinyllama
```

The backend should not treat the model page as a `/generate` API by itself. For app runtime, configure `HUGGINGFACE_API_URL` with one of these:

- A deployed Hugging Face Space URL that exposes a form-generation route.
- A dedicated inference endpoint that accepts the backend request shape.
- A compatible hosted API wrapper around the model.

If a Hugging Face Space page URL is used, the backend can resolve URLs shaped like:

```text
https://huggingface.co/spaces/<owner>/<space-name>
```

into:

```text
https://<owner>-<space-name>.hf.space/generate
```

when `HUGGINGFACE_API_PATH=/generate`.

## Expected Backend Contract

The backend sends a `POST` request to the configured endpoint.

Request body:

```json
{
  "prompt": "Create a customer feedback form for a cafe",
  "questionCount": 5,
  "instructions": "You are FormAI..."
}
```

The endpoint should return a JSON form:

```json
{
  "title": "Cafe Customer Feedback Form",
  "description": "Collect feedback about the cafe experience.",
  "questions": [
    {
      "questionId": "q1",
      "questionText": "How would you rate your overall experience?",
      "questionType": "rating",
      "isRequired": true,
      "orderIndex": 0,
      "options": null
    }
  ]
}
```

The backend also accepts equivalent payloads wrapped in `form`, `result`, or `data`.

## Expected Question Shape

Each generated question should include:

| Field | Type | Notes |
|------|------|-------|
| `questionId` | string | Stable ID such as `q1` |
| `questionText` | string | Text shown to the respondent |
| `questionType` | string | Supported form field type |
| `isRequired` | boolean | Whether the respondent must answer |
| `orderIndex` | number | Zero-based display order |
| `options` | string[] or null | Required for choice-style fields |

Common question types include:

```text
short_answer
long_answer
multiple_choice
checkbox
dropdown
rating
date
number
email
phone
yes_no
```

## Environment Variables

Backend variables:

```env
HUGGINGFACE_API_URL=https://huggingface.co/spaces/your-username/your-formai-space
HUGGINGFACE_API_PATH=/generate
HUGGINGFACE_TOKEN=
HUGGINGFACE_TIMEOUT_MS=105000
```

Use `HUGGINGFACE_TOKEN` only when the model, Space, or inference endpoint requires authentication.

`HUGGINGFACE_TIMEOUT_MS` controls how long the backend waits for the Hugging Face endpoint to respond. Default is `105000` (105 seconds). Hugging Face Spaces may need extra time because of cold starts or model inference speed. If the endpoint regularly takes longer, consider warming the Space, reducing generation size, or optimizing the Space inference code.

## Example Backend Env

For a Hugging Face Space:

```env
HUGGINGFACE_API_URL=https://huggingface.co/spaces/your-username/formai-inference
HUGGINGFACE_API_PATH=/generate
HUGGINGFACE_TOKEN=
```

For a direct endpoint that already includes the full route:

```env
HUGGINGFACE_API_URL=https://your-endpoint.example.com/generate
HUGGINGFACE_API_PATH=
HUGGINGFACE_TOKEN=
```

Do not put real tokens in documentation or committed files.

## Backend Behavior

When a form generation request arrives:

1. The frontend calls the backend route `/api/ml/generate`.
2. The backend builds generation instructions from the user prompt.
3. The backend sends `prompt`, `questionCount`, and `instructions` to the configured Hugging Face endpoint.
4. The backend normalizes the returned questions.
5. If the endpoint fails or returns invalid JSON, the backend returns a rule-based fallback form.

## Troubleshooting

- Timeout: Backend timeout is 105 seconds by default (`HUGGINGFACE_TIMEOUT_MS`). Hugging Face Spaces can be slow on cold start — first requests after idle periods may need the full window. If timeouts happen regularly, consider warming the Space, reducing the question count, or optimizing the Space inference code.
- Invalid JSON: The endpoint must return a JSON object with `title` and `questions`.
- Invalid JSON: The endpoint must return a JSON object with `title` and `questions`.
- Private model: Set `HUGGINGFACE_TOKEN` in backend env.
- Wrong URL: The model repo URL is not automatically a `/generate` API.
- Cold start: First request may take longer after the Space has been idle.
- Fallback output: If FormAI returns a generic form, check backend logs for Hugging Face request failure or invalid response warnings.
