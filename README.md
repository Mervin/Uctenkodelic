# Účtenkodělič 🧾✂️

**👉 [Spustit aplikaci: mervin.github.io/Uctenkodelic](https://mervin.github.io/Uctenkodelic/) 👈**

Moderní webová aplikace (PWA) pro rychlé a spravedlivé rozdělení společné útraty s přáteli. Už žádné složité počítání na kalkulačce po večeri v restauraci nebo nákupu na víkendovou chatu.

## Hlavní funkce
* **AI Čtení účtenky:** Vyfoťte papírovou účtenku nebo nahrajte screenshot (např. z aplikace Lidl Plus). Aplikace pomocí umělé inteligence (OCR) automaticky přečte názvy položek a jejich ceny. Očišťuje řádky od zbytečností jako DPH, slevy se automaticky odečítají.
* **Proporcionální dělení:** Položku může zaplatit jeden člověk, nebo se o ni můžete rozdělit (např. někdo zaplatí 2 kusy a někdo 3, nebo se o pizzu rozdělíte v poměru 1/4 ku 3/4).
* **Live sdílení s přáteli (Multi-user):** Vše běží v reálném čase. Vygenerujte si krátký 6místný kód relace (např. `A7K9M2`) nebo pošlete odkaz kamarádům. Všichni si mohou aplikaci otevřít na svém telefonu a současně zaklikávat své položky. Úpravy se propisují okamžitě všem.
* **Funguje i offline:** Aplikaci si můžete nainstalovat na plochu telefonu (PWA) a používat ji i jako běžnou mobilní aplikaci.

## Technologie
* React, TypeScript, TailwindCSS
* Vite, Zustand (State management)
* Tesseract.js (Lokální AI OCR v prohlížeči)
* Firebase Firestore (Cloudová databáze pro real-time synchronizaci)
