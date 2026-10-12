- **G1**  
  Frontend samlar in användarens uppgifter och skickar dem till min backend. Backend validerar uppgifterna och använder Supabase Auth för registrering, inloggning och utloggning. Sessionscookies håller reda på vilken användare som är inloggad.  
  [login/page.tsx:1](../frontend/src/app/login/page.tsx#L1), [register/page.tsx:1](../frontend/src/app/register/page.tsx#L1), [Navigation.tsx:39](../frontend/src/components/Navigation.tsx#L39), [api.ts:62](../frontend/src/lib/api.ts#L62), [auth.ts:22](../backend/src/routes/auth.ts#L22), [authValidator.ts:9](../backend/src/validators/authValidator.ts#L9), [middleware/auth.ts:10](../backend/src/middleware/auth.ts#L10)

- **G2**  
  Användaren förblir inloggad när sidan laddas om eftersom sessionen lagras i webbläsarens cookies. Efter omladdningen anropar frontend /auth/me. Backend verifierar cookies med Supabase och returnerar den inloggade användaren.  
  [Navigation.tsx:17](../frontend/src/components/Navigation.tsx#L17), [api.ts:66](../frontend/src/lib/api.ts#L66), [auth.ts:50](../backend/src/routes/auth.ts#L50), [middleware/auth.ts:34](../backend/src/middleware/auth.ts#L34)

- **G3**  
  Navigeringen kontrollerar om en användare är inloggad. Om så är fallet visas bokningar, boendehantering, profil och utloggning. Annars visas inloggning och registrering.  
  [Navigation.tsx:62](../frontend/src/components/Navigation.tsx#L62)

- **G4**  
  Boendelistan hämtar data från min publika backend-endpoint och visar ett kort för varje boende. När användaren klickar på ett kort öppnas en detaljsida med hjälp av boendets ID. Båda endpointsen för att läsa boendedata är tillgängliga utan inloggning.  
  [PropertyList.tsx:4](../frontend/src/components/PropertyList.tsx#L4), [PropertyCard.tsx:8](../frontend/src/components/PropertyCard.tsx#L8), [properties/[id]/page.tsx:9](../frontend/src/app/properties/%5Bid%5D/page.tsx#L9), [properties.ts:11](../backend/src/routes/properties.ts#L11)

- **G5**  
  Filterformuläret lägger in sökvärdena i URL:en. Min backend validerar dem och använder dem i databasfrågan. Plats matchas med en textsökning som inte skiljer på stora och små bokstäver, pris anger en övre gräns och antal gäster kontrollerar att boendet har tillräcklig kapacitet.  
  [PropertyFiltersForm.tsx:18](../frontend/src/components/PropertyFiltersForm.tsx#L18), [properties.ts:31](../backend/src/routes/properties.ts#L31), [propertyFilterValidator.ts:35](../backend/src/validators/propertyFilterValidator.ts#L35)

- **G6**  
  Alla API-rutter som skapar, ändrar eller tar bort boenden använder middleware för autentisering. Databasen kräver också autentisering genom RLS-policyer och kontroller i borttagningsfunktionen. Detta skyddar boenden från obehöriga ändringar även om någon kringgår frontend eller API:et.  
  [properties.ts:88](../backend/src/routes/properties.ts#L88), [middleware/auth.ts:50](../backend/src/middleware/auth.ts#L50), [001_auth_rls.sql:8](../database/001_auth_rls.sql#L8), [002_ownership.sql:34](../database/002_ownership.sql#L34), [011_permanent_property_deletion.sql:34](../database/011_permanent_property_deletion.sql#L34)

- **G7**  
  En inloggad användare kan skapa ett boende via Mina boenden. Formuläret skickar uppgifterna till backend, som validerar dem och anger den inloggade användaren som ägare. När boendet har sparats visas det i listan.  
  [my-properties/page.tsx:20](../frontend/src/app/my-properties/page.tsx#L20), [CreatePropertyForm.tsx:15](../frontend/src/components/CreatePropertyForm.tsx#L15), [properties.ts:88](../backend/src/routes/properties.ts#L88), [propertyValidator.ts:23](../backend/src/validators/propertyValidator.ts#L23)

- **G8**  
  Rullgardinsmenyn skickar den valda sorteringsordningen till min backend. Backend använder den i databasfrågan, så att resultaten returneras sorterade efter pris per natt. Boenden med samma pris sorteras efter ID för att resultatens ordning ska vara konsekvent.  
  [PropertyFiltersForm.tsx:27](../frontend/src/components/PropertyFiltersForm.tsx#L27), [properties.ts:37](../backend/src/routes/properties.ts#L37), [propertyFilterValidator.ts:35](../backend/src/validators/propertyFilterValidator.ts#L35)

- **G9**  
  Boendets detaljsida innehåller ett bokningsformulär. Besökare uppmanas att logga in, och deras ifyllda uppgifter sparas tillfälligt så att de kan fortsätta efteråt. Backend kräver också autentisering och kopplar bokningen till den verifierade användaren.  
  [properties/[id]/page.tsx:9](../frontend/src/app/properties/%5Bid%5D/page.tsx#L9), [BookingForm.tsx:105](../frontend/src/components/BookingForm.tsx#L105), [login/page.tsx:1](../frontend/src/app/login/page.tsx#L1), [bookings.ts:74](../backend/src/routes/bookings.ts#L74), [middleware/auth.ts:50](../backend/src/middleware/auth.ts#L50)

- **G10**  
  Frontend kontrollerar bokningsuppgifterna och visar tydliga meddelanden innan formuläret skickas. Backend validerar uppgifterna igen så att ogiltiga förfrågningar inte kan kringgå formulärets kontroller. Datumen måste vara giltiga, incheckning får inte ligga i det förflutna och utcheckning måste ske efter incheckning.  
  [BookingForm.tsx:136](../frontend/src/components/BookingForm.tsx#L136), [booking-validation.ts:15](../frontend/src/lib/booking-validation.ts#L15), [bookingValidator.ts:33](../backend/src/validators/bookingValidator.ts#L33), [booking-date.ts:2](../backend/src/lib/booking-date.ts#L2)

- **G11**  
  När användaren väljer datum beräknar formuläret antalet nätter och multiplicerar det med boendets pris per natt. Det visar det uppskattade totalpriset innan bokningen skickas och uppdaterar det när datumen ändras.  
  [BookingForm.tsx:97](../frontend/src/components/BookingForm.tsx#L97), [booking-validation.ts:34](../frontend/src/lib/booking-validation.ts#L34)

- **G12**  
  Boendets ägare kan öppna sin hanteringssida för att se bokningar. Separata komponenter hanterar redigering, bekräftelse, avbokning och borttagning. Varje åtgärd anropar backend, som kontrollerar behörigheten, och frontend uppdaterar sin lista när åtgärden har lyckats.  
  [my-properties/[id]/page.tsx:4](../frontend/src/app/my-properties/%5Bid%5D/page.tsx#L4), [BookingEditForm.tsx:18](../frontend/src/components/BookingEditForm.tsx#L18), [ConfirmBookingButton.tsx:14](../frontend/src/components/ConfirmBookingButton.tsx#L14), [CancelBookingButton.tsx:23](../frontend/src/components/CancelBookingButton.tsx#L23), [DeleteBookingButton.tsx:20](../frontend/src/components/DeleteBookingButton.tsx#L20), [bookings.ts:159](../backend/src/routes/bookings.ts#L159)

- **G13**  
  Boendesidorna visar laddningsmeddelanden medan data hämtas. Om en förfrågan misslyckas visas ett felmeddelande och en möjlighet att försöka igen. Om API:et returnerar 404 visar detaljsidan en särskild vy som meddelar att boendet inte hittades.  
  [PropertyList.tsx:4](../frontend/src/components/PropertyList.tsx#L4), [properties/loading.tsx:3](../frontend/src/app/properties/loading.tsx#L3), [properties/[id]/page.tsx:15](../frontend/src/app/properties/%5Bid%5D/page.tsx#L15), [properties/[id]/loading.tsx:3](../frontend/src/app/properties/%5Bid%5D/loading.tsx#L3), [properties/[id]/not-found.tsx:3](../frontend/src/app/properties/%5Bid%5D/not-found.tsx#L3)

- **G14**  
  Mitt API använder statuskoder för att skilja mellan lyckade förfrågningar, ogiltiga uppgifter, saknad inloggning, nekad behörighet, saknade poster, konflikter och serverfel. Det omvandlar också databasfel till tydliga svar som frontend kan förstå.  
  [app.ts:36](../backend/src/app.ts#L36), [auth.ts:44](../backend/src/routes/auth.ts#L44), [properties.ts:103](../backend/src/routes/properties.ts#L103), [bookings.ts:78](../backend/src/routes/bookings.ts#L78), [api.ts:23](../frontend/src/lib/api.ts#L23)

- **G15**  
  Min databas använder Row Level Security (RLS) för att styra åtkomsten till boenden och bokningar. Dessa regler körs i PostgreSQL och gäller därför även när någon kringgår min backend. Jag verifierar skyddet genom direkta anrop till databasen och Supabase.  
  [001_auth_rls.sql:8](../database/001_auth_rls.sql#L8), [002_ownership.sql:34](../database/002_ownership.sql#L34), [008_booking_access.sql:8](../database/008_booking_access.sql#L8), [ownership.sql:1](../database/tests/ownership.sql#L1), [verify-ownership-live.mjs:1](../backend/scripts/verify-ownership-live.mjs#L1)

- **G16**  
  Jag använder TypeScript-gränssnitt och typer för boenden, bokningar, API-svar och databasfrågor. De hjälper till att upptäcka felaktiga fält och värden under utvecklingen. Backend har separata validatorer som kontrollerar data som tas emot vid körning.  
  [property.ts:1](../frontend/src/types/property.ts#L1), [booking.ts:1](../frontend/src/types/booking.ts#L1), [api.ts:1](../frontend/src/types/api.ts#L1), [database.ts:5](../backend/src/types/database.ts#L5), [property.d.ts:1](../backend/src/types/property.d.ts#L1), [booking.d.ts:1](../backend/src/types/booking.d.ts#L1), [propertyValidator.ts:23](../backend/src/validators/propertyValidator.ts#L23), [bookingValidator.ts:15](../backend/src/validators/bookingValidator.ts#L15), [authValidator.ts:9](../backend/src/validators/authValidator.ts#L9), [propertyFilterValidator.ts:35](../backend/src/validators/propertyFilterValidator.ts#L35)

- **Vg1**  
  Säkerställer att användare bara kan hantera sina egna boenden och bokningar som de har behörighet till. Ägarskapet baseras på den verifierade inloggningsidentiteten, och API:et och databasen förhindrar obehörig åtkomst till andra användares data och förfalskade ändringar av ägarskap.  
  [middleware/auth.ts:34](../backend/src/middleware/auth.ts#L34), [properties.ts:123](../backend/src/routes/properties.ts#L123), [bookings.ts:22](../backend/src/routes/bookings.ts#L22), [002_ownership.sql:76](../database/002_ownership.sql#L76), [008_booking_access.sql:8](../database/008_booking_access.sql#L8), [ownership.test.ts:17](../backend/tests/ownership.test.ts#L17), [ownership.sql:1](../database/tests/ownership.sql#L1)

- **Vg2**  
  Förhindrar överlappande bokningar för samma boende, även när användare bokar samtidigt. Väntande och bekräftade bokningar blockerar datum, medan avbokade bokningar inte gör det. Vistelser där en gäst checkar ut samma dag som nästa checkar in är tillåtna, och konflikter ger ett tydligt felmeddelande.  
  [019_booking_overlap.sql:36](../database/019_booking_overlap.sql#L36), [bookings.ts:82](../backend/src/routes/bookings.ts#L82), [BookingForm.tsx:160](../frontend/src/components/BookingForm.tsx#L160), [booking-overlap.test.ts:13](../backend/tests/booking-overlap.test.ts#L13), [overlap.sql:1](../database/tests/overlap.sql#L1), [verify-overlap-live.mjs:1](../backend/scripts/verify-overlap-live.mjs#L1)

- **Vg3**  
  Säkerställer att antalet gäster i en bokning aldrig överstiger boendets aktuella gästkapacitet. Både API:et och databasen upprätthåller gränsen, så att förfalskade värden från klienten inte kan kringgå den.  
  [booking-capacity.ts:3](../backend/src/lib/booking-capacity.ts#L3), [bookings.ts:66](../backend/src/routes/bookings.ts#L66), [021_booking_capacity.sql:19](../database/021_booking_capacity.sql#L19), [booking-capacity.test.ts:14](../backend/tests/booking-capacity.test.ts#L14), [capacity.sql:1](../database/tests/capacity.sql#L1)

- **Vg4**  
  Styr bokningsstatus och behörigheter: endast boendets ägare kan bekräfta en bokning, medan gästen eller ägaren kan avboka den. API:et och databasen blockerar ogiltiga statusövergångar, redigering av avbokade bokningar och ändringar från användare som inte är kopplade till bokningen.  
  [bookings.ts:112](../backend/src/routes/bookings.ts#L112), [006_booking_status_roles.sql:4](../database/006_booking_status_roles.sql#L4), [008_booking_access.sql:18](../database/008_booking_access.sql#L18), [booking-status.test.ts:15](../backend/tests/booking-status.test.ts#L15), [status_roles.sql:1](../database/tests/status_roles.sql#L1)

- **Vg5**  
  Upprätthåller reglerna för bokningsdatum i både API:et och databasen: incheckning i det förflutna nekas, och bokningar som redan ligger i det förflutna kan inte redigeras eller avbokas. Dagens datum bestäms utifrån tidszonen Europe/Stockholm, och incheckning samma dag är tillåten.  
  [booking-date.ts:2](../backend/src/lib/booking-date.ts#L2), [bookingValidator.ts:35](../backend/src/validators/bookingValidator.ts#L35), [bookings.ts:120](../backend/src/routes/bookings.ts#L120), [022_booking_time.sql:4](../database/022_booking_time.sql#L4), [booking-time.test.ts:23](../backend/tests/booking-time.test.ts#L23), [time_rules.sql:1](../database/tests/time_rules.sql#L1)

- **Vg6**  
  För nya bokningar beräknar och sparar backend totalpriset utifrån antalet nätter och boendets aktuella pris i databasen. Priser som skickas från klienten ignoreras. Databasen säkerställer också att prissättningen bygger på betrodda uppgifter. Befintliga bokningar behåller sitt sparade pris per natt när boendets pris ändras, och vid datumändringar räknas totalpriset om med det sparade nattpriset.  
  [booking-price.ts:2](../backend/src/lib/booking-price.ts#L2), [bookings.ts:69](../backend/src/routes/bookings.ts#L69), [bookingValidator.ts:28](../backend/src/validators/bookingValidator.ts#L28), [023_booking_price.sql:32](../database/023_booking_price.sql#L32), [booking-price.test.ts:20](../backend/tests/booking-price.test.ts#L20), [price.sql:1](../database/tests/price.sql#L1)

- **Vg7**  
  Låter användare söka efter boenden som är tillgängliga under valda datum, i kombination med plats, pris, antal gäster och sortering. Sökningen utesluter boenden med överlappande bokningar, men tillåter vistelser direkt efter varandra och bortser från avbokade bokningar.  
  [PropertyFiltersForm.tsx:18](../frontend/src/components/PropertyFiltersForm.tsx#L18), [properties.ts:17](../backend/src/routes/properties.ts#L17), [propertyFilterValidator.ts:35](../backend/src/validators/propertyFilterValidator.ts#L35), [025_available_property_search.sql:23](../database/025_available_property_search.sql#L23), [available-search.test.ts:6](../backend/tests/available-search.test.ts#L6), [available_search.sql:1](../database/tests/available_search.sql#L1)

## Filtrering och sortering av boenden

Filterformuläret skickar sökvärdena som query-parametrar i URL:en när användaren klickar på Apply filters. Properties-sidan läser parametrarna och skickar dem vidare till backend via `getProperties`. Det gör att en filtrerad sökning kan bokmärkas eller delas. Clear filters återgår till `/properties` och tömmer formuläret.

Backend validerar parametrarna innan databasfrågan körs. Plats söker efter text i boendets plats utan att skilja på stora och små bokstäver. Högsta pris begränsar `price_per_night`, och antal gäster kräver att `max_guests` är minst det angivna antalet. Tomma filter behandlas som utelämnade. Om datum anges krävs både in- och utcheckning samt ett giltigt datumintervall. Då används databasfunktionen `search_available_properties`, som kombinerar filtren och utesluter boenden med överlappande pending- eller confirmed-bokningar. Utcheckning samma dag som en annan bokning börjar är tillåten.

Sorteringen använder `sort=asc` för lägsta pris först och `sort=desc` för högsta pris först. Databasen sorterar efter pris per natt och sedan efter boendets ID när priserna är lika. Samma prissortering används även vid datumsökning. Default order innebär att ingen prissortering begärs; utan datum anges ingen uttrycklig ordning, medan datumsökningen använder ID-ordning. Frontend visar resultaten i den ordning som backend returnerar dem.

[PropertyFiltersForm.tsx:18](../frontend/src/components/PropertyFiltersForm.tsx#L18), [properties/page.tsx:15](../frontend/src/app/properties/page.tsx#L15), [api.ts:30](../frontend/src/lib/api.ts#L30), [propertyFilterValidator.ts:8](../backend/src/validators/propertyFilterValidator.ts#L8), [properties.ts:11](../backend/src/routes/properties.ts#L11), [025_available_property_search.sql:23](../database/025_available_property_search.sql#L23), [PropertyList.tsx:1](../frontend/src/components/PropertyList.tsx#L1)

## Cookies och inloggning

Cookies används för att spara Supabase-sessionen i webbläsaren så att användaren kan förbli inloggad när sidan laddas om. De innehåller sessionens tokens, inte användarens lösenord. Frontend använder `credentials: "include"` vid API-anrop så att webbläsaren skickar med cookies. Backend läser dem och verifierar användaren med `supabase.auth.getUser()` innan skyddade åtgärder tillåts. Supabase kan också förnya sessionen, och backend skriver då uppdaterade cookies till svaret.

Sessionscookies har `HttpOnly`, vilket innebär att frontendens JavaScript inte kan läsa dem. I produktion används även `Secure`, så att de bara skickas över HTTPS. `SameSite=Lax` begränsar när cookies skickas vid anrop från andra webbplatser. Backend tillåter dessutom cookie-baserade webbläsaranrop från den konfigurerade frontend-adressen och kontrollerar Origin-headern vid skrivande anrop. Vid utloggning avslutas sessionen och sessionscookies rensas.

[api.ts:16](../frontend/src/lib/api.ts#L16), [middleware/auth.ts:10](../backend/src/middleware/auth.ts#L10), [middleware/auth.ts:33](../backend/src/middleware/auth.ts#L33), [app.ts:15](../backend/src/app.ts#L15), [auth.ts:103](../backend/src/routes/auth.ts#L103)

## API-rutter

`:id` ersätts med ID:t för det aktuella boendet, bokningen eller användaren. Skyddade rutter verifierar sessionen via cookies; databasen kontrollerar dessutom behörigheten med RLS och triggers.

### Grundrutt

- **GET /** – Returnerar texten `StayFinder API` som visar att API:et svarar. [app.ts:30](../backend/src/app.ts#L30)

### Inloggning och konto

- **POST /auth/register** – Validerar registreringsuppgifterna och skapar användaren med Supabase Auth. Returnerar användaren och anger om e-postbekräftelse behövs. [auth.ts:22](../backend/src/routes/auth.ts#L22)
- **POST /auth/login** – Kontrollerar e-post och lösenord med Supabase Auth. Vid lyckad inloggning sparas sessionen i cookies och användaren returneras. [auth.ts:44](../backend/src/routes/auth.ts#L44)
- **GET /auth/me** – Kräver inloggning och returnerar användaren vars identitet har verifierats från sessionen. [auth.ts:50](../backend/src/routes/auth.ts#L50)
- **PATCH /auth/profile** – Kräver inloggning, validerar namn och profiluppgifter och uppdaterar användarens profil. Kan också byta eller ta bort profilbilden. [auth.ts:52](../backend/src/routes/auth.ts#L52)
- **DELETE /auth/account** – Kräver inloggning och bekräftelse med lösenord. Tar bort kontot och dess profilbilder och rensar sessionscookies. [auth.ts:76](../backend/src/routes/auth.ts#L76)
- **POST /auth/logout** – Kräver inloggning och avslutar sessionen genom Supabase Auth. [auth.ts:103](../backend/src/routes/auth.ts#L103)

### Publika profiler

- **GET /profiles/:id** – Hämtar användarens publika namn, profilbild och beskrivning via databasfunktionen `get_public_profile`. Kräver inte inloggning och ger 404 om profilen saknas. [profiles.ts:4](../backend/src/routes/profiles.ts#L4)

### Boenden

- **GET /properties** – Hämtar publika boenden med validerade filter för plats, högsta pris, gästantal och sortering. Med både in- och utcheckningsdatum används `search_available_properties` för att bara visa lediga boenden. [properties.ts:11](../backend/src/routes/properties.ts#L11)
- **GET /properties/:id** – Hämtar ett publikt boende utifrån dess ID. Returnerar 404 om boendet saknas eller har tagits bort. [properties.ts:70](../backend/src/routes/properties.ts#L70)
- **GET /properties/:id/availability** – Hämtar boendets upptagna datumintervall via `get_property_availability`, utan att lämna ut gästers uppgifter. Kräver inte inloggning. [properties.ts:50](../backend/src/routes/properties.ts#L50)
- **GET /properties/:id/host** – Hämtar publik information om boendets värd via `get_property_host`. Kräver inte inloggning. [properties.ts:60](../backend/src/routes/properties.ts#L60)
- **POST /properties** – Kräver inloggning, validerar boendeuppgifterna och skapar ett boende med den verifierade användaren som ägare. Returnerar boendet med status 201. [properties.ts:88](../backend/src/routes/properties.ts#L88)
- **PATCH /properties/:id** – Ändrar valda fält i ett boende. Kräver inloggning och att användaren äger boendet; även databasens regler måste vara uppfyllda. [properties.ts:112](../backend/src/routes/properties.ts#L112)
- **PUT /properties/:id** – Uppdaterar ett boende med de obligatoriska boendeuppgifterna. Kräver inloggning och ägarskap och använder samma databasregler som PATCH. [properties.ts:137](../backend/src/routes/properties.ts#L137)
- **DELETE /properties/:id** – Kräver inloggning och anropar `delete_property`, som kontrollerar ägarskapet, avbokar kommande aktiva bokningar och tar bort boendet. Returnerar även antalet avbokade bokningar. [properties.ts:160](../backend/src/routes/properties.ts#L160)

### Bokningar

Alla bokningsrutter kräver inloggning.

- **GET /bookings** – Hämtar den inloggade gästens bokningar. Med `?property_id=...` hämtas i stället bokningarna för ett boende, vilket kräver att användaren äger boendet. [bookings.ts:12](../backend/src/routes/bookings.ts#L12)
- **GET /bookings/:id** – Hämtar en bokning utifrån dess ID. RLS gör den tillgänglig för gästen eller boendets ägare; en dold eller saknad bokning ger 404. [bookings.ts:40](../backend/src/routes/bookings.ts#L40)
- **POST /bookings** – Validerar bokningen, kontrollerar kapaciteten och beräknar priset från boendets databaspris. Kopplar bokningen till användaren med status pending; databasen stoppar bland annat överlapp. [bookings.ts:59](../backend/src/routes/bookings.ts#L59)
- **PUT /bookings/:id** – Låter gästen eller boendets ägare ändra en bokning inom datum-, kapacitets- och statusreglerna. Bekräftelse kräver ägaren; avbokade bokningar kan inte redigeras. Totalpriset räknas om med det sparade nattpriset. [bookings.ts:96](../backend/src/routes/bookings.ts#L96)
- **POST /bookings/:id/confirm** – Låter endast boendets ägare ändra pending till confirmed. Incheckning måste vara idag eller senare, och skrivningen kontrollerar status igen för att upptäcka samtidiga ändringar. [bookings.ts:159](../backend/src/routes/bookings.ts#L159)
- **POST /bookings/:id/cancel** – Låter gästen eller boendets ägare avboka en pending- eller confirmed-bokning med incheckning idag eller senare. Status och datum kontrolleras igen vid skrivningen. [bookings.ts:190](../backend/src/routes/bookings.ts#L190)
- **DELETE /bookings/:id** – Låter gästen eller ägaren ta bort en aktiv bokning med incheckning idag eller senare. Avbokade bokningar får endast tas bort av boendets ägare. [bookings.ts:238](../backend/src/routes/bookings.ts#L238)

## Middleware

Middleware körs före själva rutten och kan förbereda förfrågan eller stoppa den. `await next()` låter nästa middleware eller rutten fortsätta.

- **Supabase-klienten** – `createSupabaseForRequest` läser sessionscookies och skapar en klient för användarens databasanrop. Den skriver även uppdaterade sessionscookies till svaret. [auth.ts:10](../backend/src/middleware/auth.ts#L10)
- **Verifierad identitet** – `setSupabaseContext` anropar `supabase.auth.getUser()` och sparar klienten och den verifierade användaren i förfrågans kontext. Rutterna hämtar dem med `c.get("supabase")` och `c.get("user")`. [auth.ts:34](../backend/src/middleware/auth.ts#L34)
- **optionalAuth** – Förbereder Supabase och kontrollerar sessionen för alla rutter, men tillåter även besökare utan inloggning. Sätter `Cache-Control: private, no-store` så att svaret inte cachelagras. [auth.ts:44](../backend/src/middleware/auth.ts#L44)
- **requireAuth** – Stoppar förfrågan med 401 om ingen verifierad användare finns. Ägarskap och andra behörigheter kontrolleras sedan av rutten och databasen. [auth.ts:50](../backend/src/middleware/auth.ts#L50)
- **CORS** – Tillåter webbläsaranrop från den konfigurerade frontend-adressen och gör det möjligt att skicka sessionscookies. Hanterar också tillåtna metoder och headers. [app.ts:15](../backend/src/app.ts#L15)
- **Origin-kontroll** – Stoppar skrivande anrop med 403 om de innehåller en Origin-header som skiljer sig från frontend-adressen. Anrop utan denna header omfattas inte av kontrollen. [app.ts:21](../backend/src/app.ts#L21)
- **prettyJSON** – Formaterar JSON-svar för enklare läsning när anropet använder `?pretty`. [app.ts:14](../backend/src/app.ts#L14)
- **photoBodyLimit** – Begränsar hela request-body till 8 MB för registrering och profiluppdatering. För stora anrop stoppas med 413 innan bildhanteringen fortsätter. [auth.ts:14](../backend/src/routes/auth.ts#L14)

## Validatorer

Validatorerna är middleware som kontrollerar inkommande data med Zod innan rutten använder den. `zValidator("json", ...)` kontrollerar JSON-kroppen och `zValidator("query", ...)` kontrollerar URL-parametrarna. Rutten hämtar resultatet med `c.req.valid("json")` eller `c.req.valid("query")`. Ogiltiga uppgifter ger 400.

- **authValidator** – Kräver en giltig e-postadress och ett lösenord med minst sex tecken vid inloggning. Samma grundschema används även vid registrering. [authValidator.ts:4](../backend/src/validators/authValidator.ts#L4)
- **propertyValidator** – Kontrollerar obligatoriska boendeuppgifter: titel, beskrivning, plats, pris på minst 100 och ett positivt heltal för gästkapaciteten. En eventuell bildadress måste använda HTTPS. Extra fält som `owner_id` avvisas med `strict()`. Används vid POST och PUT. [propertyValidator.ts:4](../backend/src/validators/propertyValidator.ts#L4)
- **partialPropertyValidator** – Använder samma boenderegler, men gör fälten valfria med `partial()`. PATCH kan därför ändra endast de fält som skickas. Extra fält avvisas även här. [propertyValidator.ts:21](../backend/src/validators/propertyValidator.ts#L21)
- **bookingValidator** – Kontrollerar boende-ID, gästens namn och e-post, riktiga kalenderdatum och ett positivt heltal för gästantalet. Incheckning får inte ligga före dagens datum i Stockholm och utcheckning måste ske efter incheckning. Extra fält som `guest_id` avvisas; klientens prisfält tas bort. Kapacitet, överlapp, ägarskap och tillåtna statusbyten kontrolleras vidare i rutten och databasen. [bookingValidator.ts:15](../backend/src/validators/bookingValidator.ts#L15)
- **propertyFilterValidator** – Kontrollerar plats, högsta pris, gästantal och sorteringsläge. Om datum används krävs både in- och utcheckning och ett giltigt intervall från idag eller senare. Tomma filter behandlas som utelämnade, och numeriska filter omvandlas från text till tal. [propertyFilterValidator.ts:8](../backend/src/validators/propertyFilterValidator.ts#L8)
- **Registreringsvalidatorn** – Utökar inloggningsschemat med valfritt namn, beskrivning och profilbild. Namn begränsas till 100 tecken och beskrivning till 1000; okända fält avvisas. [auth.ts:16](../backend/src/routes/auth.ts#L16)
- **Profilvalidatorn** – Kräver ett giltigt namn och kontrollerar valfri beskrivning och bild. Förhindrar att samma anrop både skickar en ny bild och begär borttagning av bilden. [auth.ts:53](../backend/src/routes/auth.ts#L53)
- **Kontoborttagningens validator** – Kräver ett lösenord med 1–1024 tecken. Rutten verifierar därefter lösenordet med Supabase innan kontot tas bort. [auth.ts:77](../backend/src/routes/auth.ts#L77)
