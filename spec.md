# AdReward

## Current State
Full AdReward app with Login, Home, Earn, Tasks, Wallet, and Profile tabs. All data stored in localStorage. Withdraw requests are shown in user's Wallet tab with status 'Pending'.

## Requested Changes (Diff)

### Add
- Admin Panel (password-protected, access via hidden button on Login screen or URL hash `#admin`)
  - Login with password `admin123`
  - Dashboard: total users, total coins earned, pending withdrawals count
  - Withdraw Requests tab: list of all withdrawal requests, approve/reject buttons per request
  - Absence Management tab: admin can add absence records (name, date, reason), view and delete absence list
- Absence feature: structured absence records with fields: id, name, date, reason, status (Absent/Present)

### Modify
- App state to include allWithdrawRequests (shared admin-accessible list) and absenceRecords in localStorage
- When user submits a withdraw request, it also gets added to admin's visible list
- Admin panel stored separately in localStorage key `adreward_admin`

### Remove
- Nothing removed

## Implementation Plan
1. Add AbsenceRecord type and admin state types
2. Add AdminLogin screen component
3. Add AdminPanel component with two tabs: Withdraw Requests and Absence Management
4. Wire admin access via `#admin` URL hash or hidden tap on logo
5. Store all withdraw requests in shared localStorage key so admin can see them
6. Admin can approve/reject requests (updates status in shared store, reflected in user's history)
7. Absence Management: form to add records, table to view/delete
