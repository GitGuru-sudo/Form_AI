still the issue is of personal information i want u to diagnoze this coorectly still the responses are not shown

check this plan was implemented or not completely # Plan To Fix Clickable Fields And Responses View

## Summary
- Diagnostics: backend/frontend `tsc --noEmit` both pass.
- Current dirty changes already include the auth publish fix; do not revert those.
- Personal-info toggles look broken because `Switch` uses undefined Tailwind tokens/classes like `bg-primary`, `bg-input`, and `data-checked:*`; with this Tailwind setup they render like a small dark dot.
- The personal-info cards are not the clickable target; only the tiny switch/label area can toggle.
- Public forms only render Full Name, Email, and Phone, so Age, DOB, and Gender can be enabled but cannot actually be filled.

## Key Changes
- Fix [switch.tsx](<C:\Users\saksh\Documents\ML\frontend\src\components\ui\switch.tsx>) with Tailwind classes that exist in this project: slate unchecked track, indigo checked track, white thumb, visible focus ring, pointer cursor.
- Update [FieldSelector.tsx](<C:\Users\saksh\Documents\ML\frontend\src\components\FieldSelector.tsx>) so each whole personal-info card is clickable and keyboard accessible, using typed field IDs instead of `(config as any)`.
- Update [f/[token]/page.tsx](<C:\Users\saksh\Documents\ML\frontend\src\app\f\[token]\page.tsx>) to render all enabled personal fields: Full Name, Email, Phone, Age, Date of Birth, and Gender.
- Redesign [responses/page.tsx](<C:\Users\saksh\Documents\ML\frontend\src\app\forms\[id]\responses\page.tsx>) from a wide table into vertical response cards:
  - Top: form title, response count, right-side “Edit Form” and “Download Excel”.
  - Each response card: “Personal Information”, “Filled at 10:00 PM, 21/05/2026”, then answers downward.
  - Sort latest first, earliest last.
- Change backend export in [responses.controller.ts](<C:\Users\saksh\Documents\ML\backend\src\controllers\responses.controller.ts>) from CSV to real `.xlsx` using `exceljs`; headers should include Filled At, enabled personal fields, then question columns.

## Test Plan
- Click every personal-info card in create preview and edit form; selected state must visibly toggle.
- Publish a form with Age, DOB, and Gender enabled; open public link and confirm those fields appear.
- Submit multiple responses and confirm newest response appears at the top.
- Confirm response card timestamp format is `h:mm a, dd/MM/yyyy`.
- Click “Edit Form” from responses page and verify it opens `/forms/{id}`.
- Click “Download Excel” and verify Excel opens an `.xlsx` with all personal fields and answers.

## Assumptions
- Use true Excel `.xlsx`, not renamed CSV.
- Display timestamps in the user/browser local timezone.
- Keep the existing auth/publish fixes already present in the dirty worktree.
and on frontend side 
change this line Got it! How many questions would you like? (1-50, or press Enter for 10) to 
Got it! How many questions would you like? (1-10, or press Enter for 5)
and also after genrating if the user want to chnage any type of any  question allow the user to change the form (see this is implemented correctly or not )

also at last create a md file name deployment.md and write code in step which i need to do on aws server assumptions docker already installed repo not clone and check this for refrence .github\workflows\deploy.yml