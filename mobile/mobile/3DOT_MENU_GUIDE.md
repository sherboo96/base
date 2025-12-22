# 3-Dot Menu - Visual Guide

## Overview
Each registration card now has a **3-dot menu (⋮)** in the top-right corner that shows context-aware options based on the registration's current state.

---

## Menu Appearance by Status

### 1️⃣ DRAFT Registration
```
┌─────────────────────────────────────┐
│ John Doe              [Draft] [⋮]   │
│ جون دو                               │
├─────────────────────────────────────┤
│ 📧 john@example.com                 │
│ 🎫 EVENT12345                       │
│ 💺 No Seat Assigned                 │
│ 🏢 Ministry of Education            │
├─────────────────────────────────────┤
│ Email Status:                       │
│ ✅ Registration Email Sent          │
│ ⭕ Confirmation Email Not Sent      │
│ ⭕ Final Approval Not Sent          │
└─────────────────────────────────────┘

Menu Options:
┌─────────────────────────────────┐
│ ✓ Approve Registration          │
│ ✗ Reject Registration (Red)     │
└─────────────────────────────────┘
```

---

### 2️⃣ APPROVED Registration (No Seat)
```
┌─────────────────────────────────────┐
│ John Doe           [Approved] [⋮]   │
│ جون دو                               │
├─────────────────────────────────────┤
│ 📧 john@example.com                 │
│ 🎫 EVENT12345                       │
│ 💺 No Seat Assigned                 │
│ 🏢 Ministry of Education            │
├─────────────────────────────────────┤
│ Email Status:                       │
│ ✅ Registration Email Sent          │
│ ✅ Confirmation Email Sent          │
│ ⭕ Final Approval Not Sent          │
└─────────────────────────────────────┘

Menu Options:
┌─────────────────────────────────┐
│ 💺 Set Seat Number              │
└─────────────────────────────────┘
```

---

### 3️⃣ APPROVED Registration (With Seat, Email Not Sent)
```
┌─────────────────────────────────────┐
│ John Doe           [Approved] [⋮]   │
│ جون دو                               │
├─────────────────────────────────────┤
│ 📧 john@example.com                 │
│ 🎫 EVENT12345                       │
│ 💺 Seat: A12                        │
│ 🏢 Ministry of Education            │
├─────────────────────────────────────┤
│ Email Status:                       │
│ ✅ Registration Email Sent          │
│ ✅ Confirmation Email Sent          │
│ ⭕ Final Approval Not Sent          │
└─────────────────────────────────────┘

Menu Options:
┌─────────────────────────────────┐
│ ✏️ Edit Seat Number (A12)       │
│ ─────────────────────────────   │
│ ✉️ Send Final Approval Email    │
└─────────────────────────────────┘
```

---

### 4️⃣ APPROVED Registration (With Seat, Email Sent)
```
┌─────────────────────────────────────┐
│ John Doe           [Approved] [⋮]   │
│ جون دو                               │
├─────────────────────────────────────┤
│ 📧 john@example.com                 │
│ 🎫 EVENT12345                       │
│ 💺 Seat: A12                        │
│ 🏢 Ministry of Education            │
├─────────────────────────────────────┤
│ Email Status:                       │
│ ✅ Registration Email Sent          │
│ ✅ Confirmation Email Sent          │
│ ✅ Final Approval Sent              │
└─────────────────────────────────────┘

Menu Options:
┌─────────────────────────────────┐
│ ✏️ Edit Seat Number (A12)       │
│ ─────────────────────────────   │
│ 🔄 Resend Final Approval Email  │
└─────────────────────────────────┘
```

---

### 5️⃣ REJECTED Registration
```
┌─────────────────────────────────────┐
│ John Doe           [Rejected] [⋮]   │
│ جون دو                               │
├─────────────────────────────────────┤
│ 📧 john@example.com                 │
│ 🎫 EVENT12345                       │
│ 💺 No Seat Assigned                 │
│ 🏢 Ministry of Education            │
├─────────────────────────────────────┤
│ Email Status:                       │
│ ✅ Registration Email Sent          │
│ ⭕ Confirmation Email Not Sent      │
│ ⭕ Final Approval Not Sent          │
└─────────────────────────────────────┘

Menu Options:
┌─────────────────────────────────┐
│ ⚠️ No actions available         │
└─────────────────────────────────┘
```

---

## Decision Tree

