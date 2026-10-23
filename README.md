# Angebotsmappe

Angebote für Neu- und Bestandskunden zusammenklicken: Paket, Betrieb (lokal oder Cloud), Zusatzmodule und Schulungen. Auf der letzten Seite stehen die monatlichen und die einmaligen Kosten (netto).
Die Preise kommen aus einer **Preisdatei** (`preise.json`), die ihr selbst ablegt, z. B. im gemeinsamen OneDrive-Ordner. So stehen keine echten Preise im Repository.

**Adresse (nach dem Einrichten von GitHub Pages):** https://hanssiedewurst.github.io/Angebotsmappe-/

## Inhalt dieses Repositorys

| Datei | Zweck |
|---|---|
| `index.html` | die App |
| `preise.json` | **Vorlage mit Beispielpreisen**. Die echte Preisdatei liegt nicht hier, sondern z. B. im OneDrive (siehe Abschnitt 4). |
| `angebot-pdf.js` | erstellt das Angebots-PDF im TAIFUN-Layout aus der Vorlage |
| `lib/` | PDF-Bibliotheken (pdf-lib, fontkit, pdf.js von Mozilla) mit ihren Lizenzen |
| `fonts/` | Schriften der TAIFUN-Angebote (DejaVu Sans, Open Sans) mit ihren Lizenzen |
| `sw.js` | Offline-Speicher: hält die App nach dem ersten Start auf dem Gerät bereit |
| `manifest.webmanifest` | Name und Icon für den Home-Bildschirm |
| `icons/` | App-Icons |
| `README.md` | diese Anleitung |

---

## 1. Online stellen mit GitHub Pages

1. Im Repository **Settings** → links **Pages** → Source **Deploy from a branch**, Branch **main**, Ordner **/ (root)** → **Save**.
2. Nach ein bis zwei Minuten steht oben auf derselben Seite die Adresse.

Im kostenlosen GitHub-Tarif geht Pages nur mit **öffentlichen** Repositories (**Settings → General → Danger Zone → Change visibility**). Öffentlich ist nur der App-Code mit Beispielpreisen. Die echten Preise liegen in eurer Preisdatei und kommen nie ins Repository. **Bitte keine echte `preise.json` hier hochladen.**

---

## 2. Auf dem iPad oder PC einrichten (jeder Kollege einmal)

- **iPad:** Adresse in **Safari** öffnen → **Teilen-Symbol** → **Zum Home-Bildschirm** → **Hinzufügen**. Die App einmal vom Home-Bildschirm aus öffnen, solange Internet da ist.
- **PC:** Adresse in **Edge** öffnen → **…** → **Apps** → **Diese Website als App installieren**.

Danach läuft die App auch ohne Netz. Zum Schluss einmal die Preisdatei einrichten (Abschnitt 4).

---

## 3. Benutzen

Die App führt in sechs Schritten durch das Angebot. Rechts läuft eine Kostenübersicht mit.

1. **Kunde:** Neukunde oder Bestandskunde. Bei Neukunden die Kondition wählen (Kein Partner, Kooperationspartner, Meisterschüler, Existenzgründer). Firma, Ansprechpartner, Anschrift, Kundennummer, Salesforce-IDs; Kundendaten lassen sich als JSON aus Salesforce übernehmen. Die **Angebotsnummer** entsteht automatisch aus Kundennummer und Datum (z. B. `1006213_A261023`) und lässt sich überschreiben.
2. **Paket:** Paket L, Paket M oder KI-Bundle (Einzelkämpfer, Betriebe, Mittelstand) und die Anzahl der **Arbeitsplätze (AP)**. Preis = 1. AP + jeder weitere AP.
3. **Betrieb:** Lokal oder Cloud. Die Cloud-Pauschale enthält 3 AP, jeder weitere kostet extra. Die **Einrichtung** steht immer im Angebot (Preis je nach Betriebsart).
4. **Zusatzmodule:** TAIFUN Wartung, Import-Manager, App und Personalmanager (TPM). Bei App und TPM die Anzahl aktiver Mitarbeiter wählen (Grundgebühr + Anzahl × Preis je Mitarbeiter).
5. **Schulungen und Dienstleistungen:** werden passend zu Paket und Modulen vorgeschlagen, Online-Seminare nur bis 4 AP:
   - immer: Ersteinrichtung nach Aufwand
   - Paket L und KI-Bundle: Online-Seminar Ersteinweisung + openDocument
   - Paket M: Online-Seminar Ersteinweisung
   - KI-Bundle: Einrichtung HalloPetra
   - App bzw. TPM gewählt: Seminar App bzw. Installation und Seminar Personalmanager
   Jede Position lässt sich ab- oder zuschalten. Dazu kommen zusätzliche Dienstleistungen nach Stunden und die km für die Anfahrt.
