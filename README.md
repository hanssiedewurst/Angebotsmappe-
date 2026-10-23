# Angebotsmappe

Angebote für Neu- und Bestandskunden zusammenklicken: Paket, Betrieb (lokal oder Cloud), Zusatzmodule und Schulungen. Auf der letzten Seite stehen die monatlichen und die einmaligen Kosten (netto).
Die Preise kommen zentral aus der Datei `preise.json` in diesem Repository.

**Adresse (nach dem Einrichten von GitHub Pages):** https://hanssiedewurst.github.io/Angebotsmappe-/

## Inhalt dieses Repositorys

| Datei | Zweck |
|---|---|
| `index.html` | die App |
| `preise.json` | **zentrale Preisliste**: Pakete, KI-Bundle, Konditionen, Module, Schulungen, Cloud, Salesforce-Zuordnung |
| `sw.js` | Offline-Speicher: hält die App nach dem ersten Start auf dem Gerät bereit |
| `manifest.webmanifest` | Name und Icon für den Home-Bildschirm |
| `icons/` | App-Icons |
| `README.md` | diese Anleitung |

---

## 1. Online stellen mit GitHub Pages

1. Im Repository **Settings** → links **Pages** → Source **Deploy from a branch**, Branch **main**, Ordner **/ (root)** → **Save**.
2. Nach ein bis zwei Minuten steht oben auf derselben Seite die Adresse.

**Wichtig:** Im kostenlosen GitHub-Tarif geht Pages nur mit **öffentlichen** Repositories (**Settings → General → Danger Zone → Change visibility**). Anders als bei der Unterschriftenmappe steht hier eine Preisliste drin: Wer die Adresse oder das Repository kennt, kann `preise.json` lesen. Auch mit einem bezahlten Tarif ist die Pages-Seite selbst öffentlich erreichbar. Wenn die Preise nicht öffentlich sein dürfen, braucht es später einen eigenen Server mit Anmeldung (siehe Abschnitt 6).

---

## 2. Auf dem iPad oder PC einrichten (jeder Kollege einmal)

- **iPad:** Adresse in **Safari** öffnen → **Teilen-Symbol** → **Zum Home-Bildschirm** → **Hinzufügen**. Die App einmal vom Home-Bildschirm aus öffnen, solange Internet da ist.
- **PC:** Adresse in **Edge** öffnen → **…** → **Apps** → **Diese Website als App installieren**.

Danach läuft die App auch ohne Netz. Neue Preise kommen beim nächsten Öffnen mit Internet.

---

## 3. Benutzen

Die App führt in sechs Schritten durch das Angebot. Rechts läuft eine Kostenübersicht mit.

1. **Kunde:** Neukunde oder Bestandskunde. Bei Neukunden die Kondition wählen (Kein Partner, Kooperationspartner, Meisterschüler, Existenzgründer). Firma, Ansprechpartner, Salesforce-IDs; Kundendaten lassen sich als JSON aus Salesforce übernehmen.
2. **Paket:** Paket L, Paket M oder KI-Bundle (Einzelkämpfer, Betriebe, Mittelstand) und die Anzahl der **Arbeitsplätze (AP)**. Preis = 1. AP + jeder weitere AP.
3. **Betrieb:** Lokal oder Cloud. Die Cloud-Pauschale enthält 3 AP, jeder weitere kostet extra. Die **Einrichtung** steht immer im Angebot (Preis je nach Betriebsart).
4. **Zusatzmodule:** Wartung, Importmanager, App und TAIFUN Personalmanager (TPM). Bei App und TPM die Anzahl wählen (Grundpreis + Anzahl × Nutzergebühr).
5. **Schulungen:** Bis 4 AP sind Online-Schulungen als Pauschale hinterlegt und werden automatisch vorgeschlagen:
   - Paket L: TAIFUN allgemein + Dokumentenarchiv
   - Paket M: TAIFUN allgemein
   - App bzw. TPM gewählt: Schulung App bzw. Schulung TPM
   Jede Pauschale lässt sich ab- oder zuschalten. Zusätzlich gehen Schulungsstunden nach Stundensatz.
