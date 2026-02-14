

## Add Collapsible Channel Sections

### Overview
Make each channel category (e.g. "Text Channels", "Voice Channels") collapsible with a chevron arrow indicator. Arrow points down when expanded (channels visible), points sideways when collapsed (channels hidden). Uses the existing Radix `Collapsible` component already available in the project.

### Changes

**File: `src/components/server/ChannelSidebar.tsx`**

1. Import `ChevronDown` from lucide-react and `Collapsible, CollapsibleTrigger, CollapsibleContent` from the UI components
2. Add a `collapsedCategories` state (`Set<string>`) to track which categories are collapsed
3. Wrap each category's channel list in a `Collapsible` component:
   - The category header becomes a `CollapsibleTrigger` with a rotating chevron icon
   - The channel list becomes `CollapsibleContent`
   - Chevron rotates from pointing down (open) to pointing right (collapsed) via a CSS `rotate` transition
4. The "+" button for admins remains visible even when collapsed

**Visual behavior:**
- All categories start expanded by default
- Clicking the category name or chevron toggles visibility
- Chevron arrow: points down = expanded, points right = collapsed
- Smooth animation on expand/collapse

### Technical Details

```
// State
const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

const toggleCategory = (cat: string) => {
  setCollapsedCategories(prev => {
    const next = new Set(prev);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    return next;
  });
};

// In render, wrap each category:
<Collapsible open={!collapsedCategories.has(category)}>
  <div className="flex items-center justify-between px-1 mb-1">
    <CollapsibleTrigger onClick={() => toggleCategory(category)} className="flex items-center gap-1 ...">
      <ChevronDown className={`h-3 w-3 transition-transform ${collapsedCategories.has(category) ? '-rotate-90' : ''}`} />
      <span className="text-[11px] font-semibold uppercase ...">{category}</span>
    </CollapsibleTrigger>
    {isAdmin && <Plus button />}
  </div>
  <CollapsibleContent>
    {chs.map((ch) => ( /* existing channel rendering */ ))}
  </CollapsibleContent>
</Collapsible>
```

### Files Modified

| File | Changes |
|---|---|
| `src/components/server/ChannelSidebar.tsx` | Add collapsible category sections with chevron toggle |

No database changes required -- the existing `category` column on `channels` already provides the grouping.

