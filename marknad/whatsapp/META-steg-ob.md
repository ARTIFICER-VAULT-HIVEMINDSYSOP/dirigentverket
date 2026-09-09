# Meta-steg ÖB måste göra — WhatsApp Fastigheterutomlands

Paper. Inget live-skick förrän ÖB säger namngivet ja. Token/nummer stannar i tenant-config, inte i git.

## Ordning

1. **Meta Business Manager**  
   Skapa/äg Business för Fastigheterutomlands.com (eller koppla befintlig). Verifiera företaget om Meta kräver det.

2. **WhatsApp Business Account (WABA)**  
   Skapa WABA under den Business. Koppla till varumärket Fastigheterutomlands (inte Tradingskolan/KS).

3. **Telefonnummer**  
   Lägg till ett nummer som ska bli WhatsApp Business-nummer (nytt eller migrerat).  
   Bekräfta ägarskap (SMS/röst). Spara `phone_number_id` och `waba_id` till tenant-config (lokalt) — aldrig i repo.

4. **Meta Developer-app + Cloud API**  
   App med produkt **WhatsApp** → Cloud API.  
   Generera **permanent system-user token** (eller långlivad) med rätt behörigheter.  
   Token = hemlighet i tenant-config / secret store. Inte i Dirigentverket-git.

5. **Webhook**  
   Sätt Callback URL till vår ingress (HTTPS).  
   Verify token = samma som i ingress-config.  
   Prenumerera på `messages`.  
   Meta-signatur (`X-Hub-Signature-256`) måste verifieras i ingress.

6. **Display name + profil**  
   Godkänd visningsnamn, profilbild, about — enligt Fastigheterutomlands-brand.

7. **Templates (första kontakt utanför 24h)**  
   Skapa minst en godkänd template (t.ex. hälsning/återkoppling). Vänta Meta-granskning innan produktion.

8. **Testnummer**  
   Lägg till testmottagare i Cloud API. Kör paper → knappar/lista → handoff syns i kö. **Ingen produktion** förrän steg 9.

9. **ÖB namngivet ja**  
   Först då: produktion, live template-utskick, riktiga kundnummer.

## Inte ÖB (Byggare Bob / ARTIFICER)

- Flödes-JSON, dialogmotor, ingress-stub, handoff-kö (paper)
- Tenant-config-mall utan secrets
- Mock webhook tills ja

## Klart när

- [ ] Business + WABA + nummer finns
- [ ] `phone_number_id` / `waba_id` / token i tenant-config (lokalt)
- [ ] Webhook verifierad mot paper-ingress
- [ ] Minst en template godkänd (eller planerad)
- [ ] ÖB sagt ja till live
