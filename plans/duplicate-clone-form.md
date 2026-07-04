# Duplicate / Clone Form

> Status: Not started. Effort: S. Area: Form building & UX.

## Goal
Let an author clone an existing form into a new draft with a fresh `shareToken`, a `" (Copy)"` title suffix, and all questions copied. Add a backend `duplicateForm` controller + `POST /api/forms/:id/duplicate` route, and a "Duplicate" action in both the dashboard `FormCard` and the Sidebar recent-forms list that calls it and refreshes.

## Dependencies to install
None (`uuid` already a backend dependency).

## Files touched
- `backend/src/controllers/forms.controller.ts` — edit — add `duplicateForm`.
- `backend/src/routes/forms.routes.ts` — edit — add the route.
- `frontend/src/components/FormCard.tsx` — edit — add a Duplicate button + prop.
- `frontend/src/components/Sidebar.tsx` — edit — add a duplicate action to recent forms.

## Step-by-step

### Step 1 — Add the `duplicateForm` controller (`backend/src/controllers/forms.controller.ts`)
**Find** (the end of `createForm`, just before `getForms`):
```ts
    await newForm.save();
    logger.info('Form created', { formId: newForm._id, title: newForm.title });
    res.status(201).json(newForm);
  } catch (err: any) {
    logger.error('Failed to create form', { error: err.message });
    res.status(500).json({ message: err.message });
  }
};

export const getForms = async (req: Request, res: Response) => {
```
**Replace with**:
```ts
    await newForm.save();
    logger.info('Form created', { formId: newForm._id, title: newForm.title });
    res.status(201).json(newForm);
  } catch (err: any) {
    logger.error('Failed to create form', { error: err.message });
    res.status(500).json({ message: err.message });
  }
};

export const duplicateForm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = req.clerkUserId;

    if (!clerkUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const source = await Form.findOne({ _id: id, clerkUserId }).lean();
    if (!source) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Strip server-owned fields; everything else (questions, theme, collect*
    // flags, validation) is copied verbatim.
    const {
      _id: _omitId,
      shareToken: _omitToken,
      createdAt: _omitCreated,
      updatedAt: _omitUpdated,
      __v: _omitV,
      ...rest
    } = source as any;

    const copy = new Form({
      ...rest,
      clerkUserId,
      title: `${source.title} (Copy)`,
      shareToken: uuidv4().substring(0, 8),
      isActive: source.isActive,
    });

    await copy.save();
    logger.info('Form duplicated', { sourceId: id, newId: copy._id });
    res.status(201).json(copy);
  } catch (err: any) {
    logger.error('Failed to duplicate form', { error: err.message });
    res.status(500).json({ message: err.message });
  }
};

export const getForms = async (req: Request, res: Response) => {
```

### Step 2 — Add the route (`backend/src/routes/forms.routes.ts`)
**Find**:
```ts
router.post('/', requireAuth, formsController.createForm);
router.get('/', requireAuth, formsController.getForms);
```
**Replace with**:
```ts
router.post('/', requireAuth, formsController.createForm);
router.post('/:id/duplicate', requireAuth, formsController.duplicateForm);
router.get('/', requireAuth, formsController.getForms);
```

### Step 3 — Add a Duplicate button to `FormCard` (`frontend/src/components/FormCard.tsx`)
**Find** (imports):
```ts
import { MessageSquare, Edit2, Play, Square, Trash2 } from "lucide-react"
```
**Replace with**:
```ts
import { MessageSquare, Edit2, Play, Square, Trash2, Copy } from "lucide-react"
```

**Find** (the props interface):
```ts
interface FormCardProps {
  form: Form
  responseCount: number
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function FormCard({ form, responseCount, onToggle, onDelete }: FormCardProps) {
```
**Replace with**:
```ts
interface FormCardProps {
  form: Form
  responseCount: number
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

export function FormCard({ form, responseCount, onToggle, onDelete, onDuplicate }: FormCardProps) {
```

