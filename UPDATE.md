# Replit par update lene ka tareeka

## Pehli baar (one-time, Replit Shell mein):
```
git init -b main 2>/dev/null; git remote add origin https://github.com/pavneetbs-bot/outdoo-site.git 2>/dev/null
git fetch origin main && git checkout -f FETCH_HEAD -- index.html product.html
```

## Har update pe (2 commands + 1 click):
```
git fetch origin main && git checkout -f FETCH_HEAD -- index.html product.html
```
Phir **Deploy → Republish**.

## Preview (Replit pe daalne se pehle dekhna ho):
https://pavneetbs-bot.github.io/outdoo-site/
Har push ke ~1 minute baad yahan latest version khud dikh jaata hai.
