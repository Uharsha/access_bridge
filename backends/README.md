# TTI Backend

Express + MongoDB Atlas backend for:
- Admission form submission (`/admission/saveAdmission`)
- Head/Teacher dashboard workflows
- Auth (`/api/auth/*`)
- Interview scheduling and workflow emails

## Run

1. Ensure root `.env` has `MONGO_URI` (already present in this workspace).
2. Start backend from project root:

```bash
npm run start:backend
```

Server default URL: `http://localhost:5530`

## Notes

- Admission files are uploaded to Cloudinary, URLs are stored in MongoDB.
- First created account must be `HEAD`.
- After first `HEAD` account, only HEAD users can create new accounts.
- Add course teachers in `backend/src/config/teachers.js` for HEAD approval email routing.
- Notification APIs are kept for UI compatibility but return empty responses.
