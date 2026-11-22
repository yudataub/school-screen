# מסך בית הספר – אתר הניהול והשרת

- **המסך (לטלוויזיה, דרך Yodeck):** https://www.kol-toda.co.il/screen/
- **אתר הניהול (עם סיסמה):** https://school-screen.kol-bot.workers.dev/

באתר הניהול מעלים תמונות, כותבים שקופיות טקסט, קובעים חלונות זמן (ימים ושעות) ואת משך כל שקופית.
לחיצה על "שמירה ועדכון המסך" מעדכנת את הטלוויזיה תוך כמה דקות. אין צורך לגעת בקוד או ב-GitHub.

## מה יש כאן
- `worker/src/index.js` – השרת (Cloudflare Worker `school-screen`): מגיש את `config.json` ואת התמונות, ושומר שינויים מאתר הניהול.
- `worker/src/admin.html` – אתר הניהול.
- התוכן עצמו (ההגדרות והתמונות) שמור ב-KV של ה-Worker, לא בריפו הזה. גרסאות קודמות של ההגדרות נשמרות שם 60 יום (`bak:<זמן>`).
- הדף שמוצג בטלוויזיה נמצא באתר kol-toda (`kol/site_root/screen/index.html`).

## פריסה אחרי שינוי בקוד
בתיקייה `worker`: `C:\personal-bots\worker\node_modules\.bin\wrangler.cmd deploy`
הסיסמה היא הסוד `ADMIN_PASSWORD` של ה-Worker (להחלפה: `wrangler secret put ADMIN_PASSWORD`).

## בדיקת המסך בלי לחכות
- https://www.kol-toda.co.il/screen/?test=1 – מציג בפינה מה פעיל ומתי הרענון הבא.
- https://www.kol-toda.co.il/screen/?test=1&time=10:05&day=2 – מדמה שעה ויום (כאן: יום שלישי, 10:05).
