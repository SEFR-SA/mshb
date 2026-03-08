

## Plan: Discord-style Audio Quick-Access Popovers in UserPanel

### Current State

- **AudioSettingsContext** only manages `globalMuted`/`globalDeafened` toggles. It has **no** device selection or volume state.
- Device preferences (`micDeviceId`, `speakerDeviceId`) live exclusively in `VoiceVideoTab` via `localStorage("mshb_device_prefs")` — not shared through context.
- Volume levels are not tracked anywhere (no input/output volume sliders exist outside the mic test meter).

### Approach

Rather than over-engineering the context, I will:
- **Extend `AudioSettingsContext`** to include device lists, active device IDs, input/output volume (0-100), and setters. This makes the popover and VoiceVideoTab share the same source of truth.
- **Refactor `VoiceVideoTab`** to consume the context instead of managing its own localStorage state for devices.
- Build two compact popover components inline in UserPanel (or as a shared `AudioControlPopover`).

### Step-by-step

#### 1. Extend `AudioSettingsContext.tsx`

Add to the context interface and provider:
- `micDevices`, `speakerDevices` — enumerated on mount via `navigator.mediaDevices.enumerateDevices()`
- `micDeviceId`, `speakerDeviceId` — active selections, synced to `localStorage("mshb_device_prefs")`
- `setMicDeviceId(id)`, `setSpeakerDeviceId(id)` — update + persist
- `inputVolume` (0–200, default 100), `outputVolume` (0–200, default 100) — sliders
- `setInputVolume`, `setOutputVolume` — update + persist to `localStorage("mshb_audio_volumes")`

#### 2. Create `AudioControlPopover` component

New file: `src/components/layout/AudioControlPopover.tsx`

Props: `type: "input" | "output"`, controls which devices/volume to show.

**Inside the popover** (opens `side="top"`):
- **Device list**: `RadioGroup` of available devices, active one selected. Uses `RadioGroupItem` per device.
- **Volume slider**: `Slider` component (0–200), with a percentage label.
- `Separator` divider.
- **"Voice Settings" link**: A ghost `Button` that navigates to `/settings` with the voice tab pre-selected (or dispatches a custom event to open SettingsModal to voice tab).

Uses: `Popover`, `PopoverTrigger`, `PopoverContent`, `RadioGroup`, `RadioGroupItem`, `Slider`, `Separator`, `Button`.

#### 3. Update `UserPanel.tsx`

Replace the current standalone mic and headphones buttons with grouped pairs:

```text
┌─────┬──┐  ┌─────┬──┐  ┌─────┐
│ Mic │ ▾│  │ 🎧  │ ▾│  │ ⚙️  │
└─────┴──┘  └─────┴──┘  └─────┘
```

- Main icon button: toggles mute/deafen (existing behavior).
- Chevron button (`ChevronDown`, ~`h-7 w-4`): opens `AudioControlPopover` for that type.
- Tight `gap-0` grouping with a subtle visual divider between the icon and chevron.

#### 4. Refactor `VoiceVideoTab.tsx`

- Remove local device enumeration and localStorage reads.
- Import device lists and active IDs from `useAudioSettings()` instead.
- Keep mic-test meter logic local (it's specific to this tab).

### Files Changed

| File | Change |
|------|--------|
| `src/contexts/AudioSettingsContext.tsx` | Add device lists, active IDs, volumes, persistence |
| `src/components/layout/AudioControlPopover.tsx` | **New** — reusable popover for input/output device + volume |
| `src/components/layout/UserPanel.tsx` | Add chevron buttons opening AudioControlPopover |
| `src/components/settings/tabs/VoiceVideoTab.tsx` | Consume context for devices instead of local state |

