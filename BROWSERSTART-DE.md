# ENDGAME: Start über GitHub und Vercel – ohne Terminal

Dieses Paket enthält denselben englischen Websiteentwurf. Der Browser-Import ist für den ersten Start ohne öffentliche Kontakt- und Anbieterangaben vorbereitet. Der erste Build bleibt ein Entwurf mit noindex; er ist nicht automatisch passwortgeschützt. Der tägliche Agent bleibt deaktiviert.

## 1. GitHub-Repository
Öffne https://github.com/new. Owner: soheylghaemian-hue. Name: soheylghaemian-site. Sichtbarkeit: Private. Für den Browser-Upload kann Add a README aktiviert werden; die Paketversion ersetzt anschließend diese Start-README. Wähle keine Vorlage. Falls das Ziel-Repository bereits existiert, prüfe seine Inhalte, statt es zu ersetzen.

## 2. Upload
ZIP entpacken. Im Finder den Ordner soheylghaemian-site öffnen. Mit Command+Shift+. auch die versteckten Dateien anzeigen. In GitHub: Add file > Upload files. Den INHALT dieses Ordners hineinziehen, nicht die ZIP und nicht den äußeren Ordner. Wichtig: .github, .gitignore und .vercelignore mitnehmen. .env.example ist eine leere Vorlage; keine echten .env-Dateien oder Zugangsdaten hochladen. Auf main speichern. Danach müssen package.json, vercel.json, scripts/, site/, config/, content/, agent/, tests/ und .github/ direkt in der obersten Repository-Ebene liegen.

## 3. Vercel-Import
Im bestehenden Team meridian-gate: Add New > Project. GitHub verbinden, falls angeboten. Der Vercel-GitHub-App gezielt Zugriff auf soheylghaemian-site geben. Import neben genau diesem Repository wählen. Keine bestehende Meridian-Website verändern.

Projektname: soheylghaemian-site
Framework Preset: Other
Root Directory: ./ (Standard)
Build Command: npm run check:vercel
Output Directory: dist
Install Command: npm ci --ignore-scripts
Node.js: 22.x (auch in package.json angegeben)

Die Einstellungen sind in vercel.json hinterlegt und haben Vorrang vor abweichenden Dashboardwerten. Für die Websitevorschau werden keine API-Schlüssel benötigt. Kein Upgrade oder kostenpflichtiges Angebot ohne eigene Prüfung bestätigen. Vercels Hobby-Tarif ist auf nichtkommerzielle Nutzung beschränkt; ein kommerzieller Beratungsauftritt benötigt einen dafür zulässigen Tarif.

Deploy klicken. Bei Ready/Visit die tatsächlich angezeigte vercel.app-Adresse öffnen. Prüfe Startseite, /profile/, /method/, /insights/ und Mobilansicht. Bei Fehlern sind die ersten konkreten Fehlermeldungen der Build Logs wichtiger als die letzte allgemeine Fehlerzeile. Keine Secrets in Screenshots zeigen.

## 4. Vor dem echten Start
config/site.json enthält noch leere contactEmail, legalNotice und privacyNotice. Diese Werte müssen mit tatsächlich freigegebenen öffentlichen Angaben ausgefüllt werden; die eingebauten Prüfungen sind keine rechtliche Prüfung. brandStatus ist noch eine offene Namensfreigabe. Keine Angaben erfinden und keine Testtexte übernehmen.

Im Artikel content/articles/before-you-grow-define-your-personal-goal.json publishedDate auf das echte Datum der Veröffentlichung setzen (YYYY-MM-DD), nicht auf ein früheres Testdatum. In config/site.json launchReady erst nach Freigabe auf true setzen. Änderungen in GitHub über das Stiftsymbol speichern (Commit changes); eine geschützte Branch darf nicht zur Vereinfachung entsichert werden.

Beim nächsten Vercel-Production-Build werden die Produktionsprüfungen ausgeführt. Unvollständige Pflichtfelder führen zu einem Fehler, nicht zu einer gültigen Veröffentlichung. Der zuletzt erfolgreiche Entwurf kann während eines fehlgeschlagenen Builds weiterhin sichtbar sein.

## 5. Domain
Nach erfolgreicher Prüfung des fertigen Auftritts: Vercel-Projekt > Settings > Domains > soheylghaemian.com hinzufügen. Optional www.soheylghaemian.com hinzufügen und auf die Hauptdomain ohne www weiterleiten. Das Paket setzt die Hauptdomain ohne www voraus.

Beim tatsächlichen DNS-Anbieter genau die Werte eintragen, die Vercel für dieses Projekt anzeigt. Keine feste IP aus einer fremden Anleitung verwenden. Nur die betroffenen Web-DNS-Einträge ändern. MX-, SPF-, DKIM-, DMARC- und übrige E-Mail-Einträge sowie Nameserver nicht ungeprüft verändern. Bei einer bestehenden Zuordnung zu einem anderen Projekt erst prüfen, nicht blind ersetzen. Keine Domain neu kaufen.

Erfolgskontrolle: Vercel zeigt gültige Domainkonfiguration; HTTPS auf soheylghaemian.com öffnet die neue Seite. Unter /.well-known/endgame-site.json steht siteId: soheylghaemian-endgame-v1 und launchReady: true. sitemap.xml enthält die realen Seiten; robots.txt blockiert die Website nicht mehr. Dies bestätigt keine Google-Indexierung oder Rangposition.

## 6. Erst danach: täglicher Agent
Die vorhandenen GitHub-Actions-Dateien laufen nicht allein durch den Website-Import als Publisher. enabled und automaticRoutinePublication in config/editor.json, PUBLISH_ENABLED als Repository-Variable, ein unterstütztes OPENAI_MODEL sowie sichere OPENAI_API_KEY- und VERCEL_DEPLOY_HOOK-Secrets sind gesondert einzurichten. Vor Aktivierung API-/Plattformkosten prüfen. Details stehen in README.md.

Zuerst einen kontrollierten manuellen Lauf durchführen und den echten öffentlichen Artikel prüfen. Automatische Prüfungen sind keine Garantie für richtige Inhalte oder Google-Rankings. Die Anfangswarteschlange ist begrenzt; sie enthält nach dem Startartikel elf weitere Themen. Keine unbegrenzte Veröffentlichung versprechen.

## Offizielle Dokumentation
- https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository
- https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- https://vercel.com/docs/projects/managing-projects
- https://vercel.com/docs/git/vercel-for-github
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/domains/working-with-domains/add-a-domain
- https://vercel.com/docs/limits/fair-use-guidelines
