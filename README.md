# Účtenkodělič 🧾✂️

**👉 [Spustit aplikaci: mervin.github.io/Uctenkodelic](https://mervin.github.io/Uctenkodelic/) 👈**

Moderní webová aplikace (PWA) pro rychlé a spravedlivé rozdělení společné útraty s přáteli. Už žádné složité počítání na kalkulačce po večeri v restauraci nebo nákupu na víkendovou chatu.

## Hlavní funkce
* **AI Čtení účtenky:** Vyfoťte papírovou účtenku nebo nahrajte screenshot (např. z aplikace Lidl Plus). Aplikace pomocí umělé inteligence (OCR) automaticky přečte názvy položek a jejich ceny. Očišťuje řádky od zbytečností jako DPH, slevy se automaticky odečítají.
* **Proporcionální dělení a zlomky:** Položky lze dělit velmi flexibilně a inteligentně:
  * **Na kusy:** Pokud účtenka hlásí např. 5 ks, můžete si reálné kusy mezi sebe jednoduše rozebrat (Karel zaplatí 2 ks, Pepa 3 ks).
  * **Na abstraktní díly (zlomky):** Pokud se chcete o položku rozdělit zlomkově, jednoduše u ní naklikejte celkově více "plusů", než je reálných kusů. Pokud u jedné pizzy naklikáte celkem 7 plusů, aplikace si sama uvědomí, že se už nejedná o fyzické kusy, změní štítek na "díly" a cenu pizzy matematicky rozseká na sedminy (např. Karel zaplatí 3/7, Pepa 4/7). Tímto způsobem lze absolutně spravedlivě a na haléře přesně rozdělit jakoukoliv útratu!
* **Live sdílení s přáteli (Multi-user):** Vše běží v reálném čase. Vygenerujte si krátký 6místný kód relace (např. `A7K9M2`) nebo pošlete odkaz kamarádům. Všichni si mohou aplikaci otevřít na svém telefonu a současně zaklikávat své položky. Úpravy se propisují okamžitě všem.
* **Funguje i offline:** Aplikaci si můžete nainstalovat na plochu telefonu (PWA) a používat ji i jako běžnou mobilní aplikaci.

## Technologie
* React, TypeScript, TailwindCSS
* Vite, Zustand (State management)
* Tesseract.js (Lokální AI OCR v prohlížeči)
* Firebase Firestore (Cloudová databáze pro real-time synchronizaci)
