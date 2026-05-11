# Rozdělení Účtu

Aplikace pro sdílení a rozdělení účtenek s přáteli. Aplikace funguje kompletně na straně klienta s využitím [Tesseract.js](https://tesseract.projectnaptha.com/) pro lokální čtení textu z účtenek.

## Jak zapnout reálnou spolupráci (Multi-user)

Aplikace je momentálně nastavena na použití lokálního "Mock" backendu, což znamená, že si uživatelé musí podávat jeden telefon (nebo přenášet dlouhé URL s parametry), aby mohli všichni vybírat položky.

Aplikace je ale architektována tak, aby šla snadno napojit na [Firebase Realtime Database](https://firebase.google.com/) nebo [Supabase](https://supabase.com/) pro skutečnou live spolupráci, kde každý uživatel otevře aplikaci na svém telefonu a vidí změny v reálném čase.

### Návod na propojení s Firebase:
1. Vytvořte si účet na [Firebase](https://firebase.google.com/) a vytvořte nový projekt.
2. V sekci "Build" vyberte "Realtime Database" a vytvořte novou databázi v testovacím režimu.
3. Získejte své konfigurační údaje (API Key, Database URL atd.).
4. Otevřete `src/services/mockBackend.ts` a nahraďte jej skutečnou implementací `BackendService` využívající Firebase SDK.
5. Upravte `src/store/appStore.ts`, aby se importoval nový Firebase backend místo `mockBackend.ts`.