6. **Übersicht:** monatliche und einmalige Kosten getrennt, mit Rabatten und Ersparnis über die Rabattlaufzeit. Alle Preise netto zzgl. MwSt. Hinweis zur Anfahrt (€ pro km).

**Rabatte**
- Konditionen für Neukunden gelten standardmäßig nur auf die monatlichen Kosten (Paket, Cloud, rabattfähige Module), für die eingestellte Laufzeit. App und TPM sind ohne Rabatt.
- Sonderkonditionen: auf der Übersicht über das kleine **%** neben „An Salesforce übergeben“. Ein Prozentsatz, der zur Kondition dazukommt (20 % + 30 % = 50 %) und für dieselben Positionen gilt.

**Speichern:** **Angebot speichern** legt das Angebot auf diesem Gerät ab (Liste unter **Gespeichert**).

**Angebots-PDF:** **Angebots-PDF erstellen** auf der Übersicht erzeugt das Angebot im TAIFUN-Layout (siehe Abschnitt 5). Am PC fragt die App, wo das PDF hin soll, z. B. in den OneDrive-Ordner *Angebote*. Von dort öffnet es die Unterschriftenmappe zum Unterschreiben. Auf dem iPad: **Sichern oder teilen** → **In Dateien sichern**.

---

## 4. Preise: die Preisdatei

Alle Preise, Konditionen, Module und Schulungen stehen in einer Datei `preise.json`. Sie liegt an einem Ort, auf den alle Zugriff haben, am besten im gemeinsamen **OneDrive-Ordner**. Die App liest sie von dort.

**Erstes Anlegen (einmal, am Windows-PC mit Edge oder Chrome):**
1. In der App **Einstellungen** öffnen und die echten Preise eintragen.
2. **Als Preisdatei speichern…** → im Explorer den gemeinsamen OneDrive-Ordner wählen → **Speichern**.
3. Die Datei ist damit gleich verknüpft. Weitere Änderungen speichert **In Preisdatei speichern** direkt dorthin.

**Am Windows-PC (Edge oder Chrome):**
1. **Einstellungen** → **Preisdatei verknüpfen…** → die `preise.json` im OneDrive wählen.
2. Die App liest die Datei ab jetzt **bei jedem Start neu**. Nach einem Neustart des Browsers fragt sie eventuell einmal: „Preise aus … einlesen?“ → **Einlesen** → **Zulassen**.
3. Preise ändern: in den Einstellungen anpassen → **In Preisdatei speichern**. Die Änderung landet direkt in der Datei im OneDrive und gilt für alle, sobald OneDrive synchronisiert hat.

**Auf dem iPad:**
1. Einmal die OneDrive-App installieren und in der **Dateien**-App einschalten (wie bei der Unterschriftenmappe).
2. **Einstellungen** → **Preisdatei öffnen…** → **OneDrive** → `preise.json`.
3. Safari kann Dateien nicht dauerhaft verknüpfen. Die Preise werden deshalb auf dem iPad gespeichert und gelten auch offline. **Bei neuen Preisen die Datei erneut öffnen.** In den Einstellungen steht, wann zuletzt eingelesen wurde.

**Woher die Preise kommen**, steht oben in den Einstellungen unter **Preisquelle**:
- *Preisdatei „…“*: verknüpfte bzw. eingelesene Preisdatei
- *Eigene Preise dieses Geräts*: mit **Nur auf diesem Gerät speichern** abgelegt, gelten nur hier
- *Beispielpreise*: noch keine Preisdatei geöffnet. Die App zeigt dann im Angebot „Beispielpreise“.

---

## 5. Angebots-PDF im TAIFUN-Layout

