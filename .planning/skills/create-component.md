# SKILL: Create a New UI Component
**Trigger:** Use this skill whenever building a new UI component, modal, or page.

## Execution Steps:
1. **Check SSOT:** Check if a Single Source of Truth component exists for this UI (e.g., `StyledDisplayName`, `AvatarDecorationWrapper`). If it does, USE IT. Never write raw CSS for names/avatars.
2. **Shadcn First:** Assume we use `shadcn-ui`. If a new base element is needed (like Dialog/Dropdown), stop and provide the `npx shadcn@latest add <component>` command for the user to run first.
3. **i18n & RTL Support:** This app supports Arabic (RTL). ALWAYS use logical Tailwind properties (e.g., `ms-2`, `pe-4`, `start-0`) instead of absolute (`ml-2`, `pr-4`, `left-0`) so layouts flip correctly in RTL mode.
4. **Export:** Export as default unless it is a collection of sub-components.