**Find** (the icon-button group in the header):
```tsx
          <div className="flex gap-2">
            <Link href={`/forms/${form._id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                <Edit2 size={16} />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400" onClick={() => onDelete(form._id!)}>
              <Trash2 size={16} />
            </Button>
          </div>
```
**Replace with**:
```tsx
          <div className="flex gap-2">
            <Link href={`/forms/${form._id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                <Edit2 size={16} />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-400" onClick={() => onDuplicate(form._id!)} aria-label="Duplicate form">
              <Copy size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400" onClick={() => onDelete(form._id!)}>
              <Trash2 size={16} />
            </Button>
          </div>
```

> The page that renders `<FormCard>` (the dashboard forms list) must pass `onDuplicate`. Add a handler there that calls the API and refreshes. Reference implementation to drop into that page's component:
> ```tsx
> const handleDuplicate = async (id: string) => {
>   try {
>     const token = await getToken()
>     const res = await api.post(`/api/forms/${id}/duplicate`, {}, {
>       headers: { Authorization: `Bearer ${token}` },
>     })
>     // Refresh the list — refetch, or optimistically prepend res.data.
>     setForms((prev) => [res.data, ...prev])
>     toast.success("Form duplicated")
>   } catch (err) {
>     console.error(err)
>     toast.error("Couldn't duplicate form", { description: "Please try again." })
>   }
> }
> ```
> Then pass `onDuplicate={handleDuplicate}` on each `<FormCard>`. (Match the existing `getToken`/`useToast`/`setForms` names already in that list page.)

### Step 4 — Add a duplicate action to the Sidebar recent list (`frontend/src/components/Sidebar.tsx`)
**Find** (imports):
```ts
import { Plus, LayoutDashboard, History, Menu, LogOut, Trash2, Loader2 } from "lucide-react"
```
**Replace with**:
```ts
import { Plus, LayoutDashboard, History, Menu, LogOut, Trash2, Loader2, Copy } from "lucide-react"
```

**Find** (the `handleDelete` function — add a sibling handler after it):
```ts
    } catch (err) {
      console.error("Failed to delete form:", err)
      toast.error("Couldn't delete form", { description: "Please try again." })
    } finally {
      setDeletingId(null)
    }
  }
```
**Replace with**:
```ts
    } catch (err) {
      console.error("Failed to delete form:", err)
      toast.error("Couldn't delete form", { description: "Please try again." })
    } finally {
      setDeletingId(null)
    }
  }

  const handleDuplicate = async (e: React.MouseEvent, form: Form) => {
    e.preventDefault()
    e.stopPropagation()
    const formId = form._id
    if (!formId) return
    try {
      const token = await getToken()
      const res = await api.post(`/api/forms/${formId}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setRecentForms(prev => [res.data, ...prev].slice(0, 5))
      toast.success("Form duplicated")
    } catch (err) {
      console.error("Failed to duplicate form:", err)
      toast.error("Couldn't duplicate form", { description: "Please try again." })
    }
  }
```

**Find** (the per-form row with the delete button):
```tsx
            <button
              type="button"
              onClick={(e) => handleDelete(e, form)}
              disabled={deletingId === form._id}
              aria-label={`Delete ${form.title}`}
              title="Delete form"
              className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-md text-slate-500 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
            >
              {deletingId === form._id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
```
**Replace with**:
```tsx
            <button
              type="button"
              onClick={(e) => handleDuplicate(e, form)}
              aria-label={`Duplicate ${form.title}`}
              title="Duplicate form"
              className="absolute right-9 flex h-7 w-7 items-center justify-center rounded-md text-slate-500 opacity-0 transition-all hover:bg-indigo-500/10 hover:text-indigo-400 focus:opacity-100 group-hover:opacity-100"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleDelete(e, form)}
              disabled={deletingId === form._id}
              aria-label={`Delete ${form.title}`}
              title="Delete form"
              className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-md text-slate-500 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
            >
              {deletingId === form._id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
```
(The duplicate button sits at `right-9` so it doesn't overlap the delete button at `right-1.5`; the Link already reserves `pr-9` of padding — bump the Link to `pr-16` if both buttons feel cramped.)

## Edge cases & notes
- Ownership is enforced by `findOne({ _id, clerkUserId })` — a user can only clone their own forms.
- The copy resets `shareToken` to a new uuid slice (8 chars), matching `createForm`'s format, so the original's public link is untouched.
- `isActive` is copied from the source; flip to `true` if you'd rather every clone start open.
- Questions keep their `questionId`s — fine because they're scoped per-form document; no cross-form collision.
- The Sidebar only shows 5 recent forms; `.slice(0, 5)` keeps the list bounded after prepending.

## Verification
- `cd backend && rtk tsc --noEmit`.
- `cd frontend && rtk tsc`.
- Manual: from the dashboard, click Duplicate on a card → a new "<title> (Copy)" card appears with the same questions and 0 responses. Open it in the editor — questions/theme present. Confirm the original's public link still works and the copy has a different `/f/<token>`.
- From the Sidebar recent list, hover a form → Copy + Trash icons; click Copy → toast + new entry at top.