Die App baut das PDF aus einem echten TAIFUN-Aboangebot als **Vorlage**. Briefpapier, Vertragstexte, Konditionen und Anlagen kommen aus der Vorlage. Die App setzt:

- Anschrift, Angebotsnummer, Datum, Kundennummer, „garantiert bis“ und die Signatur im Anschreiben
- Kunde, KD-Nr. und Anschrift im Abovertrag, Mandatsreferenz, Anschrift für das Lastschriftmandat, Ort und Datum bei der Unterschrift
- die **Angebotsübersicht** mit Leistungsbestandteilen, Einmaligen Investitionen und Dienstleistungen, Rabatt je Zeile und Summen
- die Ankreuzfelder lokal/SaaS, TAIFUN App (Auftragsverarbeitung) und die HalloPetra-Variante
- Datum im Seitenkopf und die Seitenzahlen

Der alte Text wird dabei aus dem PDF entfernt, nicht nur überdeckt. Der KI-Upgrade-Vertrag (Anlage 3) bleibt nur drin, wenn ein KI-Bundle angeboten wird. Das PDF lässt sich in der Unterschriftenmappe genauso lesen wie ein Original (Kunde, Positionen, Provision, Salesforce).

**Einrichten (einmal):**
1. Ein TAIFUN-Aboangebot **mit KI-Bundle** als PDF in den gemeinsamen OneDrive-Ordner legen (z. B. `Vorlage_Aboangebot.pdf`). Dann ist Anlage 3 enthalten.
2. **Einstellungen** → **Angebots-PDF** → am PC **Vorlage verknüpfen…**, auf dem iPad **Vorlage öffnen…**.
3. Darunter die eigene **Signatur** eintragen (Name, Funktion, Mobil, E-Mail). Sie gilt nur auf diesem Gerät.

Die Namen der Positionen im PDF stehen in der Preisdatei und lassen sich in den Einstellungen ändern (Spalten „Name im Angebot“).

---

## 6. Salesforce

- Auf der Übersicht **An Salesforce übergeben**: Je nach Einstellung wird das Angebot mit Status „bereit für Salesforce“ gespeichert, als JSON-Datei gesichert oder in die Zwischenablage kopiert.
- Die Daten enthalten eine Opportunity (Feldnamen unter **Einstellungen → Salesforce** einstellbar) und Line Items mit Produktcode, Menge, Einzelpreis, Abrechnungsart (monatlich/einmalig) und ggf. Rabatt (`Discount`).
- **Salesforce-Daten ansehen** zeigt das JSON.

Eine direkte Verbindung zu Salesforce braucht einen Server (siehe Abschnitt 7).

---

## 7. Später: zentraler Server

Die App ist so gebaut, dass sich Preise und Salesforce-Übergabe später an einen Server hängen lassen:
- **Preise:** Statt der Preisdatei im OneDrive lädt die App die Preise von einem Server mit Anmeldung. Dann aktualisieren sich auch die iPads automatisch.
- **Salesforce:** Der Server nimmt die Angebotsdaten entgegen und legt Opportunity und Line Items per Salesforce-API an.

---

## 8. Updates einspielen

1. Die geänderten Dateien im Repository hochladen (**Add file** → **Upload files**).
2. Bei Änderungen an `index.html` in `sw.js` die Zeile `const VERSION = 'v…';` hochzählen. Ohne diesen Schritt behalten die Geräte die alte Fassung im Offline-Speicher.
3. Die Geräte holen die neue Version beim nächsten Öffnen mit Internet und zeigen „Eine neue Version ist da“ mit **Neu laden**.

---

## 9. Datenschutz

- **Angebote und Kundendaten** bleiben im Browser des Geräts. Es gibt keinen Server der App, der sie empfängt.
- **Preise und die TAIFUN-Vorlage** liegen in eurem OneDrive und auf den Geräten, nicht bei GitHub.
- **GitHub** liefert nur die App-Dateien aus.
- **Keine externen Anbieter:** Die App-Schriften kommen vom Gerät, PDF-Bibliotheken und PDF-Schriften liegen in diesem Repository (`lib/`, `fonts/`). Es werden keine Dateien von Google oder anderen Diensten nachgeladen. Das PDF entsteht komplett im Browser.