```
                    [Registration Card]
                            │
                            ├─ Status?
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    [DRAFT]            [APPROVED]          [REJECTED]
        │                   │                   │
        ├─ Menu:            ├─ Has Seat?        └─ Menu:
        │  • Approve        │                       • No actions
        │  • Reject         │
        │                   ├─ No ──→ Menu:
        │                   │         • Set Seat
        │                   │
        │                   └─ Yes ──→ Email Sent?
        │                              │
        │                              ├─ No ──→ Menu:
        │                              │         • Edit Seat
        │                              │         • Send Final Approval
        │                              │
        │                              └─ Yes ──→ Menu:
        │                                         • Edit Seat
        │                                         • Resend Final Approval
        │
        └─ Actions:
           • Approve → Sends confirmation email → Status: APPROVED
           • Reject → Status: REJECTED
```

---

## User Flows

### Flow 1: Approve and Complete
```
1. Draft Registration
   ↓ [Tap ⋮] → [Approve]
   
2. Approved (No Seat)
   ↓ [Tap ⋮] → [Set Seat Number] → Enter "A12"
   
3. Approved (With Seat)
   ↓ [Tap ⋮] → [Send Final Approval Email]
   
4. ✅ Complete (Email Sent)
   ↓ [Tap ⋮] → [Resend] (if needed)
```

### Flow 2: Reject
```
1. Draft Registration
   ↓ [Tap ⋮] → [Reject]
   
2. ❌ Rejected
   ↓ [Tap ⋮] → No actions available
```

### Flow 3: Edit Seat Number
```
1. Approved (With Seat: A12)
   ↓ [Tap ⋮] → [Edit Seat Number (A12)] → Change to "B15"
   
2. Approved (With Seat: B15)
   ↓ Seat updated
```

---

## Menu Icons

| Icon | Meaning |
|------|---------|
| ✓ | Approve |
| ✗ | Reject (Red) |
| 💺 | Set Seat |
| ✏️ | Edit Seat |
| ✉️ | Send Email |
| 🔄 | Resend Email |
| ⚠️ | No Actions |

---

## Color Coding

| Status | Badge Color | Border Color |
|--------|-------------|--------------|
| Draft | 🟠 Orange | Light Orange |
| Approved | 🟢 Green | Light Green |
| Rejected | 🔴 Red | Light Red |

---

## Interaction Pattern

1. **User taps 3-dot menu (⋮)**
2. **Menu appears** with context-aware options
3. **User selects an option**
4. **Confirmation dialog appears** (for destructive actions)
5. **Action is performed**
6. **Card updates** with new status/data
7. **Menu options change** based on new state

---

## Smart Menu Features

✅ **Context-Aware**: Menu options change based on registration state
✅ **Shows Current Data**: Edit options show current seat number
✅ **Prevents Errors**: Hides irrelevant options
✅ **Visual Feedback**: Uses icons and colors for clarity
✅ **Confirmation Dialogs**: Prevents accidental actions
✅ **Real-Time Updates**: Menu updates after each action

---

## Example Scenarios

### Scenario 1: New Registration Arrives
```
Status: Draft
Menu Shows: Approve | Reject
Action: Tap Approve
Result: Status → Approved, Confirmation email sent
New Menu: Set Seat Number
```

### Scenario 2: Assign Seat
```
Status: Approved (No Seat)
Menu Shows: Set Seat Number
Action: Tap Set Seat → Enter "A12"
Result: Seat assigned
New Menu: Edit Seat (A12) | Send Final Approval
```

### Scenario 3: Send Final Approval
```
Status: Approved (Seat: A12)
Menu Shows: Edit Seat (A12) | Send Final Approval
Action: Tap Send Final Approval
Result: Email sent with badge + agenda
New Menu: Edit Seat (A12) | Resend Final Approval
```

### Scenario 4: Need to Change Seat
```
Status: Approved (Seat: A12, Email Sent)
Menu Shows: Edit Seat (A12) | Resend Final Approval
Action: Tap Edit Seat → Change to "B15"
Result: Seat updated to B15
New Menu: Edit Seat (B15) | Resend Final Approval
Note: Can resend email with new seat info
```

---

## Benefits of 3-Dot Menu

✅ **Cleaner UI** - No inline buttons cluttering the card
✅ **More Space** - More room for information display
✅ **Context-Aware** - Only shows relevant actions
✅ **Familiar Pattern** - Users know how to use 3-dot menus
✅ **Scalable** - Easy to add more actions in the future
✅ **Professional** - Looks more polished and organized