6. **Übersicht:** monatliche und einmalige Kosten getrennt, mit Rabatten und Ersparnis über die Rabattlaufzeit. Alle Preise netto zzgl. MwSt. Hinweis zur Anfahrt (€ pro km).

**Rabatte**
- Konditionen für Neukunden gelten standardmäßig nur auf die monatlichen Kosten (Paket, Cloud, rabattfähige Module), für die eingestellte Laufzeit. App und TPM sind ohne Rabatt.
- Sonderkonditionen: auf der Übersicht über das kleine **%** neben „An Salesforce übergeben“. Ein Prozentsatz, der zur Kondition dazukommt (20 % + 30 % = 50 %) und für dieselben Positionen gilt.

**Speichern:** **Angebot speichern** legt das Angebot auf diesem Gerät ab (Liste unter **Gespeichert**).

---

## 4. Preise zentral pflegen

Alle Preise, Konditionen, Module und Schulungen stehen in `preise.json`. Ändert man diese Datei im Repository, gelten die neuen Preise für alle beim nächsten Öffnen mit Internet. `sw.js` muss dafür **nicht** geändert werden.

**Am einfachsten über die App:**
1. **Einstellungen** öffnen und Preise, Module, Schulungen usw. anpassen.
2. **Als preise.json sichern**.
3. Auf github.com im Repository **Add file** → **Upload files** → die Datei `preise.json` hochladen → **Commit changes**. Die alte Datei wird ersetzt.

**Direkt auf github.com:** `preise.json` öffnen → Stift-Symbol → Werte ändern → **Commit changes**.

**Nur auf diesem Gerät speichern** probiert Preise aus, ohne andere zu betreffen. Das Gerät zeigt dann „Dieses Gerät nutzt eigene Preise“. **Zentrale Preise verwenden** in den Einstellungen schaltet zurück.

Solange `"example": true` in der Datei steht, zeigt die App „Beispielpreise“. Beim Sichern über die App wird das automatisch auf `false` gesetzt.

---

## 5. Salesforce

- Auf der Übersicht **An Salesforce übergeben**: Je nach Einstellung wird das Angebot mit Status „bereit für Salesforce“ gespeichert, als JSON-Datei gesichert oder in die Zwischenablage kopiert.
- Die Daten enthalten eine Opportunity (Feldnamen unter **Einstellungen → Salesforce** einstellbar) und Line Items mit Produktcode, Menge, Einzelpreis, Abrechnungsart (monatlich/einmalig) und ggf. Rabatt (`Discount`).
- **Salesforce-Daten ansehen** zeigt das JSON.

Eine direkte Verbindung zu Salesforce braucht einen Server (siehe Abschnitt 6).

---

## 6. Später: zentraler Server

Die App ist so gebaut, dass sich Preise und Salesforce-Übergabe später an einen Server hängen lassen:
- **Preise:** Statt `preise.json` lädt die App die Preise von einem Server mit Anmeldung. Dann sind sie nicht mehr öffentlich und lassen sich direkt in der App für alle speichern.
- **Salesforce:** Der Server nimmt die Angebotsdaten entgegen und legt Opportunity und Line Items per Salesforce-API an.

---

## 7. Updates einspielen

1. Die geänderten Dateien im Repository hochladen (**Add file** → **Upload files**).
2. Bei Änderungen an `index.html` in `sw.js` die Zeile `const VERSION = 'v…';` hochzählen. Ohne diesen Schritt behalten die Geräte die alte Fassung im Offline-Speicher.
3. Die Geräte holen die neue Version beim nächsten Öffnen mit Internet und zeigen „Eine neue Version ist da“ mit **Neu laden**.

---

## 8. Datenschutz

- **Angebote und Kundendaten** bleiben im Browser des Geräts. Es gibt keinen Server der App, der sie empfängt.
- **GitHub** liefert nur die App-Dateien und die Preisliste aus.
- **Keine externen Anbieter:** Schriften kommen vom Gerät selbst, es werden keine Dateien von Google oder anderen Diensten nachgeladen.
