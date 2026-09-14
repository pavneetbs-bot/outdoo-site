# Replit par update lene ka tareeka

Har update pe — Replit Shell mein (remote-naam ka jhanjhat nahi, seedha URL):
```
git fetch https://github.com/pavneetbs-bot/outdoo-site.git main && git checkout -f FETCH_HEAD -- index.html product.html && grep -c "Deal of the day" index.html
```
- Aakhri number **1+** aana chahiye (latest version ka marker).
- Phir **Deploy → Republish**.
- Site **incognito/hard-refresh** mein check karo (5.6MB file cache hoti hai).

Preview (Replit se pehle dekhne ke liye): https://pavneetbs-bot.github.io/outdoo-site/

Note: is Repl mein agent ka apna `origin` remote set hai — isliye `git fetch origin` GALAT repo se laata hai. Hamesha upar waala URL-based command hi use karo.
